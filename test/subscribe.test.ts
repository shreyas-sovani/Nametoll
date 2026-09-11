import { describe, expect, it } from "vitest";
import { HBAR_ASSET } from "../src/config.ts";
import { createMemoryLedger } from "../src/modules/ledger/index.ts";
import {
  MAX_SCHEDULE_SECONDS,
  WEEK_SECONDS,
  claimReady,
  scheduleFromMirror,
  subscribePlan,
} from "../src/modules/ledger/subscribe.ts";
import { decodeChallenge, paymentOffers, startDesk, testDeskConfig } from "./helpers.ts";

describe("subscribe plan", () => {
  it("requires a slot count and always waits for expiry", () => {
    expect(() =>
      subscribePlan({
        slots: 0,
        intervalSeconds: WEEK_SECONDS,
        from: new Date("2026-09-12T00:00:00Z"),
        payer: "0.0.10",
        payTo: "0.0.20",
        tinybars: "100000",
      }),
    ).toThrow(/slots/i);

    const plan = subscribePlan({
      slots: 2,
      intervalSeconds: WEEK_SECONDS,
      from: new Date("2026-09-12T00:00:00Z"),
      payer: "0.0.10",
      payTo: "0.0.20",
      tinybars: "100000",
    });
    expect(plan.slots).toHaveLength(2);
    expect(plan.asset).toBe(HBAR_ASSET);
    expect(plan.waitForExpiry).toBe(true);
    expect(plan.slots[0]?.tinybars).toBe("100000");
    expect(plan.slots[1]?.expireAt).toBe("2026-09-26T00:00:00.000Z");
    expect(plan.maxExpirySeconds).toBe(MAX_SCHEDULE_SECONDS);
  });

  it("refuses an expiry past the 62-day network cap", () => {
    expect(() =>
      subscribePlan({
        slots: 2,
        intervalSeconds: MAX_SCHEDULE_SECONDS,
        from: new Date("2026-09-12T00:00:00Z"),
        payer: "0.0.10",
        payTo: "0.0.20",
        tinybars: "100000",
      }),
    ).toThrow(/62 days|5356800/i);
  });

  it("can schedule one TOLL unit when a token id is supplied", () => {
    const plan = subscribePlan({
      slots: 1,
      intervalSeconds: 120,
      from: new Date("2026-09-12T00:00:00Z"),
      payer: "0.0.10",
      payTo: "0.0.20",
      tinybars: "100000",
      tokenId: "0.0.888",
    });
    expect(plan.asset).toBe("0.0.888");
    expect(plan.slots[0]?.tokenAmount).toBe("1");
    expect(plan.slots[0]?.tinybars).toBe("100000");
  });
});

describe("subscribe claim", () => {
  it("allows a claim only after the schedule executed and has not been billed", () => {
    expect(
      claimReady({
        schedule: scheduleFromMirror({
          schedule_id: "0.0.1",
          deleted: false,
          executed_timestamp: null,
          wait_for_expiry: true,
        }),
      }).ok,
    ).toBe(false);
    expect(
      claimReady({
        schedule: scheduleFromMirror({
          schedule_id: "0.0.1",
          deleted: true,
          executed_timestamp: "1.0",
          wait_for_expiry: true,
        }),
      }).reason,
    ).toMatch(/deleted/i);
    expect(
      claimReady({
        schedule: scheduleFromMirror({
          schedule_id: "0.0.1",
          deleted: false,
          executed_timestamp: "1789000000.000000000",
          wait_for_expiry: true,
        }),
        alreadyClaimed: true,
      }).reason,
    ).toMatch(/claimed/i);
    expect(
      claimReady({
        schedule: scheduleFromMirror({
          schedule_id: "0.0.1",
          deleted: false,
          executed_timestamp: "1789000000.000000000",
          wait_for_expiry: true,
        }),
      }),
    ).toEqual({ ok: true, reason: "executed" });
  });
});

describe("subscribe http", () => {
  it("returns an unsigned plan and does not change the HBAR 402 snapshot", async () => {
    const desk = await startDesk(
      {},
      testDeskConfig({ sellerAccountId: "0.0.20", buyerAccountId: "0.0.10" }),
    );
    try {
      const missing = await fetch(`${desk.url}/desk/subscribe`);
      expect(missing.status).toBe(400);

      const planned = await fetch(
        `${desk.url}/desk/subscribe?slots=2&intervalSec=${WEEK_SECONDS}`,
      );
      expect(planned.status).toBe(200);
      const body = (await planned.json()) as {
        ok?: boolean;
        waitForExpiry?: boolean;
        asset?: string;
        slots?: Array<{ tinybars?: string }>;
      };
      expect(body.ok).toBe(true);
      expect(body.waitForExpiry).toBe(true);
      expect(body.asset).toBe(HBAR_ASSET);
      expect(body.slots).toHaveLength(2);
      expect(body.slots?.[0]?.tinybars).toBe("100000");

      const unpaid = await fetch(`${desk.url}/desk/snapshot`, {
        headers: { accept: "application/json" },
      });
      expect(unpaid.status).toBe(402);
      const offer = paymentOffers(decodeChallenge(unpaid.headers.get("payment-required")!))[0];
      expect(offer?.asset).toBe(HBAR_ASSET);
    } finally {
      await desk.close();
    }
  });

  it("refuses claim until the schedule has executed, then bills once", async () => {
    const ledger = createMemoryLedger();
    const views = new Map([
      [
        "0.0.77",
        scheduleFromMirror({
          schedule_id: "0.0.77",
          deleted: false,
          executed_timestamp: null,
          wait_for_expiry: true,
        }),
      ],
    ]);
    const desk = await startDesk({}, testDeskConfig(), {
      ledger,
      lookupSchedule: async (id) => {
        const found = views.get(id);
        if (!found) throw new Error(`missing ${id}`);
        return found;
      },
    });
    try {
      const pending = await fetch(`${desk.url}/desk/claim?schedule=0.0.77`);
      expect(pending.status).toBe(403);
      expect(await pending.json()).toMatchObject({ ok: false });

      views.set(
        "0.0.77",
        scheduleFromMirror({
          schedule_id: "0.0.77",
          deleted: false,
          executed_timestamp: "1789000000.000000001",
          wait_for_expiry: true,
        }),
      );
      const first = await fetch(
        `${desk.url}/desk/claim?schedule=0.0.77&protocols=aave-v3-ethereum`,
      );
      expect(first.status).toBe(200);
      const snap = (await first.json()) as { ok?: boolean; units?: number };
      expect(snap.ok).toBe(true);
      expect(snap.units).toBe(1);
      expect(ledger.bills).toHaveLength(1);
      expect(ledger.bills[0]?.scheduleId).toBe("0.0.77");
      expect(ledger.bills[0]?.tinybars).toBe("100000");

      const replay = await fetch(`${desk.url}/desk/claim?schedule=0.0.77`);
      expect(replay.status).toBe(403);
      expect(ledger.bills).toHaveLength(1);
    } finally {
      await desk.close();
    }
  });
});
