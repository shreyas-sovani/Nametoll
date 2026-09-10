import type { Express } from "express";
import type { Brain } from "./index.ts";

export const BRAIN_PATH = "/desk/brain";

export function mountBrain(app: Express, brain: Brain): void {
  app.get(BRAIN_PATH, async (req, res) => {
    const requested =
      typeof req.query.tinybars === "string" ? req.query.tinybars : "";
    if (!requested.trim()) {
      res.status(400).json({ ok: false, error: "tinybars query is required" });
      return;
    }
    const verdict = await brain.decide({ requestedTinybars: requested });
    res.status(verdict.allow ? 200 : 403).json({ ok: verdict.allow, ...verdict });
  });
}
