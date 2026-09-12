import type { Express } from "express";
import type { AppConfig } from "../../config.ts";
import type { Brain } from "../brain/index.ts";
import { DeskResolveError, type Directory } from "../directory/index.ts";
import { protocolIdsFromQuery } from "../gate/meter.ts";
import type { Ledger } from "../ledger/index.ts";
import { createBuyer, type Buyer } from "./index.ts";
import { inspectNamedDesk, payNamedDesk } from "./drive.ts";
import type { PayWindow } from "../brain/pay-window.ts";
import {
  createPayRateLimiter,
  DEFAULT_PAY_GLOBAL_MAX,
  DEFAULT_PAY_RATE_MAX,
  DEFAULT_PAY_RATE_WINDOW_MS,
  type PayRateLimiter,
} from "./pay-guard.ts";
import { clientKey, paySecretOk } from "./session-http.ts";
import { GUEST_COOKIE, type GuestStore } from "./session.ts";
import { readCookie } from "./pay-guard.ts";

export const INSPECT_PATH = "/desk/inspect";
export const PAY_PATH = "/desk/pay";

export type BuyerHttpDeps = {
  directory: Directory;
  brain: Brain;
  config: AppConfig;
  buyer?: Buyer;
  ledger?: Ledger;
  payWindow?: PayWindow;
  guestStore?: GuestStore;
  limiter?: PayRateLimiter;
};

export function mountBuyer(app: Express, deps: BuyerHttpDeps): void {
  const limiter =
    deps.limiter ??
    createPayRateLimiter({
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
        driveContext(deps, req, typeof req.query.payer === "string" ? req.query.payer : ""),
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
    if (!paySecretOk(req, deps.config.deskPaySecret)) {
      res.status(401).json({
        ok: false,
        error: "Pay requires x-desk-pay-secret. GET /desk/inspect stays open.",
      });
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
    const sku = typeof body.sku === "string" ? body.sku : undefined;
    const wallet = typeof body.wallet === "string" ? body.wallet : undefined;
    const payerMode = typeof body.payer === "string" ? body.payer : "";
    const resolved = resolvePayer(deps, req, payerMode);
    if (!resolved.ok) {
      res.status(resolved.status).json({ ok: false, error: resolved.error });
      return;
    }
    try {
      const paid = await payNamedDesk(
        name,
        deps.directory,
        deps.brain,
        resolved.buyer,
        deps.config,
        deps.ledger,
        protocols,
        resolved.context,
        sku,
        wallet,
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

function driveContext(
  deps: BuyerHttpDeps,
  req: { headers: { cookie?: string | undefined } },
  payerMode: string,
): { payer?: string; paysThisHour?: string } {
  const resolved = resolvePayer(deps, req, payerMode);
  return {
    ...(resolved.ok && resolved.context.payer ? { payer: resolved.context.payer } : {}),
    ...(!resolved.ok && deps.config.buyerAccountId
      ? { payer: deps.config.buyerAccountId }
      : {}),
    ...(deps.payWindow ? { paysThisHour: String(deps.payWindow.count()) } : {}),
  };
}

function resolvePayer(
  deps: BuyerHttpDeps,
  req: { headers: { cookie?: string | undefined } },
  payerMode: string,
):
  | { ok: true; buyer: Buyer; context: { payer?: string; paysThisHour?: string } }
  | { ok: false; status: number; error: string } {
  const hour = deps.payWindow ? { paysThisHour: String(deps.payWindow.count()) } : {};
  if (payerMode === "guest") {
    const id = readCookie(
      typeof req.headers.cookie === "string" ? req.headers.cookie : undefined,
      GUEST_COOKIE,
    );
    const guest = id && deps.guestStore ? deps.guestStore.get(id) : undefined;
    if (!guest) {
      return { ok: false, status: 401, error: "Guest session required. POST /desk/session first." };
    }
    return {
      ok: true,
      buyer: createBuyer({
        accountId: guest.accountId,
        privateKey: guest.privateKey,
        network: deps.config.network,
      }),
      context: { payer: guest.accountId, ...hour },
    };
  }
  if (!deps.buyer) {
    return { ok: false, status: 503, error: "Buyer signer is not configured on this desk." };
  }
  return {
    ok: true,
    buyer: deps.buyer,
    context: {
      ...(deps.config.buyerAccountId ? { payer: deps.config.buyerAccountId } : {}),
      ...hour,
    },
  };
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
