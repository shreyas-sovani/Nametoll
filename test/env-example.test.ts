import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const REQUIRED_NAMES = [
  "PORT",
  "PUBLIC_DESK_URL",
  "X402_NETWORK",
  "FACILITATOR_URL",
  "HEDERA_SELLER_ACCOUNT_ID",
  "HEDERA_BUYER_ACCOUNT_ID",
  "HEDERA_BUYER_PRIVATE_KEY",
  "HEDERA_BUYER_KEY_PATH",
  "CRE_SECRETS_PATH",
  "PRICE_TINYBARS",
];

describe(".env.example", () => {
  it("lists required names without values", () => {
    const text = readFileSync(resolve(process.cwd(), ".env.example"), "utf8");

    for (const name of REQUIRED_NAMES) {
      expect(text, `missing ${name}`).toMatch(new RegExp(`^${name}=$`, "m"));
    }

    expect(text).not.toMatch(/0x[0-9a-fA-F]{16,}/);
    expect(text).not.toMatch(/0\.0\.\d+/);
  });
});
