import {
  AccountId,
  Client,
  PrivateKey,
  TopicMessageSubmitTransaction,
} from "@hiero-ledger/sdk";
import type { AppConfig } from "../../config.ts";
import type { Bill } from "../../types.ts";
import {
  billFromMirrorMessage,
  encodeBillPayload,
  type Ledger,
  type MirrorTopicMessage,
} from "./index.ts";

function hederaClient(config: AppConfig): Client {
  if (!config.sellerAccountId || !config.sellerPrivateKey) {
    throw new Error("HCS ledger needs HEDERA_SELLER_ACCOUNT_ID and HEDERA_SELLER_PRIVATE_KEY.");
  }
  const client =
    config.network === "hedera:mainnet" ? Client.forMainnet() : Client.forTestnet();
  return client.setOperator(
    AccountId.fromString(config.sellerAccountId),
    PrivateKey.fromStringECDSA(config.sellerPrivateKey),
  );
}

export function createHcsLedger(config: AppConfig): Ledger & { close(): void } {
  const topicId = config.hcsTopicId;
  if (!topicId) {
    throw new Error("HCS ledger needs HCS_TOPIC_ID.");
  }

  const client = hederaClient(config);
  const local: Bill[] = [];

  return {
    topicId,
    async append(draft) {
      const response = await new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(encodeBillPayload(draft))
        .execute(client);
      const record = await response.getRecord(client);
      const bill: Bill = {
        ...draft,
        consensusTime: record.consensusTimestamp.toString(),
      };
      local.push(bill);
      return bill;
    },
    async list() {
      const url = `${config.mirrorNodeUrl.replace(/\/+$/, "")}/api/v1/topics/${topicId}/messages?limit=25&order=desc`;
      try {
        const res = await fetch(url);
        if (!res.ok) return [...local];
        const body = (await res.json()) as { messages?: MirrorTopicMessage[] };
        const bills = (body.messages ?? [])
          .map(billFromMirrorMessage)
          .filter((bill): bill is Bill => Boolean(bill));
        return bills.length > 0 ? bills : [...local];
      } catch {
        return [...local];
      }
    },
    close() {
      client.close();
    },
  };
}
