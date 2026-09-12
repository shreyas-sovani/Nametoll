/** Stable desk descriptor from a live ENSv2 resolve (Directory). */
export type DeskDescriptor = {
  endpoint: string;
  payTo: string;
  priceRule: string;
  hcsTopic: string;
  asset: "0.0.0";
};

/** Public CRE verdict. Secrets never appear here. */
export type BrainVerdict = {
  allow: boolean;
  maxTinybars: string;
  reason: string;
};

/** Unsigned ChallengeLending.join() from the same CRE engine. Never a broadcast tx. */
export type JoinCall = {
  action: "join";
  to: string;
  data: string;
  chainId: number;
  chain: string;
};

/** HCS bill a judge can recompute. */
export type Bill = {
  requestId: string;
  name: string;
  units: number;
  tinybars: string;
  settleTx: string;
  consensusTime: string;
  prepaidTinybars?: string;
  refundTinybars?: string;
  refundTx?: string;
  verdictReason?: string;
  verdictHash?: string;
  scheduleId?: string;
  sku?: string;
};

export const MODULE_NAMES = [
  "directory",
  "gate",
  "brain",
  "merchandise",
  "ledger",
  "buyer",
] as const;

export type ModuleName = (typeof MODULE_NAMES)[number];
