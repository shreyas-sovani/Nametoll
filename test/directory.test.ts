import { describe, expect, it } from "vitest";
import { HBAR_ASSET } from "../src/config.ts";
import {
  DESK_TEXT_KEYS,
  descriptorFromTexts,
  createDirectory,
  textsFromOmnigraph,
} from "../src/modules/directory/index.ts";
import { fetchTextsFromEnsCli } from "../src/modules/directory/enscli-texts.ts";
import type { DeskDescriptor } from "../src/types.ts";

const FIXTURE_NAME = "desk-fixture.test";

function fixtureDescriptor(endpoint = "https://desk.example/pay"): DeskDescriptor {
  return {
    endpoint,
    payTo: "0.0.10463755",
    priceRule: "100000 tinybars per protocol",
    hcsTopic: "0.0.10464309",
    asset: HBAR_ASSET,
  };
}

function fixtureTexts(endpoint = "https://desk.example/pay"): Record<string, string> {
  const descriptor = fixtureDescriptor(endpoint);
  return {
    [DESK_TEXT_KEYS.agentEndpointWeb]: descriptor.endpoint,
    [DESK_TEXT_KEYS.url]: "https://ignored-fallback.example",
    [DESK_TEXT_KEYS.agentContext]: JSON.stringify({
      payTo: descriptor.payTo,
      priceRule: descriptor.priceRule,
      hcsTopic: descriptor.hcsTopic,
      asset: descriptor.asset,
    }),
  };
}

describe("directory descriptor", () => {
  it("uses only ENSIP-5 and ENSIP-26 keys", () => {
    expect(DESK_TEXT_KEYS.url).toBe("url");
    expect(DESK_TEXT_KEYS.agentContext).toBe("agent-context");
    expect(DESK_TEXT_KEYS.agentEndpointWeb).toBe("agent-endpoint[web]");
  });

  it("builds a desk descriptor from documented text records", () => {
    expect(descriptorFromTexts(fixtureTexts())).toEqual(fixtureDescriptor());
  });

  it("falls back to the ENSIP-5 url key when agent-endpoint[web] is empty", () => {
    const texts = fixtureTexts();
    delete texts[DESK_TEXT_KEYS.agentEndpointWeb];
    texts[DESK_TEXT_KEYS.url] = "https://from-url.example";
    expect(descriptorFromTexts(texts).endpoint).toBe("https://from-url.example");
  });

  it("reads endpoint from agent-context when no url keys are set", () => {
    const texts = {
      [DESK_TEXT_KEYS.agentContext]: JSON.stringify({
        ...fixtureDescriptor("https://from-context.example"),
      }),
    };
    expect(descriptorFromTexts(texts).endpoint).toBe("https://from-context.example");
  });

  it("rejects a missing or non-HBAR asset", () => {
    const texts = fixtureTexts();
    texts[DESK_TEXT_KEYS.agentContext] = JSON.stringify({
      payTo: "0.0.1",
      priceRule: "1",
      hcsTopic: "0.0.2",
      asset: "0.0.429274",
    });
    expect(() => descriptorFromTexts(texts)).toThrow(/0\.0\.0/);
  });
});

describe("directory resolve", () => {
  it("fails an unknown name", async () => {
    const directory = createDirectory({
      fetchTexts: async () => ({}),
    });
    await expect(directory.resolve(FIXTURE_NAME)).rejects.toThrow(/unknown|not found|no desk/i);
  });

  it("returns the descriptor for a name the caller supplied", async () => {
    const directory = createDirectory({
      fetchTexts: async (name) => {
        expect(name).toBe(FIXTURE_NAME);
        return fixtureTexts();
      },
    });
    const resolved = await directory.resolve(FIXTURE_NAME);
    expect(resolved.name).toBe(FIXTURE_NAME);
    expect(resolved.descriptor).toEqual(fixtureDescriptor());
  });

  it("reads documented text keys out of an Omnigraph payload", () => {
    expect(
      textsFromOmnigraph({
        data: {
          domain: {
            resolve: {
              records: {
                texts: [
                  { key: "url", value: "https://from-url.example" },
                  { key: "agent-endpoint[web]", value: "https://desk.example/pay" },
                  { key: "agent-context", value: "{}" },
                  { key: "avatar", value: "ignored" },
                ],
              },
            },
          },
        },
      }),
    ).toEqual({
      url: "https://from-url.example",
      "agent-endpoint[web]": "https://desk.example/pay",
      "agent-context": "{}",
    });
  });

  it("asks ens-cli for each documented text key on Sepolia", async () => {
    const keys: string[] = [];
    const texts = await fetchTextsFromEnsCli(FIXTURE_NAME, async (args) => {
      expect(args).toContain("--chain");
      expect(args).toContain("sepolia");
      expect(args).toContain("--json");
      const key = args[args.indexOf("--key") + 1] ?? "";
      keys.push(key);
      return { key, value: key === "url" ? "https://from-cli.example" : null };
    });
    expect(keys).toEqual(["url", "agent-context", "agent-endpoint[web]"]);
    expect(texts).toEqual({ url: "https://from-cli.example" });
  });

  it("falls back to ens get text when Omnigraph transport fails", async () => {
    const directory = createDirectory({
      fallbackFetchTexts: async (name) => {
        expect(name).toBe(FIXTURE_NAME);
        return fixtureTexts();
      },
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      throw new Error("fetch failed");
    };
    try {
      const resolved = await directory.resolve(FIXTURE_NAME);
      expect(resolved.descriptor.endpoint).toBe("https://desk.example/pay");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects an empty name before any fetch", async () => {
    let fetched = false;
    const directory = createDirectory({
      fetchTexts: async () => {
        fetched = true;
        return fixtureTexts();
      },
    });
    await expect(directory.resolve("  ")).rejects.toThrow(/name/i);
    expect(fetched).toBe(false);
  });
});
