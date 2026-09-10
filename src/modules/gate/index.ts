import type { Express } from "express";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { paymentMiddleware } from "@x402/express";
import { ExactHederaScheme } from "@x402/hedera/exact/server";
import { HBAR_ASSET_ID } from "@x402/hedera";
import type { AppConfig } from "../../config.ts";
import { newRequestId, type Ledger } from "../ledger/index.ts";

export const SNAPSHOT_PATH = "/desk/snapshot";
export const STUB_DESK_NAME = "stub";
export const STUB_UNITS = 1;

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
        await ledger.append({
          requestId: newRequestId(),
          name: STUB_DESK_NAME,
          units: STUB_UNITS,
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
            price: { asset: HBAR_ASSET_ID, amount: config.priceTinybars },
            network: config.network,
            payTo: config.sellerAccountId,
          },
          description: "Nametoll snapshot (stub merchandise until B5)",
          mimeType: "application/json",
        },
      },
      resourceServer,
    ),
  );

  app.get(SNAPSHOT_PATH, (_req, res) => {
    res.json({ ok: true, stub: true });
  });
}
