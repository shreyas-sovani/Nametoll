import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.ts";

describe("desk config", () => {
  it("refuses to boot when a facilitator private key is present", () => {
    expect(() =>
      loadConfig({
        FACILITATOR_PRIVATE_KEY: "should-never-be-here",
      }),
    ).toThrow(/must not hold a facilitator private key/i);
  });

  it("exposes network, facilitator URL, and secrets paths", () => {
    const config = loadConfig({
      X402_NETWORK: "hedera:testnet",
      FACILITATOR_URL: "https://api.testnet.blocky402.com",
      CRE_SECRETS_PATH: "/run/secrets/cre",
      HEDERA_BUYER_KEY_PATH: "/run/secrets/buyer",
    });

    expect(config.network).toBe("hedera:testnet");
    expect(config.facilitatorUrl).toBe("https://api.testnet.blocky402.com");
    expect(config.secretsPaths.creSecretsPath).toBe("/run/secrets/cre");
    expect(config.secretsPaths.buyerKeyPath).toBe("/run/secrets/buyer");
  });

  it("does not invent a seller account id", () => {
    const config = loadConfig({});
    expect(config.sellerAccountId).toBeUndefined();
  });
});
