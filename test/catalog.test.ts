import { describe, expect, it } from "vitest";
import { HBAR_ASSET } from "../src/config.ts";
import {
  createDirectory,
  DESK_TEXT_KEYS,
  listDesks,
  metaFromOmnigraph,
  pickDesk,
} from "../src/modules/directory/index.ts";
import { startDesk } from "./helpers.ts";

const PARENT = "parent-fixture.test";
const CHEAP = "cheap.parent-fixture.test";
const DEAR = "dear.parent-fixture.test";
const BARE = "bare.parent-fixture.test";

function texts(endpoint: string, priceRule: string): Record<string, string> {
  return {
    [DESK_TEXT_KEYS.agentEndpointWeb]: endpoint,
    [DESK_TEXT_KEYS.agentContext]: JSON.stringify({
      payTo: "0.0.10463755",
      priceRule,
      hcsTopic: "0.0.10464309",
      asset: HBAR_ASSET,
    }),
  };
}

describe("omnigraph children", () => {
  it("reads child names already selected by DESK_RECORDS_QUERY", () => {
    expect(
      metaFromOmnigraph({
        data: {
          domain: {
            canonical: { name: { interpreted: PARENT } },
            subdomains: {
              edges: [
                { node: { canonical: { name: { interpreted: CHEAP } } } },
                { node: { canonical: { name: { interpreted: DEAR } } } },
              ],
            },
          },
        },
      }).children,
    ).toEqual([CHEAP, DEAR]);
  });
});

describe("listDesks", () => {
  it("resolves each child into a live catalog row", async () => {
    const directory = createDirectory({
      fetchTexts: async (name) => {
        if (name === CHEAP) return texts("https://cheap.example", "100000 tinybars per protocol");
        if (name === DEAR) return texts("https://dear.example", "200000 tinybars per protocol");
        return {};
      },
    });
    const catalog = await listDesks(PARENT, {
      directory,
      listChildren: async (name) => {
        expect(name).toBe(PARENT);
        return [CHEAP, DEAR, BARE];
      },
      probe: async (endpoint) => {
        if (endpoint.startsWith("https://cheap.example")) {
          return { reachable: true, protocols: ["aave-v3-ethereum"] };
        }
        if (endpoint.startsWith("https://dear.example")) {
          return { reachable: true, protocols: ["compound-v3-ethereum"] };
        }
        return { reachable: false };
      },
    });
    expect(catalog.parent).toBe(PARENT);
    expect(catalog.desks).toEqual([
      {
        name: CHEAP,
        status: "live",
        priceRule: "100000 tinybars per protocol",
        priceTinybars: "100000",
        endpoint: "https://cheap.example",
        payTo: "0.0.10463755",
        hcsTopic: "0.0.10464309",
        asset: HBAR_ASSET,
        protocols: ["aave-v3-ethereum"],
      },
      {
        name: DEAR,
        status: "live",
        priceRule: "200000 tinybars per protocol",
        priceTinybars: "200000",
        endpoint: "https://dear.example",
        payTo: "0.0.10463755",
        hcsTopic: "0.0.10464309",
        asset: HBAR_ASSET,
        protocols: ["compound-v3-ethereum"],
      },
      { name: BARE, status: "unresolved" },
    ]);
  });
});

describe("pickDesk", () => {
  it("picks the cheapest live desk that covers the requested protocols", () => {
    const picked = pickDesk(
      [
        {
          name: DEAR,
          status: "live",
          priceTinybars: "200000",
          protocols: ["aave-v3-ethereum"],
        },
        {
          name: CHEAP,
          status: "live",
          priceTinybars: "100000",
          protocols: ["aave-v3-ethereum"],
        },
        { name: BARE, status: "unresolved" },
      ],
      { protocols: ["aave-v3-ethereum"] },
    );
    expect(picked?.name).toBe(CHEAP);
  });
});

describe("GET /desk/catalog and /desks", () => {
  it("lists children of a pasted parent and serves the registry page", async () => {
    const directory = createDirectory({
      fetchTexts: async (name) => {
        if (name === CHEAP) return texts("https://cheap.example", "100000 tinybars per protocol");
        return {};
      },
    });
    const desk = await startDesk(
      {},
      undefined,
      {
        directory,
        listChildren: async (name) => {
          expect(name).toBe(PARENT);
          return [CHEAP];
        },
        probeDesk: async () => ({ reachable: true, protocols: ["aave-v3-ethereum"] }),
      },
    );
    try {
      const api = await fetch(
        `${desk.url}/desk/catalog?parent=${encodeURIComponent(PARENT)}`,
      );
      expect(api.status).toBe(200);
      const body = (await api.json()) as {
        ok?: boolean;
        parent?: string;
        desks?: Array<{ name?: string; status?: string }>;
      };
      expect(body.ok).toBe(true);
      expect(body.parent).toBe(PARENT);
      expect(body.desks?.[0]).toMatchObject({ name: CHEAP, status: "live" });

      const page = await fetch(`${desk.url}/desks`);
      expect(page.status).toBe(200);
      const html = await page.text();
      expect(html).toMatch(/Nametoll/i);
      expect(html).toMatch(/href="\/desks"/);
      expect(html).toMatch(/id="desk-registry"/);
      expect(html).toMatch(/\/desk\/catalog/);
      expect(html.toLowerCase()).not.toMatch(/hackathon/);
    } finally {
      await desk.close();
    }
  });
});
