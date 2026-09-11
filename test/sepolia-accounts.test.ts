import { describe, expect, it } from "vitest";
import { parseSepoliaPrivateKey } from "../src/modules/directory/sepolia-accounts.ts";

const KEY = `0x${"ab".repeat(32)}` as const;

describe("Sepolia private key env parsing", () => {
  it("takes the first 32-byte hex token and ignores trailing comments", () => {
    expect(parseSepoliaPrivateKey(`${KEY} //funded sepolia account`)).toBe(KEY);
    expect(parseSepoliaPrivateKey(`'${KEY}'`)).toBe(KEY);
    expect(parseSepoliaPrivateKey(`"${KEY}"`)).toBe(KEY);
  });

  it("rejects a value that is not a 32-byte hex key", () => {
    expect(() => parseSepoliaPrivateKey("not-a-key")).toThrow(/32-byte hex private key/);
  });
});
