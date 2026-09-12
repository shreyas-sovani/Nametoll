import { describe, expect, it } from "vitest";
import { publicDeskConfig, startDesk } from "./helpers.ts";

describe("desk health", () => {
  it("returns ok without partner credentials", async () => {
    const desk = await startDesk({}, publicDeskConfig());
    try {
      const res = await fetch(`${desk.url}/health`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/application\/json/);
      const body = (await res.json()) as { ok?: unknown };
      expect(body.ok).toBe(true);
    } finally {
      await desk.close();
    }
  });

  it("names the six module boundaries", async () => {
    const desk = await startDesk({}, publicDeskConfig());
    try {
      const res = await fetch(`${desk.url}/health`);
      const body = (await res.json()) as { modules?: unknown };
      expect(body.modules).toEqual([
        "directory",
        "gate",
        "brain",
        "merchandise",
        "ledger",
        "buyer",
      ]);
    } finally {
      await desk.close();
    }
  });

  it("reports the TEE verdict TTL so a judge can ask about cache honestly", async () => {
    const desk = await startDesk({}, publicDeskConfig());
    try {
      const body = (await (await fetch(`${desk.url}/health`)).json()) as {
        brain?: { verdictTtlMs?: number };
      };
      expect(body.brain?.verdictTtlMs).toBe(60_000);
    } finally {
      await desk.close();
    }
  });

  it("reports a configured TEE TTL and seller runway", async () => {
    const desk = await startDesk(
      { verdictTtlMs: 1_800_000, sellerAccountId: "0.0.10463755" },
      undefined,
      {
        brain: {
          source: "injected",
          verdictTtlMs: 1_800_000,
          async decide({ requestedTinybars }) {
            return { allow: true, maxTinybars: requestedTinybars, reason: "under cap" };
          },
        },
        readSellerTinybars: async () => "800000000",
      },
    );
    try {
      const body = (await (await fetch(`${desk.url}/health`)).json()) as {
        brain?: { verdictTtlMs?: number };
        runway?: { sellerTinybars?: string; faucetOpen?: boolean; faucetTinybars?: string };
      };
      expect(body.brain?.verdictTtlMs).toBe(1_800_000);
      expect(body.runway?.sellerTinybars).toBe("800000000");
      expect(body.runway?.faucetOpen).toBe(true);
      expect(body.runway?.faucetTinybars).toBe("5000000");
    } finally {
      await desk.close();
    }
  });
});
