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
import {
  assertFaucetRunway,
  assertGuestCapacity,
  DEFAULT_GUEST_FAUCET_FLOOR_TINYBARS,
  DEFAULT_GUEST_FAUCET_TINYBARS,
  DEFAULT_GUEST_MAX_ACTIVE,
  readSellerTinybars,
  type SellerBalanceReader,
} from "./runway.ts";

export const GUEST_COOKIE = "nametoll_guest";
/** 0.05 HBAR — 50 one-unit snapshots. Ten times smaller than the old 0.5 HBAR faucet. */
export const GUEST_FAUCET_TINYBARS = DEFAULT_GUEST_FAUCET_TINYBARS;
export const GUEST_FAUCET_FLOOR_TINYBARS = DEFAULT_GUEST_FAUCET_FLOOR_TINYBARS;
export const GUEST_MAX_ACTIVE = DEFAULT_GUEST_MAX_ACTIVE;
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
  size(): number;
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
    size: () => rows.size,
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

export function faucetTinybarsFrom(config: AppConfig): string {
  return config.guestFaucetTinybars ?? GUEST_FAUCET_TINYBARS;
}

export function faucetFloorFrom(config: AppConfig): string {
  return config.guestFaucetFloorTinybars ?? GUEST_FAUCET_FLOOR_TINYBARS;
}

export function guestMaxActiveFrom(config: AppConfig): number {
  return config.guestMaxActive ?? GUEST_MAX_ACTIVE;
}

export function createHederaGuestFaucet(
  config: AppConfig,
  options: { sellerTinybars?: SellerBalanceReader } = {},
): GuestFaucet {
  if (!config.sellerAccountId || !config.sellerPrivateKey) {
    throw new Error(
      "Guest faucet needs HEDERA_SELLER_ACCOUNT_ID and HEDERA_SELLER_PRIVATE_KEY.",
    );
  }
  const sellerAccountId = config.sellerAccountId;
  const readBalance =
    options.sellerTinybars ??
    ((accountId: string) => readSellerTinybars(config.mirrorNodeUrl, accountId));
  const faucetAmount = faucetTinybarsFrom(config);
  const floor = faucetFloorFrom(config);
  return {
    async createAndFund(key) {
      const sellerTinybars = await readBalance(sellerAccountId);
      if (sellerTinybars === undefined) {
        throw new Error("Mirror Node did not return a seller balance.");
      }
      assertFaucetRunway(sellerTinybars, floor);
      const seller = AccountId.fromString(sellerAccountId);
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
          tinybars: faucetAmount,
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
  maxActive?: number;
}): Promise<GuestRecord> {
  if (options.existingId) {
    const existing = options.store.get(options.existingId);
    if (existing) return existing;
  }
  assertGuestCapacity(options.store.size(), options.maxActive ?? GUEST_MAX_ACTIVE);
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
    faucetTinybars: faucetTinybarsFrom(config),
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
