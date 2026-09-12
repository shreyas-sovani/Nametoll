import { describe, expect, it } from "vitest";
import { YEAR_SECONDS, V2Status } from "../src/modules/directory/ensv2-sepolia.ts";
import {
  MAX_EXPIRES_IN,
  MIN_EXPIRES_IN,
  isLiveRegistration,
  parseExpiresIn,
} from "../src/modules/directory/expiry.ts";
import { constrainedDeskRecords } from "../src/modules/directory/register.ts";
import { testDeskConfig, startDesk } from "./helpers.ts";

const NOW = 1_780_000_000n;

describe("bounded child expiry", () => {
  it("defaults to one year", () => {
    expect(parseExpiresIn(undefined)).toBe(YEAR_SECONDS);
    expect(parseExpiresIn("")).toBe(YEAR_SECONDS);
  });

  it("accepts seconds-from-now inside the bound", () => {
    expect(parseExpiresIn(90)).toBe(90n);
    expect(parseExpiresIn("120")).toBe(120n);
  });

  it("rejects a duration below the floor or above one year", () => {
    expect(() => parseExpiresIn(1, NOW)).toThrow(/expir/i);
    expect(() => parseExpiresIn(Number(YEAR_SECONDS) + 1, NOW)).toThrow(/expir/i);
    expect(MIN_EXPIRES_IN).toBe(60n);
    expect(MAX_EXPIRES_IN).toBe(YEAR_SECONDS);
  });

  it("treats REGISTERED+future as live and expired or AVAILABLE as dead", () => {
    expect(
      isLiveRegistration({ status: V2Status.REGISTERED, expiry: NOW + 10n }, NOW),
    ).toBe(true);
    expect(
      isLiveRegistration({ status: V2Status.REGISTERED, expiry: NOW }, NOW),
    ).toBe(false);
    expect(
      isLiveRegistration({ status: V2Status.AVAILABLE, expiry: NOW + 10n }, NOW),
    ).toBe(false);
  });
});

describe("constrained desk records carry a bounded expiry", () => {
  it("writes expires from expiresIn and ignores a judge-supplied price", () => {
    const records = constrainedDeskRecords(
      testDeskConfig({
        sellerAccountId: "0.0.10463755",
        hcsTopicId: "0.0.10464309",
        priceTinybars: "100000",
        publicDeskUrl: "https://desk.example",
        ensParent: "parent-fixture.test",
      }),
      { label: "gone", expiresIn: 90 },
    );
    expect(records.expiresIn).toBe(90n);
    expect(records.payTo).toBe("0.0.10463755");
  });
});

describe("POST /desk/register expiry", () => {
  it("forwards a bounded expires to issuance", async () => {
    const seen: Array<{ expiresIn?: bigint }> = [];
    const desk = await startDesk(
      {
        sellerAccountId: "0.0.10463755",
        hcsTopicId: "0.0.10464309",
        publicDeskUrl: "https://desk.example",
        ensParent: "parent-fixture.test",
      },
      undefined,
      {
        issueChild: async (records) => {
          seen.push(records);
          return {
            parent: records.parent,
            child: `${records.label}.${records.parent}`,
            resolver: "0x558283D5F8E36316B60be7e24F4e58C7133752D2",
            expiresIn: records.expiresIn.toString(),
          };
        },
      },
    );
    try {
      const res = await fetch(`${desk.url}/desk/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: "gone", expiresIn: 90 }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { expiresIn?: string };
      expect(seen[0]?.expiresIn).toBe(90n);
      expect(body.expiresIn).toBe("90");
    } finally {
      await desk.close();
    }
  });
});
