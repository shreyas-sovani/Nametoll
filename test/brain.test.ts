import { describe, expect, it } from "vitest";
import { createBrain, warmBrain } from "../src/modules/brain/index.ts";
import { decidePolicy, decideSpend, unavailableVerdict } from "../src/modules/brain/verdict.ts";
import { parseCreSimulateVerdict, runTimedCommand } from "../src/modules/brain/simulate.ts";

describe("brain verdict", () => {
  it("allows when requested tinybars are at or under the secret spend cap", () => {
    expect(decideSpend("100000", "150000")).toEqual({
      allow: true,
      maxTinybars: "150000",
      reason: "under cap",
    });
    expect(decideSpend("150000", "150000").allow).toBe(true);
  });

  it("denies when requested tinybars exceed the secret spend cap", () => {
    expect(decideSpend("200000", "150000")).toEqual({
      allow: false,
      maxTinybars: "150000",
      reason: "over cap",
    });
  });

  it("denies a missing or unreadable spend cap", () => {
    expect(decideSpend("100000", "").allow).toBe(false);
    expect(decideSpend("100000", "not-a-number").allow).toBe(false);
  });

  it("denies a payer missing from the secret allowlist", () => {
    expect(
      decidePolicy({
        requestedTinybars: "100000",
        spendCapTinybars: "150000",
        payer: "0.0.99",
        allowlist: "0.0.1,0.0.2",
      }),
    ).toEqual({
      allow: false,
      maxTinybars: "150000",
      reason: "buyer not allowlisted",
    });
  });

  it("denies when pays this hour meet the secret rate limit", () => {
    expect(
      decidePolicy({
        requestedTinybars: "100000",
        spendCapTinybars: "150000",
        payer: "0.0.1",
        allowlist: "0.0.1",
        paysThisHour: "3",
        rateLimit: "3",
      }),
    ).toEqual({
      allow: false,
      maxTinybars: "150000",
      reason: "rate limited",
    });
  });

  it("still returns over cap when allowlist and rate would allow", () => {
    expect(
      decidePolicy({
        requestedTinybars: "200000",
        spendCapTinybars: "150000",
        payer: "0.0.1",
        allowlist: "0.0.1",
        paysThisHour: "0",
        rateLimit: "8",
      }).reason,
    ).toBe("over cap");
  });

  it("ignores empty allowlist and rate secrets so cap-only still works", () => {
    expect(
      decidePolicy({
        requestedTinybars: "100000",
        spendCapTinybars: "150000",
        payer: "",
        allowlist: "",
        rateLimit: "",
      }).reason,
    ).toBe("under cap");
  });
});

describe("brain module", () => {
  it("returns the runner verdict and never puts a secret in the public reason", async () => {
    const brain = createBrain({
      ask: async () =>
        decideSpend("100000", "150000"),
    });
    const verdict = await brain.decide({ requestedTinybars: "100000" });
    expect(verdict.allow).toBe(true);
    expect(verdict.maxTinybars).toBe("150000");
    expect(verdict.reason).not.toMatch(/secret|token|key|0x[0-9a-f]{16,}/i);
  });

  it("fails closed when the TEE runner is missing", async () => {
    const brain = createBrain({});
    const verdict = await brain.decide({ requestedTinybars: "100000" });
    expect(verdict.allow).toBe(false);
    expect(verdict.reason).toMatch(/tee|brain|unavailable|skipped/i);
  });

  it("does not cache a thrown TEE failure so the next decide can recover", async () => {
    let calls = 0;
    const brain = createBrain({
      ask: async () => {
        calls += 1;
        if (calls === 1) throw new Error("cre not logged in");
        return decideSpend("100000", "150000");
      },
    });
    const first = await brain.decide({ requestedTinybars: "100000" });
    expect(first.allow).toBe(false);
    expect(first.reason).toMatch(/unavailable/i);
    const second = await brain.decide({ requestedTinybars: "100000" });
    expect(second.allow).toBe(true);
    expect(second.reason).toBe("under cap");
    expect(calls).toBe(2);
  });

  it("does not cache an unavailable verdict returned by the runner", async () => {
    let calls = 0;
    const brain = createBrain({
      ask: async () => {
        calls += 1;
        return unavailableVerdict();
      },
    });
    await brain.decide({ requestedTinybars: "100000" });
    await brain.decide({ requestedTinybars: "100000" });
    expect(calls).toBe(2);
  });

  it("re-asks the TEE when the payer changes on the same amount", async () => {
    const payers: string[] = [];
    const brain = createBrain({
      ask: async (input) => {
        payers.push(input.payer ?? "");
        return decidePolicy({
          requestedTinybars: input.requestedTinybars,
          spendCapTinybars: "150000",
          ...(input.payer ? { payer: input.payer } : {}),
          allowlist: "0.0.1",
        });
      },
    });
    expect((await brain.decide({ requestedTinybars: "100000", payer: "0.0.1" })).allow).toBe(true);
    expect((await brain.decide({ requestedTinybars: "100000", payer: "0.0.2" })).reason).toBe(
      "buyer not allowlisted",
    );
    expect(payers).toEqual(["0.0.1", "0.0.2"]);
  });

  it("caches a successful TEE allow and a real over-cap deny", async () => {
    const calls: string[] = [];
    const brain = createBrain({
      ask: async ({ requestedTinybars }) => {
        calls.push(requestedTinybars);
        return decideSpend(requestedTinybars, "150000");
      },
    });
    expect((await brain.decide({ requestedTinybars: "100000" })).allow).toBe(true);
    expect((await brain.decide({ requestedTinybars: "100000" })).allow).toBe(true);
    expect((await brain.decide({ requestedTinybars: "200000" })).allow).toBe(false);
    expect((await brain.decide({ requestedTinybars: "200000" })).reason).toBe("over cap");
    expect(calls).toEqual(["100000", "200000"]);
  });

  it("expires a cached verdict after the TTL so a later decide re-asks the TEE", async () => {
    let now = 0;
    let calls = 0;
    const brain = createBrain({
      now: () => now,
      verdictTtlMs: 1_000,
      ask: async () => {
        calls += 1;
        return decideSpend("100000", "150000");
      },
    });
    await brain.decide({ requestedTinybars: "100000" });
    now = 999;
    await brain.decide({ requestedTinybars: "100000" });
    expect(calls).toBe(1);
    now = 1_000;
    await brain.decide({ requestedTinybars: "100000" });
    expect(calls).toBe(2);
  });

  it("warms 1-unit and 2-unit amounts so a later decide is a cache hit", async () => {
    const calls: string[] = [];
    const brain = createBrain({
      ask: async ({ requestedTinybars }) => {
        calls.push(requestedTinybars);
        return decideSpend(requestedTinybars, "150000");
      },
    });
    await warmBrain(brain, ["100000", "200000"]);
    expect(calls).toEqual(["100000", "200000"]);
    expect((await brain.decide({ requestedTinybars: "100000" })).allow).toBe(true);
    expect((await brain.decide({ requestedTinybars: "200000" })).allow).toBe(false);
    expect(calls).toEqual(["100000", "200000"]);
  });

  it("kills a hung cre child after the simulate timeout", async () => {
    const started = Date.now();
    await expect(
      runTimedCommand("sleep", ["30"], process.cwd(), 200),
    ).rejects.toThrow(/timed out/i);
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("parses a quoted CRE simulate result string", () => {
    const log = `
[SIMULATION] Running trigger trigger=http-trigger@1.0.0-alpha
[USER LOG] TEE handler: verdict=allow reason=under cap
Workflow Simulation Result:
"{\\"allow\\":true,\\"maxTinybars\\":\\"150000\\",\\"reason\\":\\"under cap\\"}"
`;
    expect(parseCreSimulateVerdict(log)).toEqual({
      allow: true,
      maxTinybars: "150000",
      reason: "under cap",
    });
  });

  it("parses a CRE simulate result into a public verdict", () => {
    const log = `
[SIMULATION] Running trigger trigger=http-trigger@1.0.0
[USER LOG] TEE handler: verdict computed
Workflow Simulation Result:
 {"allow":true,"maxTinybars":"150000","reason":"under cap"}
[SIMULATION] Execution finished signal received
`;
    expect(parseCreSimulateVerdict(log)).toEqual({
      allow: true,
      maxTinybars: "150000",
      reason: "under cap",
    });
  });
});
