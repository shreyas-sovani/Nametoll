import { PINNED_PROTOCOLS, pinnedProtocol } from "./deployments.ts";
import { requestedUnits } from "../gate/meter.ts";
import {
  accountPositionsQuery,
  marketsFromSnapshot,
  parseWallet,
  positionsFromAccountData,
  scoreRisk,
  type RiskScore,
} from "./risk.ts";

/** Fields taken from Messari schema-lending.graphql v3.1.0 (docs/partners/graph/). */
export const LENDING_RISK_QUERY = `{
  lendingProtocols {
    id
    name
    slug
    network
    schemaVersion
    totalValueLockedUSD
    totalDepositBalanceUSD
    totalBorrowBalanceUSD
  }
  markets(first: 8, orderBy: totalValueLockedUSD, orderDirection: desc) {
    id
    name
    isActive
    maximumLTV
    liquidationThreshold
    totalValueLockedUSD
    totalDepositBalanceUSD
    totalBorrowBalanceUSD
    inputToken {
      id
      symbol
    }
  }
}`;

export type GraphFetcher = (
  subgraphId: string,
  query: string,
) => Promise<unknown>;

export type LendingProtocolRow = {
  id: string;
  name: string;
  slug: string;
  network: string;
  schemaVersion: string;
  totalValueLockedUSD: string;
  totalDepositBalanceUSD: string;
  totalBorrowBalanceUSD: string;
};

export type MarketRow = {
  id: string;
  name: string | null;
  isActive: boolean;
  maximumLTV: string;
  liquidationThreshold: string;
  totalValueLockedUSD: string;
  totalDepositBalanceUSD: string;
  totalBorrowBalanceUSD: string;
  inputToken: { id: string; symbol: string };
};

export type ProtocolResult = {
  id: string;
  label: string;
  subgraphId?: string;
  ok: boolean;
  error?: string;
  lendingProtocols?: LendingProtocolRow[];
  markets?: MarketRow[];
};

export type MerchandiseSnapshot = {
  ok: boolean;
  stub?: true;
  units: number;
  protocols: ProtocolResult[];
};

export type Merchandise = {
  snapshot(protocolIds?: string[]): Promise<MerchandiseSnapshot>;
  risk?(wallet: string): Promise<RiskScore>;
};

export type MerchandiseOptions = {
  gatewayUrl?: string;
  gatewayKey?: string;
  fetchGraph?: GraphFetcher;
};

const DEFAULT_GATEWAY = "https://gateway.thegraph.com/api";

export function gatewayErrorsRejected(
  errors?: Array<{ message?: string }>,
): boolean {
  return Boolean(
    errors?.some((error) =>
      /auth error|api key not found|unauthorized/i.test(error.message ?? ""),
    ),
  );
}

export async function checkGatewayKey(
  gatewayUrl: string,
  gatewayKey: string,
): Promise<boolean> {
  const subgraphId = PINNED_PROTOCOLS[0]?.subgraphId;
  if (!subgraphId) return false;
  try {
    const res = await fetch(
      `${gatewayUrl.replace(/\/+$/, "")}/subgraphs/id/${subgraphId}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${gatewayKey}`,
        },
        body: JSON.stringify({ query: "{ __typename }" }),
      },
    );
    const body = (await res.json()) as { errors?: Array<{ message?: string }> };
    return !gatewayErrorsRejected(body.errors);
  } catch {
    return false;
  }
}

export function createGatewayFetcher(
  gatewayUrl: string,
  gatewayKey: string,
): GraphFetcher {
  return async (subgraphId, query) => {
    const url = `${gatewayUrl.replace(/\/+$/, "")}/subgraphs/id/${subgraphId}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${gatewayKey}`,
      },
      body: JSON.stringify({ query }),
    });
    const body = (await res.json()) as {
      data?: unknown;
      errors?: Array<{ message?: string }>;
    };
    if (!res.ok) {
      throw new Error(`Graph gateway ${res.status}`);
    }
    if (body.errors?.length) {
      throw new Error(body.errors.map((err) => err.message ?? "graphql").join("; "));
    }
    return body.data;
  };
}

export function createMerchandise(options: MerchandiseOptions = {}): Merchandise {
  const gatewayUrl = options.gatewayUrl ?? DEFAULT_GATEWAY;
  const fetchGraph =
    options.fetchGraph ??
    (options.gatewayKey
      ? createGatewayFetcher(gatewayUrl, options.gatewayKey)
      : undefined);

  const merchandise: Merchandise = {
    async snapshot(protocolIds) {
      if (!fetchGraph) {
        return {
          ok: true,
          stub: true,
          units: requestedUnits(protocolIds),
          protocols: [],
        };
      }

      const requested = protocolIds?.length
        ? protocolIds
        : PINNED_PROTOCOLS.map((protocol) => protocol.id);

      const protocols: ProtocolResult[] = await Promise.all(
        requested.map(async (id) => {
          const pin = pinnedProtocol(id);
          if (!pin) {
            return { id, label: id, ok: false, error: "Protocol id is not pinned" };
          }
          try {
            const data = await fetchGraph(pin.subgraphId, LENDING_RISK_QUERY);
            const parsed = parseLendingData(data);
            if (!parsed) {
              return {
                id: pin.id,
                label: pin.label,
                subgraphId: pin.subgraphId,
                ok: false,
                error: "Unexpected GraphQL shape",
              };
            }
            return {
              id: pin.id,
              label: pin.label,
              subgraphId: pin.subgraphId,
              ok: true,
              ...parsed,
            };
          } catch (error) {
            return {
              id: pin.id,
              label: pin.label,
              subgraphId: pin.subgraphId,
              ok: false,
              error: error instanceof Error ? error.message : "query failed",
            };
          }
        }),
      );

      const fulfilled = protocols.filter((protocol) => protocol.ok).length;
      return {
        ok: fulfilled > 0,
        units: requestedUnits(requested),
        protocols,
      };
    },
    async risk(wallet) {
      const parsed = parseWallet(wallet);
      if (!parsed) {
        throw new Error("wallet query must be a 0x address.");
      }
      const snapshot = await merchandise.snapshot();
      if (!fetchGraph || snapshot.stub) {
        return scoreRisk({
          wallet: parsed,
          markets: [],
          stub: true,
        });
      }
      const markets = marketsFromSnapshot(snapshot);
      const positions = (
        await Promise.all(
          snapshot.protocols
            .filter((protocol) => protocol.ok && protocol.subgraphId)
            .map(async (protocol) => {
              try {
                const data = await fetchGraph(
                  protocol.subgraphId!,
                  accountPositionsQuery(parsed),
                );
                return positionsFromAccountData(data, protocol.label || protocol.id);
              } catch {
                return [];
              }
            }),
        )
      ).flat();
      return scoreRisk({ wallet: parsed, markets, positions });
    },
  };
  return merchandise;
}

function parseLendingData(
  data: unknown,
): { lendingProtocols: LendingProtocolRow[]; markets: MarketRow[] } | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as Record<string, unknown>;
  if (!Array.isArray(record.lendingProtocols) || !Array.isArray(record.markets)) {
    return undefined;
  }
  return {
    lendingProtocols: record.lendingProtocols.filter(isLendingProtocolRow),
    markets: record.markets.filter(isMarketRow),
  };
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function isLendingProtocolRow(value: unknown): value is LendingProtocolRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const id = asString(row.id);
  const name = asString(row.name);
  const slug = asString(row.slug);
  const network = asString(row.network);
  const schemaVersion = asString(row.schemaVersion);
  const tvl = asString(row.totalValueLockedUSD);
  const deposits = asString(row.totalDepositBalanceUSD);
  const borrows = asString(row.totalBorrowBalanceUSD);
  if (!id || !name || !slug || !network || !schemaVersion || !tvl || !deposits || !borrows) {
    return false;
  }
  row.id = id;
  row.name = name;
  row.slug = slug;
  row.network = network;
  row.schemaVersion = schemaVersion;
  row.totalValueLockedUSD = tvl;
  row.totalDepositBalanceUSD = deposits;
  row.totalBorrowBalanceUSD = borrows;
  return true;
}

function isMarketRow(value: unknown): value is MarketRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const token = row.inputToken;
  const id = asString(row.id);
  const tvl = asString(row.totalValueLockedUSD);
  const deposits = asString(row.totalDepositBalanceUSD);
  const borrows = asString(row.totalBorrowBalanceUSD);
  const ltv = asString(row.maximumLTV);
  const liq = asString(row.liquidationThreshold);
  if (
    !id ||
    typeof row.isActive !== "boolean" ||
    !ltv ||
    !liq ||
    !tvl ||
    !deposits ||
    !borrows ||
    !token ||
    typeof token !== "object"
  ) {
    return false;
  }
  const input = token as Record<string, unknown>;
  const tokenId = asString(input.id);
  const symbol = asString(input.symbol);
  if (!tokenId || !symbol) return false;
  if (row.name !== null && row.name !== undefined && typeof row.name !== "string") {
    return false;
  }
  row.id = id;
  row.maximumLTV = ltv;
  row.liquidationThreshold = liq;
  row.totalValueLockedUSD = tvl;
  row.totalDepositBalanceUSD = deposits;
  row.totalBorrowBalanceUSD = borrows;
  row.inputToken = { id: tokenId, symbol };
  return true;
}
