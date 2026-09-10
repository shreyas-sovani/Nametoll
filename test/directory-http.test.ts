import { describe, expect, it } from "vitest";
import { HBAR_ASSET } from "../src/config.ts";
import { createDirectory, DESK_TEXT_KEYS } from "../src/modules/directory/index.ts";
import { startDesk } from "./helpers.ts";

const FIXTURE_NAME = "desk-fixture.test";

const TEXTS = {
  [DESK_TEXT_KEYS.agentEndpointWeb]: "https://resolved.example",
  [DESK_TEXT_KEYS.agentContext]: JSON.stringify({
    payTo: "0.0.10463755",
    priceRule: "100000 tinybars per protocol",
    hcsTopic: "0.0.10464309",
    asset: HBAR_ASSET,
  }),
};

describe("GET /desk/resolve", () => {
  it("requires a name query", async () => {
    const desk = await startDesk();
    try {
      const res = await fetch(`${desk.url}/desk/resolve`);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error?: string };
      expect(body.error).toMatch(/name/i);
    } finally {
      await desk.close();
    }
  });

  it("returns 404 for an unknown name", async () => {
    const desk = await startDesk(
      {},
      undefined,
      {
        directory: createDirectory({ fetchTexts: async () => ({}) }),
      },
    );
    try {
      const res = await fetch(
        `${desk.url}/desk/resolve?name=${encodeURIComponent(FIXTURE_NAME)}`,
      );
      expect(res.status).toBe(404);
      const body = (await res.json()) as { ok?: boolean; error?: string };
      expect(body.ok).toBe(false);
      expect(body.error).toMatch(/unknown|no desk/i);
    } finally {
      await desk.close();
    }
  });

  it("returns the descriptor for a pasted name", async () => {
    const desk = await startDesk(
      {},
      undefined,
      {
        directory: createDirectory({
          fetchTexts: async (name) => {
            expect(name).toBe(FIXTURE_NAME);
            return TEXTS;
          },
        }),
      },
    );
    try {
      const res = await fetch(
        `${desk.url}/desk/resolve?name=${encodeURIComponent(FIXTURE_NAME)}`,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        ok?: boolean;
        name?: string;
        descriptor?: { endpoint?: string; payTo?: string; asset?: string };
      };
      expect(body.ok).toBe(true);
      expect(body.name).toBe(FIXTURE_NAME);
      expect(body.descriptor).toEqual({
        endpoint: "https://resolved.example",
        payTo: "0.0.10463755",
        priceRule: "100000 tinybars per protocol",
        hcsTopic: "0.0.10464309",
        asset: HBAR_ASSET,
      });
    } finally {
      await desk.close();
    }
  });
});
