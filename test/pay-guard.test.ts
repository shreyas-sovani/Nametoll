import { describe, expect, it } from "vitest";
import {
  createPayRateLimiter,
  payEndpointAllowed,
  secretsMatch,
} from "../src/modules/buyer/pay-guard.ts";

describe("pay rate limiter", () => {
  it("allows up to max hits in the window then refuses", () => {
    const limiter = createPayRateLimiter({ max: 2, windowMs: 1_000, globalMax: 10 });
    expect(limiter.take("127.0.0.1", 0).ok).toBe(true);
    expect(limiter.take("127.0.0.1", 1).ok).toBe(true);
    const blocked = limiter.take("127.0.0.1", 2);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });
});

describe("pay endpoint pin", () => {
  it("allows any endpoint when the public desk URL is unset", () => {
    expect(payEndpointAllowed("https://evil.example/desk", undefined)).toBe(true);
  });

  it("refuses an endpoint whose origin is not the public desk", () => {
    expect(
      payEndpointAllowed(
        "https://evil.example/desk",
        "https://nonwaxing.example",
      ),
    ).toBe(false);
  });

  it("allows the public desk origin with a trailing slash", () => {
    expect(
      payEndpointAllowed(
        "https://desk.example/",
        "https://desk.example",
      ),
    ).toBe(true);
  });

  it("still pays the live origin when PUBLIC_DESK_URL is a laptop or ngrok host", () => {
    expect(
      payEndpointAllowed(
        "https://nametoll.run.place/desk",
        "http://127.0.0.1:8787",
      ),
    ).toBe(true);
    expect(
      payEndpointAllowed(
        "https://nametoll.run.place",
        "https://old.ngrok-free.dev",
      ),
    ).toBe(true);
    expect(
      payEndpointAllowed(
        "https://evil.example/desk",
        "http://127.0.0.1:8787",
      ),
    ).toBe(false);
  });
});

describe("pay secret", () => {
  it("rejects a missing or wrong secret", () => {
    expect(secretsMatch(undefined, "correct")).toBe(false);
    expect(secretsMatch("nope", "correct")).toBe(false);
    expect(secretsMatch("correct", "correct")).toBe(true);
  });
});
