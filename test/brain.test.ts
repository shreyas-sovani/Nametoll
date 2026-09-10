import { describe, expect, it } from "vitest";
import { createBrain } from "../src/modules/brain/index.ts";
import { decideSpend } from "../src/modules/brain/verdict.ts";
import { parseCreSimulateVerdict } from "../src/modules/brain/simulate.ts";

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
