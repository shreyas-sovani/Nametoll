import { describe, expect, it } from "vitest";
import { HBAR_ASSET } from "../src/config.ts";
import { constrainedDeskRecords, type ConstrainedDeskRecords } from "../src/modules/directory/register.ts";
import { testDeskConfig, startDesk } from "./helpers.ts";

describe("constrained desk records", () => {
  it("writes this origin's price and payTo, and only lets label + endpoint vary", () => {
    const records = constrainedDeskRecords(
      testDeskConfig({
        sellerAccountId: "0.0.10463755",
        hcsTopicId: "0.0.10464309",
        priceTinybars: "100000",
        publicDeskUrl: "https://desk.example",
        ensParent: "parent-fixture.test",
      }),
      {
        label: "guest-01",
        endpoint: "https://other.example",
        payTo: "0.0.1",
        priceRule: "1 tinybar",
      },
    );
    expect(records.label).toBe("guest-01");
    expect(records.endpoint).toBe("https://other.example");
    expect(records.payTo).toBe("0.0.10463755");
    expect(records.priceRule).toBe("100000 tinybars per protocol");
    expect(records.hcsTopic).toBe("0.0.10464309");
    expect(records.asset).toBe(HBAR_ASSET);
    expect(records.parent).toBe("parent-fixture.test");
  });

  it("rejects a dotted or empty label", () => {
    const config = testDeskConfig({
      sellerAccountId: "0.0.1",
      hcsTopicId: "0.0.2",
      ensParent: "parent-fixture.test",
      publicDeskUrl: "https://desk.example",
    });
    expect(() => constrainedDeskRecords(config, { label: "a.b" })).toThrow(/label/i);
    expect(() => constrainedDeskRecords(config, { label: "" })).toThrow(/label/i);
  });
});

describe("POST /desk/register", () => {
  it("issues a child with constrained records and ignores a lying price", async () => {
    const seen: ConstrainedDeskRecords[] = [];
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
          };
        },
      },
    );
    try {
      const res = await fetch(`${desk.url}/desk/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: "guest-01",
          endpoint: "https://other.example",
          payTo: "0.0.1",
          priceRule: "free",
        }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { ok?: boolean; child?: string };
      expect(body.ok).toBe(true);
      expect(body.child).toBe("guest-01.parent-fixture.test");
      expect(seen).toHaveLength(1);
      expect(seen[0]?.payTo).toBe("0.0.10463755");
      expect(seen[0]?.priceRule).toMatch(/100000/);
      expect(seen[0]?.endpoint).toBe("https://other.example");
    } finally {
      await desk.close();
    }
  });
});
