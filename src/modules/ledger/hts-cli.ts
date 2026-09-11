import { existsSync } from "node:fs";
import { loadConfig } from "../../config.ts";
import { loadBuyerCredentials } from "../buyer/index.ts";
import { probeFacilitator } from "./hts-probe.ts";
import { hashscanTokenUrl, explorerNetwork } from "./hashscan.ts";
import { airdropToll, associateToll, createTollToken } from "./subscribe-live.ts";
import { tollTokenPlan } from "./toll.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const command = process.argv[2] ?? "probe";
const config = loadConfig();

if (command === "probe") {
  const probe = await probeFacilitator(config.facilitatorUrl);
  console.log(
    JSON.stringify(
      {
        ok: true,
        keepHbarSnapshot: probe.keepHbarSnapshot,
        blocky402Hts: probe.blocky402Hts,
        hederaExact: probe.hederaExact,
        advertisedAssets: probe.advertisedAssets,
        ...(probe.feePayer ? { feePayer: probe.feePayer } : {}),
        tokenId: config.htsTokenId,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (command === "plan") {
  if (!config.sellerAccountId) {
    throw new Error("HTS plan needs HEDERA_SELLER_ACCOUNT_ID.");
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        broadcast: false,
        keepHbarSnapshot: true,
        token: tollTokenPlan({
          treasury: config.sellerAccountId,
          collector: config.sellerAccountId,
          feeTinybars: config.priceTinybars,
        }),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (command === "create") {
  const created = await createTollToken(config);
  console.log(
    JSON.stringify(
      {
        ok: true,
        broadcast: true,
        ...created,
        env: `HTS_TOKEN_ID=${created.tokenId}`,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

if (command === "fund") {
  const tokenId = config.htsTokenId ?? process.argv[3];
  if (!tokenId) {
    throw new Error("Pass HTS_TOKEN_ID or `npm run hts -- fund <tokenId>`.");
  }
  const buyer = loadBuyerCredentials();
  const associateTx = await associateToll(config, tokenId, buyer.privateKey);
  const airdropTx = await airdropToll(config, tokenId, 8);
  console.log(
    JSON.stringify(
      {
        ok: true,
        tokenId,
        associateTx,
        airdropTx,
        hashscanUrl: hashscanTokenUrl(tokenId, explorerNetwork(config.network)),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

throw new Error("Usage: npm run hts -- probe|plan|create|fund [tokenId]");
