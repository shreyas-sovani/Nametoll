import { describe, expect, it } from "vitest";
import { writePlan } from "../src/modules/directory/write-plan.ts";

describe("ens write plan", () => {
  it("refuses to invent a parent name", () => {
    expect(() =>
      writePlan({
        owner: "0x1111111111111111111111111111111111111111",
        operator: "0x2222222222222222222222222222222222222222",
        endpoint: "https://desk.example",
        payTo: "0.0.1",
        priceRule: "100000 tinybars per protocol",
        hcsTopic: "0.0.2",
      }),
    ).toThrow(/parent/i);
  });

  it("emits unsigned ens-cli steps: resolver before register, no reverse-record", () => {
    const plan = writePlan({
      owner: "0x1111111111111111111111111111111111111111",
      operator: "0x2222222222222222222222222222222222222222",
      parent: "example-parent.test",
      child: "desk",
      endpoint: "https://desk.example",
      payTo: "0.0.1",
      priceRule: "100000 tinybars per protocol",
      hcsTopic: "0.0.2",
    });
    const joined = plan.steps.map((step) => step.command).join("\n");
    expect(plan.broadcast).toBe(false);
    expect(joined.indexOf("resolver deploy")).toBeLessThan(joined.indexOf("register commit"));
    expect(joined).toMatch(/--chain sepolia/);
    expect(joined).not.toMatch(/reverse-record/);
    expect(joined).toMatch(/subregistry deploy/);
    expect(joined).toMatch(/subname create/);
    expect(joined).toMatch(/agent-context/);
    expect(joined).toMatch(/agent-endpoint\[web\]/);
    expect(joined).toMatch(/authorizeTextRoles/);
    expect(plan.steps.some((step) => /transfer/i.test(step.note ?? ""))).toBe(true);
  });
});
