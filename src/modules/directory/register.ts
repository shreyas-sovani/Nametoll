import { normalize } from "viem/ens";
import { HBAR_ASSET, type AppConfig } from "../../config.ts";

export type DeskRecordDraft = {
  label: string;
  endpoint?: string;
  payTo?: string;
  priceRule?: string;
};

export type ConstrainedDeskRecords = {
  parent: string;
  label: string;
  endpoint: string;
  payTo: string;
  priceRule: string;
  hcsTopic: string;
  asset: typeof HBAR_ASSET;
};

export type IssuedDesk = {
  parent: string;
  child: string;
  resolver: string;
  registerTx?: string;
};

export type IssueChild = (records: ConstrainedDeskRecords) => Promise<IssuedDesk>;

export function assertRegisterableLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    throw new Error("Child label is required.");
  }
  if (trimmed.includes(".")) {
    throw new Error("Child label cannot contain a dot.");
  }
  let normalized: string;
  try {
    normalized = normalize(trimmed);
  } catch {
    throw new Error("Child label is not a valid ENS label.");
  }
  if (!normalized || normalized.includes(".")) {
    throw new Error("Child label cannot contain a dot.");
  }
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(normalized)) {
    throw new Error("Child label must be a DNS label.");
  }
  return normalized;
}

export function constrainedDeskRecords(
  config: AppConfig,
  input: DeskRecordDraft,
): ConstrainedDeskRecords {
  const parent = config.ensParent?.trim();
  if (!parent) {
    throw new Error("Parent name is not configured.");
  }
  const label = assertRegisterableLabel(input.label);
  const endpoint = (input.endpoint ?? config.publicDeskUrl ?? "").trim().replace(/\/+$/, "");
  if (!endpoint) {
    throw new Error("Endpoint is required (or set PUBLIC_DESK_URL).");
  }
  if (!config.sellerAccountId) {
    throw new Error("Seller payTo is not configured.");
  }
  if (!config.hcsTopicId) {
    throw new Error("HCS topic is not configured.");
  }
  return {
    parent,
    label,
    endpoint,
    payTo: config.sellerAccountId,
    priceRule: `${config.priceTinybars} tinybars per protocol`,
    hcsTopic: config.hcsTopicId,
    asset: HBAR_ASSET,
  };
}
