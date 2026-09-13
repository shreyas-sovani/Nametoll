import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LENDING_RISK_QUERY } from "../src/modules/merchandise/index.ts";
import { PINNED_PROTOCOLS } from "../src/modules/merchandise/deployments.ts";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function skillNames(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => existsSync(resolve(dir, entry.name, "SKILL.md")))
    .map((entry) => entry.name);
}

describe("merchandise and policy invariants", () => {
  it("composes Aave + Compound and does not ship a Graph prize SKILL", () => {
    expect(PINNED_PROTOCOLS).toHaveLength(2);
    expect(LENDING_RISK_QUERY).toMatch(/lendingProtocols/);

    const names = [
      ...skillNames(resolve(root, ".agents/skills")),
      ...skillNames(resolve(root, ".cursor/skills")),
      ...skillNames(resolve(root, "skills")),
    ];
    expect(names.some((name) => /nametoll.*graph|graph.*nametoll|lending-risk/i.test(name))).toBe(
      false,
    );
    expect(names).toContain("subgraph-dev");
  });

  it("does not depend on World IDKit", () => {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps["@worldcoin/idkit"]).toBeUndefined();
  });

  it("keeps TEE simulate logs in the repo", () => {
    for (const file of [
      "docs/partners/chainlink/simulate-allow.log",
      "docs/partners/chainlink/simulate-deny.log",
      "docs/partners/chainlink/simulate-join.log",
      "docs/partners/chainlink/simulate-allowlist-deny.log",
      "docs/partners/chainlink/simulate-rate-deny.log",
    ]) {
      const log = readFileSync(resolve(root, file), "utf8");
      expect(log).toMatch(/TEE Execution|handlerInTee|TeeRuntime/i);
    }
  });
});
