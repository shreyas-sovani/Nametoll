import { describe, expect, it } from "vitest";
import { childName } from "../src/modules/directory/parent-name.ts";
import {
  computeOwnedResolverAddress,
  defaultOwnedResolverSalt,
} from "../src/modules/directory/ensv2-sepolia.ts";
import { issueSubnamePlan } from "../src/modules/directory/issue-subname.ts";

const OWNER = "0x1111111111111111111111111111111111111111" as const;
const DEPLOYER = "0x2222222222222222222222222222222222222222" as const;

describe("second desk subname", () => {
  it("derives a second Permissioned Resolver from salt index 1", () => {
    expect(defaultOwnedResolverSalt(OWNER, 1n)).not.toBe(defaultOwnedResolverSalt(OWNER, 0n));
    expect(
      computeOwnedResolverAddress({ deployer: DEPLOYER, owner: OWNER, index: 1n }),
    ).not.toBe(computeOwnedResolverAddress({ deployer: DEPLOYER, owner: OWNER }));
  });

  it("names a sibling agent under the parent, not a hardcoded desk", () => {
    expect(childName("nametoll.eth", "agent-02")).toBe("agent-02.nametoll.eth");
  });

  it("emits an unsigned issue plan: own resolver, child register, scoped EAC", () => {
    const plan = issueSubnamePlan({
      owner: OWNER,
      operator: DEPLOYER,
      parent: "example-parent.test",
      label: "agent-02",
      endpoint: "https://desk.example",
      payTo: "0.0.1",
      priceRule: "100000 tinybars per protocol",
      hcsTopic: "0.0.2",
    });
    const joined = plan.steps.map((step) => `${step.title} ${step.command} ${step.note ?? ""}`).join("\n");
    expect(plan.broadcast).toBe(false);
    expect(joined).toMatch(/agent-02\.example-parent\.test/);
    expect(joined).toMatch(/Permissioned Resolver/);
    expect(joined).toMatch(/authorizeTextRoles/);
    expect(joined).toMatch(/agent-context/);
    expect(joined).not.toMatch(/reverse-record/);
    expect(plan.steps.some((step) => /transfer/i.test(step.note ?? ""))).toBe(true);
  });

  it("refuses to invent a parent or child label", () => {
    expect(() =>
      issueSubnamePlan({
        owner: OWNER,
        operator: DEPLOYER,
        parent: "",
        label: "agent-02",
        endpoint: "https://desk.example",
        payTo: "0.0.1",
        priceRule: "1",
        hcsTopic: "0.0.2",
      }),
    ).toThrow(/parent/i);
  });
});
