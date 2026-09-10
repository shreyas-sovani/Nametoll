import { randomUUID } from "node:crypto";
import type { Bill } from "../../types.ts";

/** Fields the desk writes. `consensusTime` is assigned when the message reaches consensus. */
export type BillDraft = Omit<Bill, "consensusTime">;

export type Ledger = {
  topicId?: string;
  append(draft: BillDraft): Promise<Bill>;
  list(): Promise<Bill[]>;
};

export function createMemoryLedger(topicId = "0.0.1"): Ledger & {
  bills: Bill[];
} {
  const bills: Bill[] = [];
  return {
    topicId,
    bills,
    async append(draft) {
      const bill: Bill = {
        ...draft,
        consensusTime: `${Math.floor(Date.now() / 1000)}.000000000`,
      };
      bills.push(bill);
      return bill;
    },
    async list() {
      return [...bills];
    },
  };
}

export function recomputeTinybars(units: number, priceTinybarsPerUnit: string): string {
  return (BigInt(units) * BigInt(priceTinybarsPerUnit)).toString();
}

export function billMatchesPrice(
  bill: Pick<Bill, "units" | "tinybars">,
  priceTinybarsPerUnit: string,
): boolean {
  return bill.tinybars === recomputeTinybars(bill.units, priceTinybarsPerUnit);
}

export function newRequestId(): string {
  return randomUUID();
}

export type MirrorTopicMessage = {
  consensus_timestamp: string;
  message: string;
};

export function encodeBillPayload(draft: BillDraft): string {
  return JSON.stringify({
    requestId: draft.requestId,
    name: draft.name,
    units: draft.units,
    tinybars: draft.tinybars,
    settleTx: draft.settleTx,
    ...(draft.prepaidTinybars !== undefined
      ? { prepaidTinybars: draft.prepaidTinybars }
      : {}),
    ...(draft.refundTinybars !== undefined
      ? { refundTinybars: draft.refundTinybars }
      : {}),
    ...(draft.refundTx !== undefined ? { refundTx: draft.refundTx } : {}),
  });
}

export function billFromMirrorMessage(
  message: MirrorTopicMessage,
): Bill | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      Buffer.from(message.message, "base64").toString("utf8"),
    );
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object") return undefined;
  const record = parsed as Record<string, unknown>;
  if (
    typeof record.requestId !== "string" ||
    typeof record.name !== "string" ||
    typeof record.units !== "number" ||
    typeof record.tinybars !== "string" ||
    typeof record.settleTx !== "string"
  ) {
    return undefined;
  }
  return {
    requestId: record.requestId,
    name: record.name,
    units: record.units,
    tinybars: record.tinybars,
    settleTx: record.settleTx,
    consensusTime: message.consensus_timestamp,
    ...(typeof record.prepaidTinybars === "string"
      ? { prepaidTinybars: record.prepaidTinybars }
      : {}),
    ...(typeof record.refundTinybars === "string"
      ? { refundTinybars: record.refundTinybars }
      : {}),
    ...(typeof record.refundTx === "string" ? { refundTx: record.refundTx } : {}),
  };
}
