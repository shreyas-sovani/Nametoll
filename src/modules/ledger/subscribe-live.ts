import {
  AccountId,
  Client,
  CustomFixedFee,
  Hbar,
  PrivateKey,
  ScheduleCreateTransaction,
  Timestamp,
  TokenAssociateTransaction,
  TokenCreateTransaction,
  TokenId,
  TransferTransaction,
} from "@hiero-ledger/sdk";
import type { AppConfig } from "../../config.ts";
import { explorerNetwork, hashscanScheduleUrl, hashscanTokenUrl } from "./hashscan.ts";
import { subscribePlan, type SubscribePlan } from "./subscribe.ts";
import { tollTokenPlan, type TollTokenPlan } from "./toll.ts";

export type CreatedSchedule = {
  scheduleId: string;
  createTx: string;
  expireAt: string;
  hashscanUrl: string;
  memo: string;
};

export type CreatedToken = {
  tokenId: string;
  createTx: string;
  hashscanUrl: string;
  plan: TollTokenPlan;
};

function hederaClient(config: AppConfig, accountId: string, privateKey: string): Client {
  const client =
    config.network === "hedera:mainnet" ? Client.forMainnet() : Client.forTestnet();
  client.setOperator(AccountId.fromString(accountId), PrivateKey.fromStringECDSA(privateKey));
  return client;
}

export async function createTollToken(config: AppConfig): Promise<CreatedToken> {
  if (!config.sellerAccountId || !config.sellerPrivateKey) {
    throw new Error("HTS create needs HEDERA_SELLER_ACCOUNT_ID and HEDERA_SELLER_PRIVATE_KEY.");
  }
  const plan = tollTokenPlan({
    treasury: config.sellerAccountId,
    collector: config.sellerAccountId,
    feeTinybars: config.priceTinybars,
  });
  const seller = AccountId.fromString(config.sellerAccountId);
  const key = PrivateKey.fromStringECDSA(config.sellerPrivateKey);
  const client = hederaClient(config, config.sellerAccountId, config.sellerPrivateKey);
  try {
    const fee = new CustomFixedFee()
      .setFeeCollectorAccountId(seller)
      .setHbarAmount(Hbar.fromTinybars(plan.customFees[0]!.hbarTinybars))
      .setAllCollectorsAreExempt(plan.collectorsExempt);
    const response = await new TokenCreateTransaction()
      .setTokenName(plan.name)
      .setTokenSymbol(plan.symbol)
      .setDecimals(plan.decimals)
      .setInitialSupply(plan.initialSupply)
      .setTreasuryAccountId(seller)
      .setAdminKey(key.publicKey)
      .setSupplyKey(key.publicKey)
      .setCustomFees([fee])
      .execute(client);
    const receipt = await response.getReceipt(client);
    const tokenId = receipt.tokenId?.toString();
    if (!tokenId) {
      throw new Error("TokenCreate receipt did not include a token id.");
    }
    return {
      tokenId,
      createTx: response.transactionId.toString(),
      hashscanUrl: hashscanTokenUrl(tokenId, explorerNetwork(config.network)),
      plan,
    };
  } finally {
    client.close();
  }
}

export async function associateToll(
  config: AppConfig,
  tokenId: string,
  buyerPrivateKey: string,
): Promise<string> {
  if (!config.buyerAccountId) {
    throw new Error("Token associate needs HEDERA_BUYER_ACCOUNT_ID.");
  }
  const client = hederaClient(config, config.buyerAccountId, buyerPrivateKey);
  try {
    const response = await new TokenAssociateTransaction()
      .setAccountId(AccountId.fromString(config.buyerAccountId))
      .setTokenIds([TokenId.fromString(tokenId)])
      .execute(client);
    await response.getReceipt(client);
    return response.transactionId.toString();
  } finally {
    client.close();
  }
}

export async function airdropToll(
  config: AppConfig,
  tokenId: string,
  amount: number,
): Promise<string> {
  if (!config.sellerAccountId || !config.sellerPrivateKey || !config.buyerAccountId) {
    throw new Error("Toll airdrop needs seller and buyer account ids plus the seller key.");
  }
  const client = hederaClient(config, config.sellerAccountId, config.sellerPrivateKey);
  try {
    const token = TokenId.fromString(tokenId);
    const response = await new TransferTransaction()
      .addTokenTransfer(token, AccountId.fromString(config.sellerAccountId), -amount)
      .addTokenTransfer(token, AccountId.fromString(config.buyerAccountId), amount)
      .execute(client);
    await response.getReceipt(client);
    return response.transactionId.toString();
  } finally {
    client.close();
  }
}

export async function createSubscribeSchedules(
  config: AppConfig,
  plan: SubscribePlan,
  buyerPrivateKey: string,
): Promise<CreatedSchedule[]> {
  const client = hederaClient(config, plan.payer, buyerPrivateKey);
  const network = explorerNetwork(config.network);
  const created: CreatedSchedule[] = [];
  try {
    for (const slot of plan.slots) {
      const transfer = new TransferTransaction();
      if (plan.asset === "0.0.0") {
        const amount = Hbar.fromTinybars(slot.tinybars);
        transfer
          .addHbarTransfer(AccountId.fromString(plan.payer), amount.negated())
          .addHbarTransfer(AccountId.fromString(plan.payTo), amount);
      } else {
        const token = TokenId.fromString(plan.asset);
        const units = Number(slot.tokenAmount ?? "1");
        transfer
          .addTokenTransfer(token, AccountId.fromString(plan.payer), -units)
          .addTokenTransfer(token, AccountId.fromString(plan.payTo), units);
      }
      const response = await new ScheduleCreateTransaction()
        .setScheduledTransaction(transfer)
        .setWaitForExpiry(true)
        .setExpirationTime(Timestamp.fromDate(slot.expireAt))
        .setScheduleMemo(slot.memo)
        .setPayerAccountId(AccountId.fromString(plan.payer))
        .execute(client);
      const receipt = await response.getReceipt(client);
      const scheduleId = receipt.scheduleId?.toString();
      if (!scheduleId) {
        throw new Error("ScheduleCreate receipt did not include a schedule id.");
      }
      created.push({
        scheduleId,
        createTx: response.transactionId.toString(),
        expireAt: slot.expireAt,
        hashscanUrl: hashscanScheduleUrl(scheduleId, network),
        memo: slot.memo,
      });
    }
    return created;
  } finally {
    client.close();
  }
}

export function planFromConfig(
  config: AppConfig,
  slots: number,
  intervalSeconds: number,
  from = new Date(),
): SubscribePlan {
  if (!config.buyerAccountId || !config.sellerAccountId) {
    throw new Error("Subscribe needs HEDERA_BUYER_ACCOUNT_ID and HEDERA_SELLER_ACCOUNT_ID.");
  }
  return subscribePlan({
    slots,
    intervalSeconds,
    from,
    payer: config.buyerAccountId,
    payTo: config.sellerAccountId,
    tinybars: config.priceTinybars,
    ...(config.htsTokenId ? { tokenId: config.htsTokenId } : {}),
  });
}
