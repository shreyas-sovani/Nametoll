import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("README", () => {
  it("tells operators not to commit secrets", () => {
    const text = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
    expect(text.toLowerCase()).toMatch(/do not commit secrets/);
  });

  it("lists the HCS topic and recompute recipe", () => {
    const text = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
    expect(text).toMatch(/0\.0\.10464309/);
    expect(text).toMatch(/mirrornode\.hedera\.com/);
    expect(text).toMatch(/units \* priceTinybarsPerUnit = tinybars/);
  });
});
