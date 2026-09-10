import { PrivateKey } from "@hiero-ledger/sdk";
import { describe, expect, it } from "vitest";
import { HBAR_ASSET } from "../src/config.ts";
import type { Brain } from "../src/modules/brain/index.ts";
import { createBuyer } from "../src/modules/buyer/index.ts";
import { createDirectory, DESK_TEXT_KEYS } from "../src/modules/directory/index.ts";
import { createMemoryLedger } from "../src/modules/ledger/index.ts";
import type { Merchandise } from "../src/modules/merchandise/index.ts";
import { publicDeskConfig, startDesk, startFakeFacilitator } from "./helpers.ts";

const FIXTURE_NAME = "desk-fixture.test";

const denyOverCap: Brain = {
  async decide() {
    return { allow: false, maxTinybars: "150000", reason: "over cap" };
  },
};

function countingMerchandise(): Merchandise & { calls: number } {
  const merchandise = {
    calls: 0,
    async snapshot() {
      merchandise.calls += 1;
      return { ok: true, stub: true as const, units: 1, protocols: [] };
    },
  };
  return merchandise;
}

function directoryFor(endpoint: string) {
  return createDirectory({
    fetchTexts: async (name) => {
      if (name !== FIXTURE_NAME) return {};
      return {
        [DESK_TEXT_KEYS.agentEndpointWeb]: endpoint,
        [DESK_TEXT_KEYS.agentContext]: JSON.stringify({
          payTo: "0.0.10463755",
          priceRule: "100000 tinybars per protocol",
          hcsTopic: "0.0.10464309",
          asset: HBAR_ASSET,
        }),
      };
    },
  });
}

function testBuyer() {
  const key = PrivateKey.generateECDSA();
  return createBuyer({
    accountId: "0.0.1",
    privateKey: `0x${key.toStringRaw()}`,
    network: "hedera:testnet",
  });
}

describe("judge / operator page", () => {
  it("is a driveable desk with empty state and no baked-in name", async () => {
    const desk = await startDesk({}, publicDeskConfig());
    try {
      const res = await fetch(`${desk.url}/`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toMatch(/paste a name/i);
      expect(html).toMatch(/id="desk-empty"/);
      expect(html).toMatch(/id="desk-error"/);
      expect(html).toMatch(/id="desk-deny"/);
      expect(html).toMatch(/id="station-descriptor"/);
      expect(html).toMatch(/id="station-tee"/);
      expect(html).toMatch(/id="station-challenge"/);
      expect(html).toMatch(/id="station-snapshot"/);
      expect(html).toMatch(/id="station-bill"/);
      expect(html).toMatch(/\/desk\/inspect/);
      expect(html).toMatch(/\/desk\/pay/);
      expect(html).toMatch(/HashScan/i);
      expect(html).toMatch(/HCS/);
      expect(html.toLowerCase()).not.toMatch(/\.eth/);
    } finally {
      await desk.close();
    }
  });
});

describe("GET /desk/inspect", () => {
  it("requires a name", async () => {
    const desk = await startDesk();
    try {
      const res = await fetch(`${desk.url}/desk/inspect`);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { ok?: boolean; error?: string };
      expect(body.ok).toBe(false);
      expect(body.error).toMatch(/name/i);
    } finally {
      await desk.close();
    }
  });

  it("returns an error for an unknown name", async () => {
    const desk = await startDesk({}, undefined, {
      directory: createDirectory({ fetchTexts: async () => ({}) }),
    });
    try {
      const res = await fetch(
        `${desk.url}/desk/inspect?name=${encodeURIComponent(FIXTURE_NAME)}`,
      );
      expect(res.status).toBe(404);
      const body = (await res.json()) as { ok?: boolean; error?: string };
      expect(body.ok).toBe(false);
      expect(body.error).toMatch(/unknown|no desk/i);
    } finally {
      await desk.close();
    }
  });

  it("returns descriptor, TEE verdict, and a 402 challenge for a pasted name", async () => {
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk({ facilitatorUrl: facilitator.url });
    try {
      const wired = await startDesk(
        { facilitatorUrl: facilitator.url },
        undefined,
        { directory: directoryFor(desk.url) },
      );
      try {
        const res = await fetch(
          `${wired.url}/desk/inspect?name=${encodeURIComponent(FIXTURE_NAME)}&protocols=aave-v3-ethereum`,
        );
        expect(res.status).toBe(200);
        const body = (await res.json()) as {
          ok?: boolean;
          name?: string;
          descriptor?: { endpoint?: string; hcsTopic?: string };
          verdict?: { allow?: boolean; reason?: string; maxTinybars?: string };
          challenge?: { status?: number; amount?: string; asset?: string };
          units?: number;
          tinybars?: string;
        };
        expect(body.ok).toBe(true);
        expect(body.name).toBe(FIXTURE_NAME);
        expect(body.descriptor?.endpoint).toBe(desk.url.replace(/\/+$/, ""));
        expect(body.descriptor?.hcsTopic).toBe("0.0.10464309");
        expect(body.units).toBe(1);
        expect(body.tinybars).toBe("100000");
        expect(body.verdict?.allow).toBe(true);
        expect(body.verdict?.reason).toBe("under cap");
        expect(body.challenge?.status).toBe(402);
        expect(body.challenge?.amount).toBe("100000");
        expect(body.challenge?.asset).toBe("0.0.0");
      } finally {
        await wired.close();
      }
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });

  it("keeps the unpaid 402 and surfaces a deny reason when the TEE refuses", async () => {
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk({ facilitatorUrl: facilitator.url });
    try {
      const wired = await startDesk(
        { facilitatorUrl: facilitator.url },
        undefined,
        { directory: directoryFor(desk.url), brain: denyOverCap },
      );
      try {
        const res = await fetch(
          `${wired.url}/desk/inspect?name=${encodeURIComponent(FIXTURE_NAME)}`,
        );
        expect(res.status).toBe(200);
        const body = (await res.json()) as {
          verdict?: { allow?: boolean; reason?: string };
          challenge?: { status?: number };
          paid?: unknown;
        };
        expect(body.verdict?.allow).toBe(false);
        expect(body.verdict?.reason).toMatch(/over cap/i);
        expect(body.challenge?.status).toBe(402);
        expect(body.paid).toBeUndefined();
      } finally {
        await wired.close();
      }
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });
});

describe("POST /desk/pay", () => {
  it("refuses to pay when the buyer signer is missing", async () => {
    const desk = await startDesk();
    try {
      const res = await fetch(`${desk.url}/desk/pay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: FIXTURE_NAME }),
      });
      expect(res.status).toBe(503);
      const body = (await res.json()) as { ok?: boolean; error?: string };
      expect(body.ok).toBe(false);
      expect(body.error).toMatch(/buyer/i);
    } finally {
      await desk.close();
    }
  });

  it("does not settle or fetch merchandise when the TEE denies", async () => {
    const facilitator = await startFakeFacilitator();
    const merchandise = countingMerchandise();
    const ledger = createMemoryLedger("0.0.10464309");
    const desk = await startDesk(
      { facilitatorUrl: facilitator.url },
      undefined,
      { merchandise, ledger, brain: denyOverCap },
    );
    try {
      const wired = await startDesk(
        { facilitatorUrl: facilitator.url },
        undefined,
        {
          directory: directoryFor(desk.url),
          brain: denyOverCap,
          buyer: testBuyer(),
        },
      );
      try {
        const res = await fetch(`${wired.url}/desk/pay`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: FIXTURE_NAME }),
        });
        expect(res.status).toBe(403);
        const body = (await res.json()) as {
          ok?: boolean;
          verdict?: { allow?: boolean; reason?: string };
          paid?: { settleTx?: string };
        };
        expect(body.ok).toBe(false);
        expect(body.verdict?.allow).toBe(false);
        expect(body.verdict?.reason).toMatch(/over cap/i);
        expect(body.paid?.settleTx).toBeUndefined();
        expect(merchandise.calls).toBe(0);
        expect(ledger.bills).toHaveLength(0);
      } finally {
        await wired.close();
      }
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });

  it("settles the resolved endpoint and returns snapshot plus HashScan and HCS", async () => {
    const facilitator = await startFakeFacilitator();
    const ledger = createMemoryLedger("0.0.10464309");
    const desk = await startDesk(
      { facilitatorUrl: facilitator.url, hcsTopicId: "0.0.10464309" },
      undefined,
      { ledger },
    );
    try {
      const wired = await startDesk(
        { facilitatorUrl: facilitator.url, hcsTopicId: "0.0.10464309" },
        undefined,
        {
          directory: directoryFor(desk.url),
          buyer: testBuyer(),
        },
      );
      try {
        const res = await fetch(`${wired.url}/desk/pay`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: FIXTURE_NAME,
            protocols: ["aave-v3-ethereum"],
          }),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as {
          ok?: boolean;
          name?: string;
          paid?: {
            status?: number;
            body?: { stub?: boolean; units?: number };
            settleTx?: string;
            hashscanUrl?: string;
          };
          bill?: { tinybars?: string; settleTx?: string };
          topicId?: string;
          topicHashscanUrl?: string;
        };
        expect(body.ok).toBe(true);
        expect(body.name).toBe(FIXTURE_NAME);
        expect(body.paid?.status).toBe(200);
        expect(body.paid?.body?.stub).toBe(true);
        expect(body.paid?.settleTx).toBe("0.0.1@1234567890.000000001");
        expect(body.paid?.hashscanUrl).toBe(
          "https://hashscan.io/testnet/tx/0.0.1@1234567890.000000001",
        );
        expect(body.topicId).toBe("0.0.10464309");
        expect(body.topicHashscanUrl).toBe(
          "https://hashscan.io/testnet/topic/0.0.10464309",
        );
        expect(ledger.bills).toHaveLength(1);
        expect(ledger.bills[0]?.settleTx).toBe(body.paid?.settleTx);
      } finally {
        await wired.close();
      }
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });
});
