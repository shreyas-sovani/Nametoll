import { readFileSync } from "node:fs";
import { decodePaymentResponseHeader } from "@x402/core/http";
import { x402Client } from "@x402/core/client";
import type { Network } from "@x402/core/types";
import { wrapFetchWithPayment } from "@x402/fetch";
import { createClientHederaSigner, HBAR_ASSET_ID } from "@x402/hedera";
import { ExactHederaScheme } from "@x402/hedera/exact/client";
import { PrivateKey } from "@hiero-ledger/sdk";
import { HEDERA_TESTNET } from "../../config.ts";
import { SNAPSHOT_PATH } from "../gate/index.ts";
import { hashscanTransactionUrl } from "./hashscan.ts";

export type BuyerCredentials = {
  accountId: string;
  privateKey: string;
  network: Network;
};

export type PaidResult = {
  status: number;
  body: unknown;
  settleTx?: string;
  hashscanUrl?: string;
};

export type Buyer = {
  payOnce(deskUrl: string): Promise<PaidResult>;
};

export function loadBuyerCredentials(
  env: NodeJS.ProcessEnv = process.env,
): BuyerCredentials {
  const accountId = env.HEDERA_BUYER_ACCOUNT_ID;
  const privateKey =
    env.HEDERA_BUYER_PRIVATE_KEY ??
    (env.HEDERA_BUYER_KEY_PATH
      ? readFileSync(env.HEDERA_BUYER_KEY_PATH, "utf8").trim()
      : undefined);

  if (!accountId || !privateKey) {
    throw new Error(
      "Buyer needs HEDERA_BUYER_ACCOUNT_ID and HEDERA_BUYER_PRIVATE_KEY or HEDERA_BUYER_KEY_PATH.",
    );
  }

  return {
    accountId,
    privateKey,
    network: (env.X402_NETWORK as Network | undefined) ?? HEDERA_TESTNET,
  };
}

export function createBuyer(credentials: BuyerCredentials): Buyer {
  const signer = createClientHederaSigner(
    credentials.accountId,
    PrivateKey.fromStringECDSA(credentials.privateKey),
    { network: credentials.network },
  );
  const client = x402Client.fromConfig({
    schemes: [
      {
        network: credentials.network,
        client: new ExactHederaScheme(signer),
      },
    ],
    spendControls: {
      allowedAssets: [{ network: credentials.network, asset: HBAR_ASSET_ID }],
    },
  });
  const paidFetch = wrapFetchWithPayment(globalThis.fetch, client);

  return {
    async payOnce(deskUrl: string): Promise<PaidResult> {
      const url = new URL(SNAPSHOT_PATH, `${deskUrl.replace(/\/+$/, "")}/`);
      const response = await paidFetch(url, {
        headers: {
          accept: "application/json",
          "ngrok-skip-browser-warning": "1",
        },
      });
      const paymentResponse = response.headers.get("payment-response");
      const settled = paymentResponse
        ? decodePaymentResponseHeader(paymentResponse)
        : undefined;
      return {
        status: response.status,
        body: await response.json(),
        ...(settled?.transaction
          ? {
              settleTx: settled.transaction,
              hashscanUrl: hashscanTransactionUrl(settled.transaction),
            }
          : {}),
      };
    },
  };
}
