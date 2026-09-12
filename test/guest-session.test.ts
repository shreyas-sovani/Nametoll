import { PrivateKey } from "@hiero-ledger/sdk";
import { describe, expect, it } from "vitest";
import { HBAR_ASSET } from "../src/config.ts";
import type { Brain } from "../src/modules/brain/index.ts";
import { createBuyer } from "../src/modules/buyer/index.ts";
import {
  GUEST_COOKIE,
  GUEST_FAUCET_TINYBARS,
  createMemoryGuestStore,
  openGuestSession,
} from "../src/modules/buyer/session.ts";
import {
  assertFaucetRunway,
  FAUCET_CLOSED_MESSAGE,
  FaucetClosedError,
} from "../src/modules/buyer/runway.ts";
import { createDirectory, DESK_TEXT_KEYS } from "../src/modules/directory/index.ts";
import { startDesk, startFakeFacilitator } from "./helpers.ts";

const FIXTURE_NAME = "desk-fixture.test";
const GUEST_ACCOUNT = "0.0.888888";

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

function testBuyer(accountId = "0.0.1") {
  const key = PrivateKey.generateECDSA();
  return createBuyer({
    accountId,
    privateKey: `0x${key.toStringRaw()}`,
    network: "hedera:testnet",
  });
}

function cookieHeader(res: Response, name: string): string | undefined {
  const lines = res.headers.getSetCookie?.() ?? [];
  const line = lines.find((entry) => entry.startsWith(`${name}=`));
  if (!line) return undefined;
  return line.split(";")[0];
}

describe("guest session", () => {
  it("faucets a bounded HBAR amount, sets a session cookie, and never returns the private key", async () => {
    let funded = 0;
    const desk = await startDesk(
      {},
      undefined,
      {
        guestFaucet: {
          async createAndFund() {
            funded += 1;
            return { accountId: GUEST_ACCOUNT, faucetTx: "0.0.9@1.2" };
          },
        },
      },
    );
    try {
      const res = await fetch(`${desk.url}/desk/session`, { method: "POST" });
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.ok).toBe(true);
      expect(body.accountId).toBe(GUEST_ACCOUNT);
      expect(body.faucetTinybars).toBe(GUEST_FAUCET_TINYBARS);
      expect(GUEST_FAUCET_TINYBARS).toBe("5000000");
      expect(body.faucetTx).toBe("0.0.9@1.2");
      expect(JSON.stringify(body)).not.toMatch(/privateKey|0x[0-9a-fA-F]{32,}/);
      expect(cookieHeader(res, GUEST_COOKIE)).toBeTruthy();
      expect(funded).toBe(1);

      const replay = await fetch(`${desk.url}/desk/session`, {
        method: "POST",
        headers: { cookie: cookieHeader(res, GUEST_COOKIE)! },
      });
      const replayed = (await replay.json()) as { accountId?: string };
      expect(replay.status).toBe(200);
      expect(replayed.accountId).toBe(GUEST_ACCOUNT);
      expect(funded).toBe(1);
    } finally {
      await desk.close();
    }
  });

  it("rate-limits session create behind the pay guard", async () => {
    const desk = await startDesk(
      { deskPayRateMax: 1, deskPayRateWindowMs: 60_000, deskPayGlobalMax: 1 },
      undefined,
      {
        guestFaucet: {
          async createAndFund() {
            return { accountId: GUEST_ACCOUNT, faucetTx: "0.0.9@1.2" };
          },
        },
      },
    );
    try {
      expect((await fetch(`${desk.url}/desk/session`, { method: "POST" })).status).toBe(
        200,
      );
      const blocked = await fetch(`${desk.url}/desk/session`, { method: "POST" });
      expect(blocked.status).toBe(429);
    } finally {
      await desk.close();
    }
  });

  it("pays with the guest signer and passes that account to the TEE", async () => {
    const payers: Array<string | undefined> = [];
    const brain: Brain = {
      source: "injected",
      async decide({ requestedTinybars, payer }) {
        payers.push(payer);
        return { allow: true, maxTinybars: requestedTinybars, reason: "under cap" };
      },
    };
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk({ facilitatorUrl: facilitator.url });
    try {
      const wired = await startDesk(
        { facilitatorUrl: facilitator.url, buyerAccountId: "0.0.1" },
        undefined,
        {
          directory: directoryFor(desk.url),
          buyer: testBuyer(),
          brain,
          guestFaucet: {
            async createAndFund() {
              return { accountId: GUEST_ACCOUNT, faucetTx: "0.0.9@1.2" };
            },
          },
        },
      );
      try {
        const session = await fetch(`${wired.url}/desk/session`, { method: "POST" });
        const cookie = cookieHeader(session, GUEST_COOKIE)!;
        const paid = await fetch(`${wired.url}/desk/pay`, {
          method: "POST",
          headers: { "content-type": "application/json", cookie },
          body: JSON.stringify({
            name: FIXTURE_NAME,
            protocols: ["aave-v3-ethereum"],
            payer: "guest",
          }),
        });
        expect(paid.status).toBe(200);
        const body = (await paid.json()) as {
          ok?: boolean;
          payer?: string;
          paid?: { settleTx?: string };
        };
        expect(body.ok).toBe(true);
        expect(body.payer).toBe(GUEST_ACCOUNT);
        expect(body.paid?.settleTx).toBeTruthy();
        expect(payers).toContain(GUEST_ACCOUNT);
      } finally {
        await wired.close();
      }
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });

  it("closes the faucet when the seller is under the floor", () => {
    expect(() => assertFaucetRunway("100000000", "500000000")).toThrow(FaucetClosedError);
    expect(() => assertFaucetRunway("100000000", "500000000")).toThrow(FAUCET_CLOSED_MESSAGE);
    expect(() => assertFaucetRunway("500000000", "500000000")).not.toThrow();
  });

  it("returns 503 when the seller is under the floor", async () => {
    const desk = await startDesk(
      {},
      undefined,
      {
        guestFaucet: {
          async createAndFund() {
            throw new FaucetClosedError();
          },
        },
      },
    );
    try {
      const res = await fetch(`${desk.url}/desk/session`, { method: "POST" });
      expect(res.status).toBe(503);
      const body = (await res.json()) as { error?: string };
      expect(body.error).toBe(FAUCET_CLOSED_MESSAGE);
    } finally {
      await desk.close();
    }
  });

  it("refuses a new guest when the in-memory store is at capacity", async () => {
    const store = createMemoryGuestStore();
    const faucet = {
      async createAndFund() {
        return { accountId: GUEST_ACCOUNT, faucetTx: "0.0.9@1.2" };
      },
    };
    await openGuestSession({ store, faucet, maxActive: 1 });
    await expect(openGuestSession({ store, faucet, maxActive: 1 })).rejects.toThrow(
      /at capacity/i,
    );
  });
});
