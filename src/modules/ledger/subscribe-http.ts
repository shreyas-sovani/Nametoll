import type { Express } from "express";
import type { AppConfig } from "../../config.ts";
import type { Brain } from "../brain/index.ts";
import { protocolIdsFromQuery, requestedUnits } from "../gate/meter.ts";
import { meterTinybars } from "../gate/meter.ts";
import type { Merchandise } from "../merchandise/index.ts";
import { newRequestId, type Ledger } from "./index.ts";
import {
  alreadyClaimed,
  claimReady,
  DEFAULT_SUBSCRIBE_SLOTS,
  fetchMirrorSchedule,
  subscribePlan,
  WEEK_SECONDS,
  type ScheduleView,
} from "./subscribe.ts";
import { classifyHtsProbe, probeFacilitator } from "./hts-probe.ts";
import { tollTokenPlan } from "./toll.ts";

export const SUBSCRIBE_PATH = "/desk/subscribe";
export const CLAIM_PATH = "/desk/claim";
export const HTS_PATH = "/desk/hts";

export type LookupSchedule = (scheduleId: string) => Promise<ScheduleView>;

export type SubscribeHttpDeps = {
  config: AppConfig;
  merchandise: Merchandise;
  brain: Brain;
  ledger?: Ledger;
  lookupSchedule?: LookupSchedule;
};

export function mountSubscribe(app: Express, deps: SubscribeHttpDeps): void {
  app.get(HTS_PATH, async (_req, res) => {
    const seller = deps.config.sellerAccountId;
    const token = seller
      ? tollTokenPlan({
          treasury: seller,
          collector: seller,
          feeTinybars: deps.config.priceTinybars,
        })
      : undefined;
    let probe = classifyHtsProbe({ advertisedAssets: [] });
    let feePayer: string | undefined;
    try {
      const live = await probeFacilitator(deps.config.facilitatorUrl);
      probe = { blocky402Hts: live.blocky402Hts, keepHbarSnapshot: true };
      feePayer = live.feePayer;
    } catch {
      // Plan still publishes. Snapshot asset stays 0.0.0.
    }
    res.json({
      ok: true,
      keepHbarSnapshot: probe.keepHbarSnapshot,
      blocky402Hts: probe.blocky402Hts,
      ...(feePayer ? { feePayer } : {}),
      ...(deps.config.htsTokenId ? { tokenId: deps.config.htsTokenId } : {}),
      ...(token ? { token } : {}),
    });
  });

  app.get(SUBSCRIBE_PATH, (req, res) => {
    const payer = deps.config.buyerAccountId;
    const payTo = deps.config.sellerAccountId;
    if (!payer || !payTo) {
      res.status(400).json({
        ok: false,
        error: "Subscribe plan needs HEDERA_BUYER_ACCOUNT_ID and HEDERA_SELLER_ACCOUNT_ID.",
      });
      return;
    }
    if (req.query.slots == null || req.query.slots === "") {
      res.status(400).json({ ok: false, error: "slots query is required" });
      return;
    }
    const slots = parseCount(req.query.slots, DEFAULT_SUBSCRIBE_SLOTS);
    const intervalSec = parseCount(req.query.intervalSec, WEEK_SECONDS);
    if (!slots.ok) {
      res.status(400).json({ ok: false, error: slots.error });
      return;
    }
    if (!intervalSec.ok) {
      res.status(400).json({ ok: false, error: intervalSec.error });
      return;
    }
    try {
      const plan = subscribePlan({
        slots: slots.value,
        intervalSeconds: intervalSec.value,
        from: new Date(),
        payer,
        payTo,
        tinybars: deps.config.priceTinybars,
        ...(deps.config.htsTokenId ? { tokenId: deps.config.htsTokenId } : {}),
      });
      res.json({ ok: true, ...plan });
    } catch (error) {
      res.status(400).json({
        ok: false,
        error: error instanceof Error ? error.message : "Invalid subscribe plan.",
      });
    }
  });

  app.get(CLAIM_PATH, async (req, res) => {
    const scheduleId = typeof req.query.schedule === "string" ? req.query.schedule.trim() : "";
    if (!/^0\.0\.\d+$/.test(scheduleId)) {
      res.status(400).json({ ok: false, error: "schedule query must be a Hedera schedule id." });
      return;
    }
    try {
      const schedule = await (deps.lookupSchedule
        ? deps.lookupSchedule(scheduleId)
        : fetchMirrorSchedule(deps.config.mirrorNodeUrl, scheduleId));
      const bills = deps.ledger ? await deps.ledger.list() : [];
      const decision = claimReady({
        schedule,
        alreadyClaimed: alreadyClaimed(bills, scheduleId),
      });
      if (!decision.ok) {
        res.status(403).json({ ok: false, error: decision.reason, schedule });
        return;
      }

      const protocols = protocolIdsFromQuery(req.query.protocols);
      const units = requestedUnits(protocols);
      const prepaid = meterTinybars(deps.config.priceTinybars, units);
      const verdict = await deps.brain.decide({ requestedTinybars: prepaid });
      if (!verdict.allow || BigInt(prepaid) > BigInt(verdict.maxTinybars)) {
        res.status(403).json({ ok: false, ...verdict });
        return;
      }

      const snap = await deps.merchandise.snapshot(protocols);
      if (deps.ledger) {
        await deps.ledger.append({
          requestId: newRequestId(),
          name: snap.stub ? "subscribe-stub" : "subscribe",
          units: snap.units,
          tinybars: meterTinybars(deps.config.priceTinybars, snap.units),
          settleTx: schedule.executedTimestamp ?? scheduleId,
          prepaidTinybars: prepaid,
          scheduleId,
        });
      }
      res.json(snap);
    } catch (error) {
      res.status(404).json({
        ok: false,
        error: error instanceof Error ? error.message : "Schedule not found.",
      });
    }
  });
}

function parseCount(
  raw: unknown,
  fallback: number,
): { ok: true; value: number } | { ok: false; error: string } {
  if (raw == null || raw === "") {
    return { ok: true, value: fallback };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "slots and intervalSec must be integers." };
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < 1) {
    return { ok: false, error: "slots and intervalSec must be positive integers." };
  }
  return { ok: true, value };
}
