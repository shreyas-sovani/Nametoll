import { describe, expect, it } from "vitest";
import { HBAR_ASSET } from "../src/config.ts";
import {
  CIRCLE_USDC_TESTNET,
  classifyHtsProbe,
  readFacilitatorKinds,
} from "../src/modules/ledger/hts-probe.ts";
import { tollTokenPlan } from "../src/modules/ledger/toll.ts";
import { startDesk, testDeskConfig } from "./helpers.ts";

describe("hts probe", () => {
  it("does not invent assets when /supported only names Hedera exact", () => {
    const kinds = readFacilitatorKinds({
      kinds: [
        {
          x402Version: 2,
          scheme: "exact",
          network: "hedera:testnet",
          extra: { feePayer: "0.0.7162784" },
        },
      ],
    });
    expect(kinds.hederaExact).toBe(true);
    expect(kinds.feePayer).toBe("0.0.7162784");
    expect(kinds.advertisedAssets).toEqual([]);
    expect(
      classifyHtsProbe({ advertisedAssets: kinds.advertisedAssets }).blocky402Hts,
    ).toBe("unadvertised");
    expect(CIRCLE_USDC_TESTNET).toBe("0.0.429274");
  });

  it("records a rejected HTS verify without flipping the snapshot asset", () => {
    const probe = classifyHtsProbe({
      advertisedAssets: [],
      verifyError: "unsupported asset",
    });
    expect(probe.blocky402Hts).toBe("rejected");
    expect(probe.keepHbarSnapshot).toBe(true);
  });
});

describe("toll token plan", () => {
  it("pins a custom fixed HBAR fee to the seller", () => {
    const plan = tollTokenPlan({
      treasury: "0.0.20",
      collector: "0.0.20",
      feeTinybars: "100000",
    });
    expect(plan.symbol).toBe("TOLL");
    expect(plan.decimals).toBe(0);
    expect(plan.collectorsExempt).toBe(true);
    expect(plan.customFees).toEqual([
      {
        type: "fixed",
        collector: "0.0.20",
        hbarTinybars: "100000",
      },
    ]);
  });
});

describe("hts http", () => {
  it("publishes the token plan and keeps offer asset at 0.0.0", async () => {
    const desk = await startDesk(
      { htsTokenId: "0.0.888" },
      testDeskConfig({ sellerAccountId: "0.0.20" }),
    );
    try {
      const hts = await fetch(`${desk.url}/desk/hts`);
      expect(hts.status).toBe(200);
      const body = (await hts.json()) as {
        ok?: boolean;
        token?: { symbol?: string; customFees?: unknown[] };
        tokenId?: string;
        blocky402Hts?: string;
        keepHbarSnapshot?: boolean;
      };
      expect(body.ok).toBe(true);
      expect(body.tokenId).toBe("0.0.888");
      expect(body.token?.symbol).toBe("TOLL");
      expect(body.keepHbarSnapshot).toBe(true);

      const offer = await fetch(`${desk.url}/desk/offer`).then(
        (res) => res.json() as Promise<{ asset?: string }>,
      );
      expect(offer.asset).toBe(HBAR_ASSET);
    } finally {
      await desk.close();
    }
  });
});
