import { createHash, timingSafeEqual } from "node:crypto";
import { LIVE_DESK_ORIGIN } from "../../config.ts";

export const PAY_SECRET_HEADER = "x-desk-pay-secret";
export const PAY_SECRET_COOKIE = "nametoll_pay";

export const DEFAULT_PAY_RATE_MAX = 8;
export const DEFAULT_PAY_RATE_WINDOW_MS = 60_000;
export const DEFAULT_PAY_GLOBAL_MAX = 24;

export type PayRateLimitOk = { ok: true };
export type PayRateLimitBlocked = { ok: false; retryAfterSec: number };
export type PayRateLimitResult = PayRateLimitOk | PayRateLimitBlocked;

export type PayRateLimiter = {
  take(key: string, now?: number): PayRateLimitResult;
};

export function createPayRateLimiter(options: {
  max: number;
  windowMs: number;
  globalMax: number;
}): PayRateLimiter {
  const hits = new Map<string, number[]>();

  function prune(stamps: number[], now: number): number[] {
    return stamps.filter((stamp) => stamp > now - options.windowMs);
  }

  return {
    take(key: string, now = Date.now()): PayRateLimitResult {
      const global = prune(hits.get("*") ?? [], now);
      if (global.length >= options.globalMax) {
        hits.set("*", global);
        return {
          ok: false,
          retryAfterSec: retryAfterSec(global[0]!, options.windowMs, now),
        };
      }
      const stamps = prune(hits.get(key) ?? [], now);
      if (stamps.length >= options.max) {
        hits.set(key, stamps);
        return {
          ok: false,
          retryAfterSec: retryAfterSec(stamps[0]!, options.windowMs, now),
        };
      }
      stamps.push(now);
      global.push(now);
      hits.set(key, stamps);
      hits.set("*", global);
      return { ok: true };
    },
  };
}

function retryAfterSec(oldest: number, windowMs: number, now: number): number {
  return Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
}

export function payEndpointAllowed(
  endpoint: string,
  publicDeskUrl?: string,
): boolean {
  if (!publicDeskUrl) return true;
  return (
    sameOrigin(endpoint, publicDeskUrl) || sameOrigin(endpoint, LIVE_DESK_ORIGIN)
  );
}

export function sameOrigin(left: string, right: string): boolean {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}

export function secretsMatch(
  provided: string | undefined,
  expected: string,
): boolean {
  const a = createHash("sha256")
    .update(provided ?? "")
    .digest();
  const b = createHash("sha256").update(expected).digest();
  const equal = timingSafeEqual(a, b);
  return Boolean(provided) && equal;
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

export function paySecretCookie(secret: string, secure: boolean): string {
  const flags = [
    `${PAY_SECRET_COOKIE}=${encodeURIComponent(secret)}`,
    "HttpOnly",
    "SameSite=Strict",
    "Path=/",
    "Max-Age=86400",
  ];
  if (secure) flags.push("Secure");
  return flags.join("; ");
}
