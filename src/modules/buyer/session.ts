import { randomUUID } from "node:crypto";
import {
  AccountCreateTransaction,
  AccountId,
  Client,
  PrivateKey,
} from "@hiero-ledger/sdk";
import type { AppConfig } from "../../config.ts";
import { explorerNetwork } from "../ledger/hashscan.ts";
import { createHbarRefundRail } from "../ledger/refund.ts";

export const GUEST_COOKIE = "nametoll_guest";
export const GUEST_FAUCET_TINYBARS = "50000000";
export const GUEST_COOKIE_MAX_AGE = 14_400;

export type GuestRecord = {
  id: string;
  accountId: string;
  privateKey: string;
  faucetTx?: string;
};

export type GuestStore = {
  get(id: string): GuestRecord | undefined;
  put(record: GuestRecord): void;
};

export type GuestFaucet = {
  createAndFund(key: PrivateKey): Promise<{ accountId: string; faucetTx: string }>;
};

export type GuestPublicView = {
  accountId: string;
  faucetTinybars: string;
  faucetTx?: string;
  hashscanAccountUrl: string;
};

export function createMemoryGuestStore(): GuestStore {
  const rows = new Map<string, GuestRecord>();
  return {
    get: (id) => rows.get(id),
    put: (record) => {
      rows.set(record.id, record);
    },
  };
}

export function guestCookie(id: string, secure: boolean): string {
  const flags = [
    `${GUEST_COOKIE}=${encodeURIComponent(id)}`,
    "HttpOnly",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${GUEST_COOKIE_MAX_AGE}`,
  ];
  if (secure) flags.push("Secure");
  return flags.join("; ");
}

export function createHederaGuestFaucet(config: AppConfig): GuestFaucet {
  if (!config.sellerAccountId || !config.sellerPrivateKey) {
    throw new Error(
      "Guest faucet needs HEDERA_SELLER_ACCOUNT_ID and HEDERA_SELLER_PRIVATE_KEY.",
    );
  }
  return {
    async createAndFund(key) {
      const seller = AccountId.fromString(config.sellerAccountId!);
      const sellerKey = PrivateKey.fromStringECDSA(config.sellerPrivateKey!);
      const client =
        config.network === "hedera:mainnet" ? Client.forMainnet() : Client.forTestnet();
      client.setOperator(seller, sellerKey);
      try {
        const response = await new AccountCreateTransaction().setKey(key.publicKey).execute(client);
        const receipt = await response.getReceipt(client);
        const accountId = receipt.accountId?.toString();
        if (!accountId) {
          throw new Error("AccountCreate did not return an account id.");
        }
        const funded = await createHbarRefundRail(config).refund({
          payer: accountId,
          tinybars: GUEST_FAUCET_TINYBARS,
        });
        return { accountId, faucetTx: funded.refundTx };
      } finally {
        client.close();
      }
    },
  };
}

export async function openGuestSession(options: {
  existingId?: string;
  store: GuestStore;
  faucet: GuestFaucet;
}): Promise<GuestRecord> {
  if (options.existingId) {
    const existing = options.store.get(options.existingId);
    if (existing) return existing;
  }
  const key = PrivateKey.generateECDSA();
  const funded = await options.faucet.createAndFund(key);
  const record: GuestRecord = {
    id: randomUUID(),
    accountId: funded.accountId,
    privateKey: `0x${key.toStringRaw()}`,
    faucetTx: funded.faucetTx,
  };
  options.store.put(record);
  return record;
}

export function guestPublicView(record: GuestRecord, config: AppConfig): GuestPublicView {
  const network = explorerNetwork(config.network);
  return {
    accountId: record.accountId,
    faucetTinybars: GUEST_FAUCET_TINYBARS,
    ...(record.faucetTx ? { faucetTx: record.faucetTx } : {}),
    hashscanAccountUrl: `https://hashscan.io/${network}/account/${record.accountId}`,
  };
}

export function tryCreateGuestFaucet(config: AppConfig): GuestFaucet | undefined {
  try {
    return createHederaGuestFaucet(config);
  } catch {
    return undefined;
  }
}
