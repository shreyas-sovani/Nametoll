import type { MarketRow, MerchandiseSnapshot, ProtocolResult } from "./index.ts";

export const RISK_SKU = "risk-score" as const;
export const RISK_PATH = "/desk/risk";
export const RISK_METHODOLOGY =
  "Desk-side health factor from Messari market maximumLTV and liquidationThreshold on the pinned Aave v3 and Compound III subgraphs. The wallet selects live Account positions when the indexer has them; otherwise a deterministic demo book is sized from current market TVL ratios. The TEE gates spend only — it does not see the wallet. This SKU sells computation, freshness, and a recomputable HCS receipt. Positions on a public chain are not private.";

export type RiskMarket = {
  id: string;
  name: string;
  protocol: string;
  maximumLTV: string;
  liquidationThreshold: string;
  totalValueLockedUSD: string;
};

export type RiskPosition = {
  marketId: string;
  marketName: string;
  protocol: string;
  side: "COLLATERAL" | "BORROWER";
  balanceUsd: string;
  liquidationThreshold: string;
};

export type RiskScore = {
  sku: typeof RISK_SKU;
  wallet: string;
  source: "positions" | "demo-portfolio";
  score: number;
  healthFactor: string;
  distanceToLiquidationPct: string;
  worstMarket?: { id: string; name: string; protocol: string };
  factors: {
    collateralUsd: string;
    borrowUsd: string;
    markets: number;
  };
  methodology: string;
  units: 1;
  ok: boolean;
  stub?: true;
};

/** Messari Account + Position + PositionSnapshot (schema-lending.graphql). Wallet is interpolated after parseWallet. */
export function accountPositionsQuery(wallet: string): string {
  const id = parseWallet(wallet);
  if (!id) throw new Error("wallet query must be a 0x address.");
  return `{
  account(id: "${id}") {
    id
    openPositionCount
    positions(first: 16, where: { hashClosed: null }) {
      id
      side
      market {
        id
        name
        maximumLTV
        liquidationThreshold
        totalValueLockedUSD
        inputToken { symbol }
      }
      snapshots(first: 1, orderBy: timestamp, orderDirection: desc) {
        balanceUSD
      }
    }
  }
}`;
}

export function parseWallet(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return undefined;
  return `0x${trimmed.slice(2).toLowerCase()}`;
}

export function walletSeed(wallet: string): number {
  let n = 0;
  const hex = wallet.slice(2);
  for (let i = 0; i < hex.length; i += 1) {
    n = (Math.imul(n, 16) + Number.parseInt(hex[i] ?? "0", 16)) >>> 0;
  }
  return n;
}

export function marketsFromSnapshot(snapshot: MerchandiseSnapshot): RiskMarket[] {
  const rows: RiskMarket[] = [];
  for (const protocol of snapshot.protocols) {
    if (!protocol.ok || !protocol.markets) continue;
    for (const market of protocol.markets) {
      rows.push(riskMarketFromRow(protocol, market));
    }
  }
  return rows;
}

function riskMarketFromRow(protocol: ProtocolResult, market: MarketRow): RiskMarket {
  return {
    id: market.id,
    name: market.name ?? market.inputToken.symbol,
    protocol: protocol.label || protocol.id,
    maximumLTV: market.maximumLTV,
    liquidationThreshold: market.liquidationThreshold,
    totalValueLockedUSD: market.totalValueLockedUSD,
  };
}

export function demoPortfolio(wallet: string, markets: RiskMarket[]): RiskPosition[] {
  const live = markets.filter(
    (market) =>
      Number.parseFloat(market.liquidationThreshold) > 0 &&
      Number.parseFloat(market.totalValueLockedUSD) > 0,
  );
  if (!live.length) return [];
  const seed = walletSeed(wallet);
  const totalTvl = live.reduce(
    (sum, market) => sum + Number.parseFloat(market.totalValueLockedUSD),
    0,
  );
  const targetHf = 0.9 + (seed % 160) / 100;
  const weightedLiq = live.reduce((sum, market) => {
    const weight = Number.parseFloat(market.totalValueLockedUSD) / totalTvl;
    return sum + weight * (Number.parseFloat(market.liquidationThreshold) / 100);
  }, 0);
  const collateralUsd = 10_000;
  const borrowUsd = weightedLiq > 0 ? (collateralUsd * weightedLiq) / targetHf : 0;
  return live.flatMap((market) => {
    const weight = Number.parseFloat(market.totalValueLockedUSD) / totalTvl;
    return [
      {
        marketId: market.id,
        marketName: market.name,
        protocol: market.protocol,
        side: "COLLATERAL" as const,
        balanceUsd: (collateralUsd * weight).toFixed(6),
        liquidationThreshold: market.liquidationThreshold,
      },
      {
        marketId: market.id,
        marketName: market.name,
        protocol: market.protocol,
        side: "BORROWER" as const,
        balanceUsd: (borrowUsd * weight).toFixed(6),
        liquidationThreshold: market.liquidationThreshold,
      },
    ];
  });
}

export function scorePositions(positions: RiskPosition[]): {
  healthFactor: string;
  distanceToLiquidationPct: string;
  score: number;
  worstMarket?: { id: string; name: string; protocol: string };
  collateralUsd: string;
  borrowUsd: string;
} {
  let collateralAdj = 0;
  let borrow = 0;
  const byMarket = new Map<
    string,
    { name: string; protocol: string; col: number; bor: number; lt: number }
  >();
  for (const position of positions) {
    const usd = Number.parseFloat(position.balanceUsd);
    const lt = Number.parseFloat(position.liquidationThreshold) / 100;
    const row = byMarket.get(position.marketId) ?? {
      name: position.marketName,
      protocol: position.protocol,
      col: 0,
      bor: 0,
      lt,
    };
    if (position.side === "COLLATERAL") {
      collateralAdj += usd * lt;
      row.col += usd;
    } else {
      borrow += usd;
      row.bor += usd;
    }
    byMarket.set(position.marketId, row);
  }
  const hf = borrow <= 0 ? Number.POSITIVE_INFINITY : collateralAdj / borrow;
  const distance = !Number.isFinite(hf) ? 100 : Math.max(0, ((hf - 1) / hf) * 100);
  const score = Math.max(0, Math.min(100, Math.round(distance)));
  let worst: { id: string; name: string; protocol: string; hf: number } | undefined;
  for (const [id, row] of byMarket) {
    if (row.bor <= 0) continue;
    const marketHf = (row.col * row.lt) / row.bor;
    if (!worst || marketHf < worst.hf) {
      worst = { id, name: row.name, protocol: row.protocol, hf: marketHf };
    }
  }
  return {
    healthFactor: Number.isFinite(hf) ? hf.toFixed(4) : "inf",
    distanceToLiquidationPct: distance.toFixed(2),
    score,
    collateralUsd: (collateralAdj > 0 || borrow > 0
      ? positions
          .filter((row) => row.side === "COLLATERAL")
          .reduce((sum, row) => sum + Number.parseFloat(row.balanceUsd), 0)
      : 0
    ).toFixed(2),
    borrowUsd: borrow.toFixed(2),
    ...(worst
      ? { worstMarket: { id: worst.id, name: worst.name, protocol: worst.protocol } }
      : {}),
  };
}

export function scoreRisk(input: {
  wallet: string;
  markets: RiskMarket[];
  positions?: RiskPosition[];
  stub?: boolean;
}): RiskScore {
  const live = input.positions?.filter((row) => Number.parseFloat(row.balanceUsd) > 0) ?? [];
  const source = live.length ? "positions" : "demo-portfolio";
  const book = live.length ? live : demoPortfolio(input.wallet, input.markets);
  const scored = scorePositions(book);
  return {
    sku: RISK_SKU,
    wallet: input.wallet,
    source,
    score: scored.score,
    healthFactor: scored.healthFactor,
    distanceToLiquidationPct: scored.distanceToLiquidationPct,
    factors: {
      collateralUsd: scored.collateralUsd,
      borrowUsd: scored.borrowUsd,
      markets: input.markets.length,
    },
    methodology: RISK_METHODOLOGY,
    units: 1,
    ok: Boolean(input.stub) || book.length > 0,
    ...(scored.worstMarket ? { worstMarket: scored.worstMarket } : {}),
    ...(input.stub ? { stub: true as const } : {}),
  };
}

export function positionsFromAccountData(
  data: unknown,
  protocol: string,
): RiskPosition[] {
  if (!data || typeof data !== "object") return [];
  const account = (data as { account?: unknown }).account;
  if (!account || typeof account !== "object") return [];
  const positions = (account as { positions?: unknown }).positions;
  if (!Array.isArray(positions)) return [];
  const rows: RiskPosition[] = [];
  for (const raw of positions) {
    if (!raw || typeof raw !== "object") continue;
    const row = raw as Record<string, unknown>;
    const side = row.side === "BORROWER" ? "BORROWER" : row.side === "COLLATERAL" ? "COLLATERAL" : undefined;
    const market = row.market && typeof row.market === "object" ? (row.market as Record<string, unknown>) : undefined;
    const snaps = Array.isArray(row.snapshots) ? row.snapshots : [];
    const last = snaps[0] && typeof snaps[0] === "object" ? (snaps[0] as Record<string, unknown>) : undefined;
    const balanceUsd = typeof last?.balanceUSD === "string" ? last.balanceUSD : undefined;
    if (!side || !market || !balanceUsd || typeof market.id !== "string") continue;
    const token =
      market.inputToken && typeof market.inputToken === "object"
        ? (market.inputToken as { symbol?: string }).symbol
        : undefined;
    rows.push({
      marketId: market.id,
      marketName: typeof market.name === "string" ? market.name : (token ?? market.id),
      protocol,
      side,
      balanceUsd,
      liquidationThreshold:
        typeof market.liquidationThreshold === "string" ? market.liquidationThreshold : "0",
    });
  }
  return rows;
}
