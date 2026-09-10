import {
  AccountId,
  Client,
  Hbar,
  PrivateKey,
  TransferTransaction,
} from "@hiero-ledger/sdk";
import type { AppConfig } from "../../config.ts";

export type RefundRequest = {
  payer: string;
  tinybars: string;
};

export type RefundResult = {
  refundTx: string;
};

export type RefundRail = {
  refund(request: RefundRequest): Promise<RefundResult>;
};

export function createHbarRefundRail(config: AppConfig): RefundRail {
  if (!config.sellerAccountId || !config.sellerPrivateKey) {
    throw new Error(
      "HBAR refund rail needs HEDERA_SELLER_ACCOUNT_ID and HEDERA_SELLER_PRIVATE_KEY.",
    );
  }
  const seller = AccountId.fromString(config.sellerAccountId);
  const key = PrivateKey.fromStringECDSA(config.sellerPrivateKey);
  const network = config.network;

  return {
    async refund(request) {
      if (!/^0\.0\.\d+$/.test(request.payer)) {
        throw new Error(`Refund payer is not a Hedera account id: ${request.payer}`);
      }
      if (BigInt(request.tinybars) <= 0n) {
        throw new Error("Refund tinybars must be positive.");
      }
      const client =
        network === "hedera:mainnet" ? Client.forMainnet() : Client.forTestnet();
      client.setOperator(seller, key);
      try {
        const amount = Hbar.fromTinybars(request.tinybars);
        const response = await new TransferTransaction()
          .addHbarTransfer(seller, amount.negated())
          .addHbarTransfer(AccountId.fromString(request.payer), amount)
          .execute(client);
        await response.getReceipt(client);
        return { refundTx: response.transactionId.toString() };
      } finally {
        client.close();
      }
    },
  };
}
