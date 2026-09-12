import type { Express } from "express";
import type { AppConfig } from "../../config.ts";
import {
  createPayRateLimiter,
  DEFAULT_PAY_GLOBAL_MAX,
  DEFAULT_PAY_RATE_MAX,
  DEFAULT_PAY_RATE_WINDOW_MS,
  PAY_SECRET_COOKIE,
  PAY_SECRET_HEADER,
  readCookie,
  secretsMatch,
  type PayRateLimiter,
} from "./pay-guard.ts";
import {
  GUEST_COOKIE,
  guestCookie,
  guestPublicView,
  openGuestSession,
  type GuestFaucet,
  type GuestStore,
} from "./session.ts";

export const SESSION_PATH = "/desk/session";

export type GuestHttpDeps = {
  config: AppConfig;
  store: GuestStore;
  faucet?: GuestFaucet;
  limiter?: PayRateLimiter;
};

export function mountGuestSession(app: Express, deps: GuestHttpDeps): void {
  const limiter =
    deps.limiter ??
    createPayRateLimiter({
      max: deps.config.deskPayRateMax ?? DEFAULT_PAY_RATE_MAX,
      windowMs: deps.config.deskPayRateWindowMs ?? DEFAULT_PAY_RATE_WINDOW_MS,
      globalMax: deps.config.deskPayGlobalMax ?? DEFAULT_PAY_GLOBAL_MAX,
    });

  app.post(SESSION_PATH, async (req, res) => {
    const limited = limiter.take(clientKey(req.ip, req.socket.remoteAddress));
    if (!limited.ok) {
      res.setHeader("Retry-After", String(limited.retryAfterSec));
      res.status(429).json({ ok: false, error: "Pay rate limit. Retry shortly." });
      return;
    }
    if (!paySecretOk(req, deps.config.deskPaySecret)) {
      res.status(401).json({
        ok: false,
        error: `Pay requires ${PAY_SECRET_HEADER}. GET /desk/inspect stays open.`,
      });
      return;
    }
    if (!deps.faucet) {
      res.status(503).json({ ok: false, error: "Guest faucet is not configured on this desk." });
      return;
    }
    try {
      const existingId = readCookie(
        typeof req.headers.cookie === "string" ? req.headers.cookie : undefined,
        GUEST_COOKIE,
      );
      const record = await openGuestSession({
        store: deps.store,
        faucet: deps.faucet,
        ...(existingId ? { existingId } : {}),
      });
      res.append("Set-Cookie", guestCookie(record.id, req.secure));
      res.json({ ok: true, ...guestPublicView(record, deps.config) });
    } catch (error) {
      const message = error instanceof Error ? error.message : "session failed";
      res.status(502).json({ ok: false, error: message });
    }
  });

  app.get(SESSION_PATH, (req, res) => {
    const existingId = readCookie(
      typeof req.headers.cookie === "string" ? req.headers.cookie : undefined,
      GUEST_COOKIE,
    );
    const record = existingId ? deps.store.get(existingId) : undefined;
    if (!record) {
      res.status(404).json({ ok: false, error: "No guest session." });
      return;
    }
    res.json({ ok: true, ...guestPublicView(record, deps.config) });
  });
}

export function paySecretOk(
  req: { headers: { [key: string]: unknown } },
  expected?: string,
): boolean {
  if (!expected) return true;
  const provided =
    headerString(req.headers[PAY_SECRET_HEADER]) ??
    readCookie(
      typeof req.headers.cookie === "string" ? req.headers.cookie : undefined,
      PAY_SECRET_COOKIE,
    );
  return secretsMatch(provided, expected);
}

export function clientKey(ip?: string, remoteAddress?: string): string {
  return ip || remoteAddress || "unknown";
}

function headerString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}
