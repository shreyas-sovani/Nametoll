import type { Express } from "express";
import type { AppConfig } from "../../config.ts";
import {
  clientKey,
  paySecretOk,
} from "../buyer/session-http.ts";
import {
  createPayRateLimiter,
  DEFAULT_PAY_GLOBAL_MAX,
  DEFAULT_PAY_RATE_MAX,
  DEFAULT_PAY_RATE_WINDOW_MS,
  type PayRateLimiter,
} from "../buyer/pay-guard.ts";
import { constrainedDeskRecords, type IssueChild } from "./register.ts";

export const REGISTER_PATH = "/desk/register";

export type RegisterHttpDeps = {
  config: AppConfig;
  issueChild?: IssueChild;
  limiter?: PayRateLimiter;
};

export function mountRegister(app: Express, deps: RegisterHttpDeps): void {
  const limiter =
    deps.limiter ??
    createPayRateLimiter({
      max: deps.config.deskPayRateMax ?? DEFAULT_PAY_RATE_MAX,
      windowMs: deps.config.deskPayRateWindowMs ?? DEFAULT_PAY_RATE_WINDOW_MS,
      globalMax: deps.config.deskPayGlobalMax ?? DEFAULT_PAY_GLOBAL_MAX,
    });

  app.post(REGISTER_PATH, async (req, res) => {
    const limited = limiter.take(clientKey(req.ip, req.socket.remoteAddress));
    if (!limited.ok) {
      res.setHeader("Retry-After", String(limited.retryAfterSec));
      res.status(429).json({ ok: false, error: "Pay rate limit. Retry shortly." });
      return;
    }
    if (!paySecretOk(req, deps.config.deskPaySecret)) {
      res.status(401).json({ ok: false, error: "Register requires the desk pay secret." });
      return;
    }
    if (!deps.issueChild) {
      res.status(503).json({ ok: false, error: "Desk registration is not configured." });
      return;
    }
    const body = asRecord(req.body);
    try {
      const records = constrainedDeskRecords(deps.config, {
        label: typeof body.label === "string" ? body.label : "",
        ...(typeof body.endpoint === "string" ? { endpoint: body.endpoint } : {}),
        ...(body.expiresIn !== undefined ? { expiresIn: body.expiresIn } : {}),
      });
      const issued = await deps.issueChild(records);
      res.json({
        ok: true,
        ...issued,
        ...records,
        expiresIn: records.expiresIn.toString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "register failed";
      const status = /required|label|configured|Endpoint|expir/i.test(message) ? 400 : 502;
      res.status(status).json({ ok: false, error: message });
    }
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
