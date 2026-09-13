import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const text = readFileSync(resolve(process.cwd(), "README.md"), "utf8");

describe("README", () => {
  it("presents the live product, not a hackathon packet", () => {
    expect(text).toMatch(/nametoll\.run\.place/);
    expect(text).toMatch(/nametoll%20logo\.png|nametoll logo\.png/);
    expect(text).toMatch(/HTTP 402|HTTP \*\*402\*\*/);
    expect(text).toMatch(/metered units/);
    expect(text).not.toMatch(/metered bytes/);
    expect(text).not.toMatch(/Form picks/i);
    expect(text).not.toMatch(/Sunday form swap|B16/);
    expect(text).not.toMatch(/AI agents wrote/i);
    expect(text).not.toMatch(/do not commit secrets/i);
    expect(text).not.toMatch(/ETHOnline|hackathon/i);
    expect(text).not.toMatch(/docs\/(PRD|BACKLOG|analysis|submission|working-notes)/);
    expect(text).not.toMatch(/walkthrough\.md|learning\.md/);
    expect(text).not.toMatch(/hashscan\.io/);
  });

  it("lists the public bill topic and recompute recipe", () => {
    expect(text).toMatch(/0\.0\.10464309/);
    expect(text).toMatch(/mirrornode\.hedera\.com/);
    expect(text).toMatch(/units \* priceTinybarsPerUnit = tinybars/);
  });
});
