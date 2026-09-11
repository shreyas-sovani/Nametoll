import type { Express } from "express";
import type { Brain } from "./index.ts";

export const BRAIN_PATH = "/desk/brain";
export const JOIN_PATH = "/desk/join";

export function mountBrain(app: Express, brain: Brain): void {
  app.get(BRAIN_PATH, async (req, res) => {
    const requested =
      typeof req.query.tinybars === "string" ? req.query.tinybars : "";
    if (!requested.trim()) {
      res.status(400).json({ ok: false, error: "tinybars query is required" });
      return;
    }
    const payer = typeof req.query.payer === "string" ? req.query.payer.trim() : "";
    const paysThisHour =
      typeof req.query.pays === "string" ? req.query.pays.trim() : "";
    const verdict = await brain.decide({
      requestedTinybars: requested,
      ...(payer ? { payer } : {}),
      ...(paysThisHour ? { paysThisHour } : {}),
    });
    res.status(verdict.allow ? 200 : 403).json({ ok: verdict.allow, ...verdict });
  });

  app.get(JOIN_PATH, async (_req, res) => {
    if (!brain.join) {
      res.status(503).json({ ok: false, error: "TEE unavailable" });
      return;
    }
    try {
      const call = await brain.join();
      res.json({ ok: true, ...call });
    } catch (error) {
      const message = error instanceof Error ? error.message : "TEE unavailable";
      res.status(503).json({ ok: false, error: message });
    }
  });
}
