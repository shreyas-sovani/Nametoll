import { describe, expect, it } from "vitest";
import { publicDeskConfig, startDesk } from "./helpers.ts";
import { PINNED_PROTOCOLS } from "../src/modules/merchandise/deployments.ts";

describe("public desk page", () => {
  it("explains the pay desk without a baked-in name", async () => {
    const desk = await startDesk({}, publicDeskConfig());
    try {
      const res = await fetch(`${desk.url}/`);
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/text\/html/);
      const html = await res.text();
      expect(html).toMatch(/Nametoll/i);
      expect(html).toMatch(/\/desk\/snapshot/);
      expect(html).toMatch(/\/desk\/resolve/);
      expect(html).toMatch(/paste a name/i);
      expect(html).toMatch(/402/);
      expect(html.toLowerCase()).not.toMatch(/\.eth/);
    } finally {
      await desk.close();
    }
  });

  it("prints the HCS topic when configured", async () => {
    const desk = await startDesk({ hcsTopicId: "0.0.4603900" }, publicDeskConfig());
    try {
      const html = await (await fetch(`${desk.url}/`)).text();
      expect(html).toMatch(/0\.0\.4603900/);
      expect(html).toMatch(/\/desk\/ledger/);
    } finally {
      await desk.close();
    }
  });

  it("meters pinned protocol ids and HashScan URLs from config, not hardcoded testnet refunds", async () => {
    const desk = await startDesk(
      { network: "hedera:mainnet" },
      publicDeskConfig(),
    );
    try {
      const html = await (await fetch(`${desk.url}/app`)).text();
      expect(html).toMatch(new RegExp(PINNED_PROTOCOLS[0]!.id));
      expect(html).toMatch(new RegExp(PINNED_PROTOCOLS[1]!.id));
      expect(html).toMatch(/hashscan\.io\/mainnet/);
      expect(html).not.toMatch(/hashscan\.io\/testnet\/tx\/" \+ bill\.refundTx/);
    } finally {
      await desk.close();
    }
  });
});
