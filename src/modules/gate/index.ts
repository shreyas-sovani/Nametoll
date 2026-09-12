import { AsyncLocalStorage } from "node:async_hooks";
import type { Express, NextFunction, Request, Response } from "express";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { paymentMiddleware } from "@x402/express";
import { ExactHederaScheme } from "@x402/hedera/exact/server";
import { HBAR_ASSET_ID } from "@x402/hedera";
import type { AppConfig } from "../../config.ts";
import type { BrainVerdict } from "../../types.ts";
import { createBrain, type Brain, verdictAudit } from "../brain/index.ts";
import type { PayWindow } from "../brain/pay-window.ts";
import { decodePaymentSignatureHeader } from "@x402/core/http";
import { newRequestId, type Ledger } from "../ledger/index.ts";
import type { RefundRail } from "../ledger/refund.ts";
import {
  createMerchandise,
  type Merchandise,
  type MerchandiseSnapshot,
} from "../merchandise/index.ts";
import { parseWallet, RISK_PATH, RISK_SKU, type RiskScore } from "../merchandise/risk.ts";
import { meterTinybars, protocolIdsFromQuery, requestedUnits } from "./meter.ts";
import { burnedUnits, settlementFromUsage } from "./remainder.ts";

export const SNAPSHOT_PATH = "/desk/snapshot";
export { RISK_PATH, RISK_SKU };
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
  brain: Brain = createBrain(),
  refund?: RefundRail,
  payWindow?: PayWindow,
): void {
  if (!config.sellerAccountId) {
    return;
  }

  const facilitator = new HTTPFacilitatorClient({ url: config.facilitatorUrl });
  const resourceServer = new x402ResourceServer(facilitator).register(
    config.network,
    new ExactHederaScheme(),
  );

  const verdictStore = new AsyncLocalStorage<{
    requestedTinybars: string;
    verdict: BrainVerdict;
  }>();

  const refuseIfDenied = async (
    requestedTinybars: string,
    payer?: string,
  ): Promise<BrainVerdict> => {
    const cached = verdictStore.getStore();
    if (cached && cached.requestedTinybars === requestedTinybars) {
      return cached.verdict;
    }
    try {
      const verdict = await brain.decide({
        requestedTinybars,
        ...(payer ? { payer } : {}),
        ...(payWindow ? { paysThisHour: String(payWindow.count()) } : {}),
      });
      if (!verdict.allow || BigInt(requestedTinybars) > BigInt(verdict.maxTinybars)) {
        return verdict.allow
          ? {
              allow: false,
              maxTinybars: verdict.maxTinybars,
              reason: "requested amount exceeds maxTinybars",
            }
          : verdict;
      }
      return verdict;
    } catch {
      return { allow: false, maxTinybars: "0", reason: "TEE unavailable" };
    }
  };

  const refusePaidGet = (unitsFor: (req: { query: Request["query"] }) => number) =>
    async (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET") {
        next();
        return;
      }
      const signature = req.header("payment-signature");
      if (!signature) {
        next();
        return;
      }
      const requested = meterTinybars(config.priceTinybars, unitsFor(req));
      const verdict = await refuseIfDenied(requested, payerFromSignature(signature));
      if (!verdict.allow) {
        res.status(403).json({ ok: false, ...verdict });
        return;
      }
      verdictStore.run({ requestedTinybars: requested, verdict }, () => next());
    };

  // Exact settle is after-handler. Ask the TEE before verify/settle so deny
  // never returns merchandise bytes or a Blocky402 transfer.
  app.use(
    SNAPSHOT_PATH,
    refusePaidGet((req) => requestedUnits(protocolIdsFromQuery(req.query.protocols))),
  );
  app.use(RISK_PATH, (req, res, next) => {
    if (req.method === "GET" && !parseWallet(req.query.wallet)) {
      res.status(400).json({ ok: false, error: "wallet query must be a 0x address." });
      return;
    }
    next();
  });
  app.use(RISK_PATH, refusePaidGet(() => 1));

  resourceServer.onBeforeVerify(async (context) => {
    const requested = String(context.requirements.amount);
    const verdict = await refuseIfDenied(requested, payerFromHook(context));
    if (!verdict.allow) {
      return { abort: true, reason: verdict.reason };
    }
    return undefined;
  });

  resourceServer.onBeforeSettle(async (context) => {
    const requested = String(context.requirements.amount);
    const verdict = await refuseIfDenied(requested, payerFromHook(context));
    if (!verdict.allow) {
      return { abort: true, reason: verdict.reason };
    }
    return undefined;
  });

  if (ledger) {
    resourceServer.onAfterSettle(async (context) => {
      if (context.phase !== "after-handler") return;
      if (!context.result.success || !context.result.transaction) return;
      try {
        const body = readSettledBody(context.transportContext);
        const billed = billedUsage(body, config.priceTinybars, String(
          context.result.amount ?? context.requirements.amount,
        ));
        const prepaidTinybars = billed.prepaidTinybars;
        const burned = billed.burned;
        const settlement = settlementFromUsage({
          prepaidTinybars,
          burnedUnits: burned,
          priceTinybars: config.priceTinybars,
        });
        let refundTx: string | undefined;
        if (BigInt(settlement.refundTinybars) > 0n) {
          const payer = context.result.payer;
          if (refund && payer) {
            try {
              const sent = await refund.refund({
                payer,
                tinybars: settlement.refundTinybars,
              });
              refundTx = sent.refundTx;
            } catch (error) {
              console.error("Unused-remainder refund failed after settle", error);
            }
          }
        }
        const verdict = await refuseIfDenied(
          prepaidTinybars,
          typeof context.result.payer === "string" ? context.result.payer : undefined,
        );
        const audit = verdictAudit(verdict);
        payWindow?.record();
        await ledger.append({
          requestId: newRequestId(),
          name: billed.name,
          units: settlement.burnedUnits,
          tinybars: settlement.owedTinybars,
          settleTx: context.result.transaction,
          prepaidTinybars: settlement.prepaidTinybars,
          refundTinybars: settlement.refundTinybars,
          ...(billed.sku ? { sku: billed.sku } : {}),
          ...(refundTx ? { refundTx } : {}),
          ...(audit ?? {}),
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
        [`GET ${RISK_PATH}`]: {
          accepts: {
            scheme: "exact",
            price: () => ({
              asset: HBAR_ASSET_ID,
              amount: meterTinybars(config.priceTinybars, 1),
            }),
            network: config.network,
            payTo: config.sellerAccountId,
          },
          description: "Nametoll desk-side risk score (1 unit)",
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

  app.get(RISK_PATH, async (req, res) => {
    const wallet = parseWallet(req.query.wallet);
    if (!wallet) {
      res.status(400).json({ ok: false, error: "wallet query must be a 0x address." });
      return;
    }
    const score = merchandise.risk
      ? await merchandise.risk(wallet)
      : { sku: RISK_SKU, wallet, source: "demo-portfolio" as const, score: 0, healthFactor: "n/a", distanceToLiquidationPct: "n/a", factors: { collateralUsd: "0", borrowUsd: "0", markets: 0 }, methodology: "Risk scorer is not wired on this desk.", units: 1 as const, ok: false, stub: true as const };
    res.json(score);
  });
}

function readSettledBody(transportContext: unknown): unknown {
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
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function billedUsage(
  body: unknown,
  priceTinybars: string,
  prepaidTinybars: string,
): { name: string; sku?: string; burned: number; prepaidTinybars: string } {
  if (isRiskScore(body)) {
    return {
      name: RISK_SKU,
      sku: RISK_SKU,
      burned: body.ok || body.stub ? 1 : 0,
      prepaidTinybars,
    };
  }
  const snap = isMerchandiseSnapshot(body) ? body : undefined;
  return {
    name: snap && !snap.stub ? "lending-risk" : STUB_DESK_NAME,
    burned: snap
      ? burnedUnits(snap)
      : unitsFromAmount(prepaidTinybars, priceTinybars),
    prepaidTinybars,
  };
}

function isRiskScore(value: unknown): value is RiskScore {
  return Boolean(value && typeof value === "object" && (value as RiskScore).sku === RISK_SKU);
}

function isMerchandiseSnapshot(value: unknown): value is MerchandiseSnapshot {
  return Boolean(value && typeof value === "object" && "protocols" in (value as object));
}

function unitsFromAmount(amount: string, unitPrice: string): number {
  const price = BigInt(unitPrice);
  if (price === 0n) return STUB_UNITS;
  return Number(BigInt(amount) / price);
}

function payerFromHook(context: unknown): string | undefined {
  if (!context || typeof context !== "object") return undefined;
  const result = (context as { result?: { payer?: unknown } }).result;
  const payer = result?.payer;
  return typeof payer === "string" && /^0\.0\.\d+$/.test(payer) ? payer : undefined;
}

function payerFromSignature(header: string): string | undefined {
  try {
    const decoded = decodePaymentSignatureHeader(header) as {
      payload?: Record<string, unknown>;
    };
    const payload = decoded.payload;
    if (!payload) return undefined;
    for (const key of ["payer", "accountId"] as const) {
      const value = payload[key];
      if (typeof value === "string" && /^0\.0\.\d+$/.test(value)) return value;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
