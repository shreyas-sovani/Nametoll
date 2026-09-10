import type { Express } from "express";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { paymentMiddleware } from "@x402/express";
import { ExactHederaScheme } from "@x402/hedera/exact/server";
import { HBAR_ASSET_ID } from "@x402/hedera";
import type { AppConfig } from "../../config.ts";
import { newRequestId, type Ledger } from "../ledger/index.ts";
import {
  createMerchandise,
  type Merchandise,
  type MerchandiseSnapshot,
} from "../merchandise/index.ts";
import { meterTinybars, protocolIdsFromQuery, requestedUnits } from "./meter.ts";

export const SNAPSHOT_PATH = "/desk/snapshot";
export const STUB_DESK_NAME = "stub";
export const STUB_UNITS = 2;

export type Gate = {
  resourcePath: string;
};

export function createGate(_config: AppConfig): Gate {
  return { resourcePath: SNAPSHOT_PATH };
}

export function mountGate(
  app: Express,
  config: AppConfig,
  ledger?: Ledger,
  merchandise: Merchandise = createMerchandise(),
): void {
  if (!config.sellerAccountId) {
    return;
  }

  const facilitator = new HTTPFacilitatorClient({ url: config.facilitatorUrl });
  const resourceServer = new x402ResourceServer(facilitator).register(
    config.network,
    new ExactHederaScheme(),
  );

  if (ledger) {
    resourceServer.onAfterSettle(async (context) => {
      if (context.phase !== "after-handler") return;
      if (!context.result.success || !context.result.transaction) return;
      try {
        const snap = readSnapshot(context.transportContext);
        await ledger.append({
          requestId: newRequestId(),
          name: snap && !snap.stub ? "lending-risk" : STUB_DESK_NAME,
          units:
            snap?.units ??
            unitsFromAmount(context.requirements.amount, config.priceTinybars),
          tinybars: context.requirements.amount,
          settleTx: context.result.transaction,
        });
      } catch (error) {
        console.error("HCS bill append failed after settle", error);
      }
    });
  }

  app.use(
    paymentMiddleware(
      {
        [`GET ${SNAPSHOT_PATH}`]: {
          accepts: {
            scheme: "exact",
            price: (context) => {
              const units = requestedUnits(
                protocolIdsFromQuery(context.adapter.getQueryParam?.("protocols")),
              );
              return {
                asset: HBAR_ASSET_ID,
                amount: meterTinybars(config.priceTinybars, units),
              };
            },
            network: config.network,
            payTo: config.sellerAccountId,
          },
          description: "Nametoll Messari lending snapshot (Aave v3 + Compound v3)",
          mimeType: "application/json",
        },
      },
      resourceServer,
    ),
  );

  app.get(SNAPSHOT_PATH, async (req, res) => {
    const requested = protocolIdsFromQuery(req.query.protocols);
    const snap = await merchandise.snapshot(requested);
    res.json(snap);
  });
}

function readSnapshot(transportContext: unknown): MerchandiseSnapshot | undefined {
  if (!transportContext || typeof transportContext !== "object") return undefined;
  const body = (transportContext as { responseBody?: unknown }).responseBody;
  if (!body) return undefined;
  try {
    const text = Buffer.isBuffer(body)
      ? body.toString("utf8")
      : typeof body === "string"
        ? body
        : undefined;
    if (!text) return undefined;
    return JSON.parse(text) as MerchandiseSnapshot;
  } catch {
    return undefined;
  }
}

function unitsFromAmount(amount: string, unitPrice: string): number {
  const price = BigInt(unitPrice);
  if (price === 0n) return STUB_UNITS;
  return Number(BigInt(amount) / price);
}
