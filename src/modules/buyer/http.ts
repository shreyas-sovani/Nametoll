import type { Express } from "express";
import type { AppConfig } from "../../config.ts";
import type { Brain } from "../brain/index.ts";
import { DeskResolveError, type Directory } from "../directory/index.ts";
import { protocolIdsFromQuery } from "../gate/meter.ts";
import type { Ledger } from "../ledger/index.ts";
import type { Buyer } from "./index.ts";
import { inspectNamedDesk, payNamedDesk } from "./drive.ts";

export const INSPECT_PATH = "/desk/inspect";
export const PAY_PATH = "/desk/pay";

export type BuyerHttpDeps = {
  directory: Directory;
  brain: Brain;
  config: AppConfig;
  buyer?: Buyer;
  ledger?: Ledger;
};

export function mountBuyer(app: Express, deps: BuyerHttpDeps): void {
  app.get(INSPECT_PATH, async (req, res) => {
    const name = typeof req.query.name === "string" ? req.query.name : "";
    if (!name.trim()) {
      res.status(400).json({ ok: false, error: "name query is required" });
      return;
    }
    try {
      const inspect = await inspectNamedDesk(
        name,
        deps.directory,
        deps.brain,
        deps.config,
        protocolIdsFromQuery(req.query.protocols),
      );
      res.json({ ok: true, ...inspect });
    } catch (error) {
      sendDriveError(res, error);
    }
  });

  app.post(PAY_PATH, async (req, res) => {
    if (!deps.buyer) {
      res.status(503).json({ ok: false, error: "Buyer signer is not configured on this desk." });
      return;
    }
    const body = asRecord(req.body);
    const name =
      (typeof body.name === "string" && body.name) ||
      (typeof req.query.name === "string" ? req.query.name : "");
    if (!name.trim()) {
      res.status(400).json({ ok: false, error: "name is required" });
      return;
    }
    const protocols =
      protocolIdsFromQuery(body.protocols) ?? protocolIdsFromQuery(req.query.protocols);
    try {
      const paid = await payNamedDesk(
        name,
        deps.directory,
        deps.brain,
        deps.buyer,
        deps.config,
        deps.ledger,
        protocols,
      );
      if (!paid.ok) {
        res.status(paid.status).json({
          ok: false,
          ...paid.inspect,
          error: paid.inspect.verdict.reason || "Pay refused",
        });
        return;
      }
      res.json({ ok: true, ...paid.result });
    } catch (error) {
      sendDriveError(res, error);
    }
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function sendDriveError(
  res: { status: (code: number) => { json: (body: unknown) => void } },
  error: unknown,
): void {
  const message = error instanceof Error ? error.message : "drive failed";
  const status =
    error instanceof DeskResolveError && /required/i.test(message)
      ? 400
      : error instanceof DeskResolveError
        ? 404
        : 502;
  res.status(status).json({ ok: false, error: message });
}
