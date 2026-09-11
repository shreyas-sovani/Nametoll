import type { Express } from "express";
import type { AppConfig } from "../../config.ts";
import type { Brain } from "../brain/index.ts";
import { DeskResolveError, type Directory } from "../directory/index.ts";
import { protocolIdsFromQuery } from "../gate/meter.ts";
import type { Ledger } from "../ledger/index.ts";
import type { Buyer } from "./index.ts";
import { inspectNamedDesk, payNamedDesk } from "./drive.ts";
import {
  createPayRateLimiter,
  DEFAULT_PAY_GLOBAL_MAX,
  DEFAULT_PAY_RATE_MAX,
  DEFAULT_PAY_RATE_WINDOW_MS,
  PAY_SECRET_COOKIE,
  PAY_SECRET_HEADER,
  readCookie,
  secretsMatch,
} from "./pay-guard.ts";

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
  const limiter = createPayRateLimiter({
    max: deps.config.deskPayRateMax ?? DEFAULT_PAY_RATE_MAX,
    windowMs: deps.config.deskPayRateWindowMs ?? DEFAULT_PAY_RATE_WINDOW_MS,
    globalMax: deps.config.deskPayGlobalMax ?? DEFAULT_PAY_GLOBAL_MAX,
  });

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
    const limited = limiter.take(clientKey(req.ip, req.socket.remoteAddress));
    if (!limited.ok) {
      res.setHeader("Retry-After", String(limited.retryAfterSec));
      res.status(429).json({ ok: false, error: "Pay rate limit. Retry shortly." });
      return;
    }
    const expected = deps.config.deskPaySecret;
    if (expected) {
      const provided =
        headerString(req.headers[PAY_SECRET_HEADER]) ??
        readCookie(
          typeof req.headers.cookie === "string" ? req.headers.cookie : undefined,
          PAY_SECRET_COOKIE,
        );
      if (!secretsMatch(provided, expected)) {
        res.status(401).json({
          ok: false,
          error: `Pay requires ${PAY_SECRET_HEADER}. GET /desk/inspect stays open.`,
        });
        return;
      }
    }
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
          error: paid.error ?? (paid.inspect.verdict.reason || "Pay refused"),
        });
        return;
      }
      res.json({ ok: true, ...paid.result });
    } catch (error) {
      sendDriveError(res, error);
    }
  });
}

function clientKey(ip?: string, remoteAddress?: string): string {
  return ip || remoteAddress || "unknown";
}

function headerString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
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
