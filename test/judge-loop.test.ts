import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/http/createApp.ts";
import { withDefaultCreProject } from "../src/modules/brain/defaults.ts";
import { parseCreSimulateJoin } from "../src/modules/brain/simulate.ts";
import { auditBill } from "../src/modules/ledger/audit.ts";
import { viewMerchandise } from "../src/modules/merchandise/view.ts";
import { publicDeskConfig, startDesk, testDeskConfig } from "./helpers.ts";
import type { Brain } from "../src/modules/brain/index.ts";
import { createMemoryLedger } from "../src/modules/ledger/index.ts";
import { startFakeFacilitator } from "./helpers.ts";
import { createDirectory, DESK_TEXT_KEYS } from "../src/modules/directory/index.ts";
import { HBAR_ASSET } from "../src/config.ts";
import { createBuyer } from "../src/modules/buyer/index.ts";
import { PrivateKey } from "@hiero-ledger/sdk";
import type { Server } from "node:http";

const JOIN_TO = "0x88574e7Cc0027afd04951daa09B64d4441931ba1";
const FIXTURE_NAME = "desk-fixture.test";

const joinBrain: Brain = {
  source: "injected",
  async decide() {
    return { allow: true, maxTinybars: "150000", reason: "under cap" };
  },
  async join() {
    return {
      action: "join",
      to: JOIN_TO,
      data: "0xb688a363",
      chainId: 11155111,
      chain: "ethereum-testnet-sepolia",
    };
  },
};

describe("judge loop gaps", () => {
  it("defaults CRE_PROJECT_DIR when cre/project.yaml is in the workspace", async () => {
    const root = await mkdtemp(join(tmpdir(), "nametoll-cre-default-"));
    await mkdir(join(root, "cre"));
    await writeFile(join(root, "cre", "project.yaml"), "staging-settings: {}\n");
    const withCre = withDefaultCreProject(testDeskConfig(), root);
    expect(withCre.creProjectDir).toBe(join(root, "cre"));
    const empty = await mkdtemp(join(tmpdir(), "nametoll-no-cre-"));
    expect(withDefaultCreProject(testDeskConfig(), empty).creProjectDir).toBeUndefined();
    expect(
      withDefaultCreProject(
        testDeskConfig({ creBrainUrl: "http://127.0.0.1:9/trigger" }),
        root,
      ).creProjectDir,
    ).toBeUndefined();
  });

  it("health tells a judge whether Brain and merchandise are actually wired", async () => {
    const desk = await startDesk({}, publicDeskConfig());
    try {
      const body = (await (await fetch(`${desk.url}/health`)).json()) as {
        brain?: { source?: string; configured?: boolean };
        merchandise?: string;
        canPay?: boolean;
      };
      expect(body.brain?.source).toBe("injected");
      expect(body.brain?.configured).toBe(true);
      expect(body.merchandise).toBe("stub");
      expect(body.canPay).toBe(false);
    } finally {
      await desk.close();
    }

    const app = await createApp(publicDeskConfig());
    const server = await new Promise<Server>((resolve, reject) => {
      const started = app.listen(0, "127.0.0.1", () => resolve(started));
      started.on("error", reject);
    });
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("expected TCP address");
      const body = (await (
        await fetch(`http://127.0.0.1:${address.port}/health`)
      ).json()) as { brain?: { source?: string; configured?: boolean } };
      expect(body.brain?.source).toBe("unavailable");
      expect(body.brain?.configured).toBe(false);
    } finally {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it("parses unsigned join() from a CRE simulate log without inventing a tx", () => {
    const log = `
Workflow Simulation Result:
"{\\"action\\":\\"join\\",\\"to\\":\\"${JOIN_TO}\\",\\"data\\":\\"0xb688a363\\",\\"chainId\\":11155111,\\"chain\\":\\"ethereum-testnet-sepolia\\"}"
`;
    expect(parseCreSimulateJoin(log)).toEqual({
      action: "join",
      to: JOIN_TO,
      data: "0xb688a363",
      chainId: 11155111,
      chain: "ethereum-testnet-sepolia",
    });
  });

  it("GET /desk/join returns TEE unsigned calldata and no broadcast tx", async () => {
    const desk = await startDesk({}, undefined, { brain: joinBrain });
    try {
      const res = await fetch(`${desk.url}/desk/join`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body.ok).toBe(true);
      expect(body.action).toBe("join");
      expect(body.to).toBe(JOIN_TO);
      expect(body.data).toBe("0xb688a363");
      expect(body.chainId).toBe(11155111);
      expect(body.txHash).toBeUndefined();
      expect(body.settleTx).toBeUndefined();
    } finally {
      await desk.close();
    }
  });

  it("audits each HCS bill with HashScan and units × price = tinybars", () => {
    const audited = auditBill(
      {
        requestId: "11111111-1111-4111-8111-111111111111",
        name: "lending-risk",
        units: 1,
        tinybars: "100000",
        settleTx: "0.0.1@1234567890.000000001",
        consensusTime: "1.0",
        prepaidTinybars: "200000",
        refundTinybars: "100000",
        refundTx: "0.0.1@1234567890.000000002",
      },
      "100000",
      "testnet",
    );
    expect(audited.hashscanUrl).toBe(
      "https://hashscan.io/testnet/tx/0.0.1@1234567890.000000001",
    );
    expect(audited.refundHashscanUrl).toBe(
      "https://hashscan.io/testnet/tx/0.0.1@1234567890.000000002",
    );
    expect(audited.recompute.matches).toBe(true);
    expect(audited.recompute.expectedTinybars).toBe("100000");
    expect(audited.recompute.refundMatches).toBe(true);
  });

  it("summarizes live merchandise so the blotter can show protocol rows, not only ok/stub", () => {
    const view = viewMerchandise({
      ok: true,
      units: 2,
      protocols: [
        {
          id: "aave-v3-ethereum",
          label: "Aave v3 Ethereum",
          ok: true,
          lendingProtocols: [{ totalValueLockedUSD: "24300000000" }],
        },
        {
          id: "compound-v3-ethereum",
          label: "Compound v3 Ethereum",
          ok: false,
          error: "indexer unavailable",
        },
      ],
    });
    expect(view.stub).toBe(false);
    expect(view.protocols[0]?.tvl).toBe("24300000000");
    expect(view.protocols[1]?.ok).toBe(false);
    expect(view.protocols[1]?.error).toMatch(/indexer unavailable/);
  });

  it("inspect includes a recompute preview a judge can check without Mirror Node", async () => {
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk({ facilitatorUrl: facilitator.url });
    try {
      const wired = await startDesk(
        { facilitatorUrl: facilitator.url },
        undefined,
        {
          directory: createDirectory({
            fetchTexts: async (name) => {
              if (name !== FIXTURE_NAME) return {};
              return {
                [DESK_TEXT_KEYS.agentEndpointWeb]: desk.url,
                [DESK_TEXT_KEYS.agentContext]: JSON.stringify({
                  payTo: "0.0.10463755",
                  priceRule: "100000 tinybars per protocol",
                  hcsTopic: "0.0.10464309",
                  asset: HBAR_ASSET,
                }),
              };
            },
          }),
        },
      );
      try {
        const res = await fetch(
          `${wired.url}/desk/inspect?name=${encodeURIComponent(FIXTURE_NAME)}&protocols=aave-v3-ethereum`,
        );
        const body = (await res.json()) as {
          recompute?: { expectedTinybars?: string; matches?: boolean; formula?: string };
        };
        expect(body.recompute?.expectedTinybars).toBe("100000");
        expect(body.recompute?.matches).toBe(true);
        expect(body.recompute?.formula).toMatch(/units \* priceTinybarsPerUnit = tinybars/i);
      } finally {
        await wired.close();
      }
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });

  it("paid blotter payload includes merchandise rows and an audited bill", async () => {
    const facilitator = await startFakeFacilitator();
    const ledger = createMemoryLedger("0.0.10464309");
    const desk = await startDesk(
      { facilitatorUrl: facilitator.url, hcsTopicId: "0.0.10464309" },
      undefined,
      {
        ledger,
        merchandise: {
          async snapshot() {
            return {
              ok: true,
              units: 1,
              protocols: [
                {
                  id: "aave-v3-ethereum",
                  label: "Aave v3 Ethereum",
                  ok: true,
                  lendingProtocols: [
                    {
                      id: "aave",
                      name: "Aave v3",
                      slug: "aave-v3",
                      network: "MAINNET",
                      schemaVersion: "3.1.0",
                      totalValueLockedUSD: "1000",
                      totalDepositBalanceUSD: "800",
                      totalBorrowBalanceUSD: "400",
                    },
                  ],
                },
              ],
            };
          },
        },
      },
    );
    try {
      const key = PrivateKey.generateECDSA();
      const wired = await startDesk(
        { facilitatorUrl: facilitator.url, hcsTopicId: "0.0.10464309" },
        undefined,
        {
          ledger,
          directory: createDirectory({
            fetchTexts: async (name) => {
              if (name !== FIXTURE_NAME) return {};
              return {
                [DESK_TEXT_KEYS.agentEndpointWeb]: desk.url,
                [DESK_TEXT_KEYS.agentContext]: JSON.stringify({
                  payTo: "0.0.10463755",
                  priceRule: "100000 tinybars per protocol",
                  hcsTopic: "0.0.10464309",
                  asset: HBAR_ASSET,
                }),
              };
            },
          }),
          buyer: createBuyer({
            accountId: "0.0.1",
            privateKey: `0x${key.toStringRaw()}`,
            network: "hedera:testnet",
          }),
        },
      );
      try {
        const res = await fetch(`${wired.url}/desk/pay`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: FIXTURE_NAME,
            protocols: ["aave-v3-ethereum"],
          }),
        });
        expect(res.status).toBe(200);
        const body = (await res.json()) as {
          merchandise?: { protocols?: Array<{ id?: string; tvl?: string }> };
          bill?: { recompute?: { matches?: boolean }; hashscanUrl?: string };
        };
        expect(body.merchandise?.protocols?.[0]?.id).toBe("aave-v3-ethereum");
        expect(body.merchandise?.protocols?.[0]?.tvl).toBe("1000");
        expect(body.bill?.recompute?.matches).toBe(true);
        expect(body.bill?.hashscanUrl).toMatch(/hashscan\.io\/testnet\/tx\//);
      } finally {
        await wired.close();
      }
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });

  it("blotter HTML has join + recompute stations a human can drive", async () => {
    const desk = await startDesk({}, publicDeskConfig());
    try {
      const html = await (await fetch(`${desk.url}/app`)).text();
      expect(html).toMatch(/id="station-join"/);
      expect(html).toMatch(/id="join-desk"/);
      expect(html).toMatch(/\/desk\/join/);
      expect(html).toMatch(/recompute/i);
      expect(html).toMatch(/id="station-snapshot"/);
    } finally {
      await desk.close();
    }
  });
});
