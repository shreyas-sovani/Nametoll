import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LENDING_RISK_QUERY } from "../src/modules/merchandise/index.ts";
import { PINNED_PROTOCOLS } from "../src/modules/merchandise/deployments.ts";

const root = process.cwd();
const readme = readFileSync(resolve(root, "README.md"), "utf8");
const pack = readFileSync(resolve(root, "docs/submission.md"), "utf8");
const backlog = readFileSync(resolve(root, "docs/BACKLOG.md"), "utf8");
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

describe("B16 Sunday form swap", () => {
  it("writes the swap decision in the README before any form-line change", () => {
    const formLine = readme.match(/\*\*Form picks:\*\*[^\n]+/)?.[0] ?? "";
    const picks = formLine.split(/Not on the form/i)[0] ?? "";
    expect(picks).toMatch(
      /\*\*Form picks:\*\* \*\*Hedera\*\* · \*\*ENS\*\* · \*\*Chainlink\*\*/,
    );
    expect(picks).not.toMatch(/World/);
    expect(picks).not.toMatch(/Graph/);
    expect(formLine).toMatch(/Not on the form: World, The Graph/);

    expect(readme).toMatch(/Sunday form swap \(B16\)/i);
    expect(readme).toMatch(/no swap|does not swap|form stays/i);
    expect(readme).toMatch(/third slot stays Chainlink|stays Chainlink/i);
    expect(readme).toMatch(
      /This paragraph is the swap record|written while the form line/i,
    );
  });

  it("keeps Graph as merchandise: composition yes, Nametoll prize SKILL no", () => {
    expect(PINNED_PROTOCOLS).toHaveLength(2);
    expect(LENDING_RISK_QUERY).toMatch(/lendingProtocols/);
    expect(readme).toMatch(/Messari/);
    expect(readme).toMatch(/Aave/);
    expect(readme).toMatch(/Compound/);
    expect(readme).toMatch(/did not ship a Graph prize SKILL|no Nametoll Graph prize SKILL/i);

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

  it("does not pick World: Selfie flag is not on", () => {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps["@worldcoin/idkit"]).toBeUndefined();
    expect(readme).toMatch(/Selfie (Check )?flag was not on|Selfie flag is not on/i);
    expect(readme).toMatch(/not a form pick|off the form|not on the form/i);
    expect(pack).toMatch(/World/);
    expect(pack).not.toMatch(/form pick:\s*World/i);
  });

  it("keeps Chainlink because simulate logs exist", () => {
    for (const file of [
      "docs/partners/chainlink/simulate-allow.log",
      "docs/partners/chainlink/simulate-deny.log",
      "docs/partners/chainlink/simulate-join.log",
    ]) {
      const log = readFileSync(resolve(root, file), "utf8");
      expect(log).toMatch(/TEE Execution|handlerInTee|TeeRuntime/i);
    }
    expect(readme).toMatch(/simulate-allow\.log/);
    expect(backlog).toMatch(/\[x\] \*\*B16\*\*/);
    expect(backlog).not.toMatch(/\[ \] \*\*B16\*\*/);
  });
});
