import type { Bill } from "../../types.ts";
import {
  billMatchesPrice,
  recomputeTinybars,
} from "./index.ts";
import { hashscanTransactionUrl } from "../buyer/hashscan.ts";

export const RECOMPUTE_FORMULA = "units * priceTinybarsPerUnit = tinybars";

export type BillRecompute = {
  formula: string;
  expectedTinybars: string;
  matches: boolean;
  refundExpected?: string;
  refundMatches?: boolean;
};

export type BillAudit = Bill & {
  hashscanUrl?: string;
  refundHashscanUrl?: string;
  recompute: BillRecompute;
};

function safeTxUrl(transactionId: string, network: "testnet" | "mainnet"): string | undefined {
  try {
    return hashscanTransactionUrl(transactionId, network);
  } catch {
    return undefined;
  }
}

export function auditBill(
  bill: Bill,
  priceTinybarsPerUnit: string,
  network: "testnet" | "mainnet" = "testnet",
): BillAudit {
  const expectedTinybars = recomputeTinybars(bill.units, priceTinybarsPerUnit);
  const refundExpected =
    bill.prepaidTinybars !== undefined
      ? (BigInt(bill.prepaidTinybars) - BigInt(bill.tinybars)).toString()
      : undefined;
  const hashscanUrl = safeTxUrl(bill.settleTx, network);
  const refundHashscanUrl = bill.refundTx
    ? safeTxUrl(bill.refundTx, network)
    : undefined;
  return {
    ...bill,
    ...(hashscanUrl ? { hashscanUrl } : {}),
    ...(refundHashscanUrl ? { refundHashscanUrl } : {}),
    recompute: {
      formula: RECOMPUTE_FORMULA,
      expectedTinybars,
      matches: billMatchesPrice(bill, priceTinybarsPerUnit),
      ...(refundExpected !== undefined ? { refundExpected } : {}),
      ...(refundExpected !== undefined
        ? { refundMatches: bill.refundTinybars === refundExpected }
        : {}),
    },
  };
}

export function previewRecompute(
  units: number,
  priceTinybarsPerUnit: string,
  requestedTinybars: string,
): BillRecompute & { units: number; priceTinybarsPerUnit: string; requestedTinybars: string } {
  const expectedTinybars = recomputeTinybars(units, priceTinybarsPerUnit);
  return {
    formula: RECOMPUTE_FORMULA,
    units,
    priceTinybarsPerUnit,
    requestedTinybars,
    expectedTinybars,
    matches: requestedTinybars === expectedTinybars,
  };
}
