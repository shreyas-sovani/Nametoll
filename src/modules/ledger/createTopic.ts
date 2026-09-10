import { existsSync } from "node:fs";
import {
  AccountId,
  Client,
  PrivateKey,
  TopicCreateTransaction,
} from "@hiero-ledger/sdk";
import { loadConfig } from "../../config.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const config = loadConfig();
if (!config.sellerAccountId || !config.sellerPrivateKey) {
  throw new Error("Set HEDERA_SELLER_ACCOUNT_ID and HEDERA_SELLER_PRIVATE_KEY to create the bill topic.");
}

const operatorKey = PrivateKey.fromStringECDSA(config.sellerPrivateKey);
const client =
  config.network === "hedera:mainnet" ? Client.forMainnet() : Client.forTestnet();
client.setOperator(AccountId.fromString(config.sellerAccountId), operatorKey);

try {
  const { topicId } = await (
    await new TopicCreateTransaction()
      .setTopicMemo("Nametoll bills")
      .setAdminKey(operatorKey)
      .setSubmitKey(operatorKey)
      .execute(client)
  ).getReceipt(client);

  if (!topicId) {
    throw new Error("Topic create returned no topic id");
  }

  console.log(`HCS_TOPIC_ID=${topicId.toString()}`);
  console.log(`HASHSCAN_TOPIC=https://hashscan.io/testnet/topic/${topicId.toString()}`);
} finally {
  client.close();
}
