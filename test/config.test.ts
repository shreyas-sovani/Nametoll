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

  it("loads an HCS topic id when present", () => {
    const config = loadConfig({
      HCS_TOPIC_ID: "0.0.4603900",
      HEDERA_SELLER_ACCOUNT_ID: "0.0.9",
      HEDERA_SELLER_PRIVATE_KEY: "0xabc",
    });
    expect(config.hcsTopicId).toBe("0.0.4603900");
    expect(config.sellerPrivateKey).toBe("0xabc");
    expect(config.mirrorNodeUrl).toBe("https://testnet.mirrornode.hedera.com");
  });

  it("loads a Graph gateway key when present", () => {
    const config = loadConfig({
      GRAPH_GATEWAY_KEY: "test-key",
      GRAPH_GATEWAY_URL: "https://gateway.thegraph.com/api",
    });
    expect(config.graphGatewayKey).toBe("test-key");
    expect(config.graphGatewayUrl).toBe("https://gateway.thegraph.com/api");
  });

  it("defaults the CRE simulate target and accepts a brain URL", () => {
    expect(loadConfig({}).creTarget).toBe("staging-settings");
    const config = loadConfig({
      CRE_BRAIN_URL: "http://127.0.0.1:8080/trigger",
      CRE_PROJECT_DIR: "cre",
      CRE_WORKFLOW_NAME: "nametoll-brain",
      CRE_TARGET: "staging-settings",
    });
    expect(config.creBrainUrl).toBe("http://127.0.0.1:8080/trigger");
    expect(config.creProjectDir).toBe("cre");
    expect(config.creWorkflowName).toBe("nametoll-brain");
  });

  it("defaults the ENSv2 Omnigraph URL and accepts an override", () => {
    expect(loadConfig({}).ensnodeUrl).toBe("https://api.v2-sepolia.ensnode.io");
    expect(
      loadConfig({ ENSNODE_URL: "https://ensnode.example/api" }).ensnodeUrl,
    ).toBe("https://ensnode.example/api");
  });

  it("strips wrapping quotes from the Graph gateway key", () => {
    const config = loadConfig({
      GRAPH_GATEWAY_KEY: '"quoted-studio-key"',
    });
    expect(config.graphGatewayKey).toBe("quoted-studio-key");
  });

  it("refuses a topic without a seller key to submit bills", () => {
    expect(() =>
      loadConfig({
        HCS_TOPIC_ID: "0.0.4603900",
        HEDERA_SELLER_ACCOUNT_ID: "0.0.9",
      }),
    ).toThrow(/seller private key/i);
  });

  it("loads an optional desk pay secret without inventing one", () => {
    expect(loadConfig({}).deskPaySecret).toBeUndefined();
    expect(loadConfig({ DESK_PAY_SECRET: "blotter-lock" }).deskPaySecret).toBe(
      "blotter-lock",
    );
  });
});
