import type { AppConfig } from "../../config.ts";
import type { BrainVerdict, DeskDescriptor } from "../../types.ts";
import type { Brain } from "../brain/index.ts";
import type { Directory } from "../directory/index.ts";
import { meterTinybars, requestedUnits } from "../gate/meter.ts";
import { PINNED_PROTOCOLS } from "../merchandise/deployments.ts";
import { explorerNetwork, hashscanTopicUrl } from "../ledger/hashscan.ts";
import { auditBill, previewRecompute, type BillAudit } from "../ledger/audit.ts";
import type { Ledger } from "../ledger/index.ts";
import { waitForMatchingBill } from "../ledger/match-bill.ts";
import { viewMerchandise, type MerchandiseView } from "../merchandise/view.ts";
import type { Buyer, PaidResult } from "./index.ts";
import { fetchSnapshotChallenge, type SnapshotChallenge } from "./challenge.ts";
import { payEndpointAllowed, settleEndpoint } from "./pay-guard.ts";
import { parseWallet, RISK_PATH, RISK_SKU } from "../merchandise/risk.ts";

export type DeskInspect = {
  name: string;
  descriptor: DeskDescriptor;
  units: number;
  tinybars: string;
  verdict: BrainVerdict;
  challenge: SnapshotChallenge;
  recompute: ReturnType<typeof previewRecompute>;
  payer?: string;
};

export type DeskPayResult = DeskInspect & {
  paid: PaidResult;
  merchandise: MerchandiseView;
  bill?: BillAudit;
  topicId?: string;
  topicHashscanUrl?: string;
};

export type DriveContext = {
  payer?: string;
  paysThisHour?: string;
};

export async function inspectNamedDesk(
  name: string,
  directory: Directory,
  brain: Brain,
  config: AppConfig,
  protocols?: string[],
  context: DriveContext = {},
): Promise<DeskInspect> {
  const resolved = await directory.resolve(name);
  const units = requestedUnits(protocols);
  const tinybars = meterTinybars(config.priceTinybars, units);
  const [verdict, challenge] = await Promise.all([
    brain.decide({
      requestedTinybars: tinybars,
      ...(context.payer ? { payer: context.payer } : {}),
      ...(context.paysThisHour ? { paysThisHour: context.paysThisHour } : {}),
    }),
    fetchSnapshotChallenge(resolved.descriptor.endpoint, protocols),
  ]);
  return {
    name: resolved.name,
    descriptor: resolved.descriptor,
    units,
    tinybars,
    verdict,
    challenge,
    recompute: previewRecompute(units, config.priceTinybars, tinybars),
    ...(context.payer ? { payer: context.payer } : {}),
  };
}

export async function payNamedDesk(
  name: string,
  directory: Directory,
  brain: Brain,
  buyer: Buyer,
  config: AppConfig,
  ledger?: Ledger,
  protocols?: string[],
  context: DriveContext = {},
  sku?: string,
  wallet?: string,
): Promise<
  | { ok: true; result: DeskPayResult }
  | { ok: false; status: number; inspect: DeskInspect; error?: string }
> {
  const payingRisk = sku === RISK_SKU;
  const riskWallet = payingRisk ? parseWallet(wallet) : undefined;
  if (payingRisk && !riskWallet) {
    const inspect = await inspectNamedDesk(
      name,
      directory,
      brain,
      config,
      [PINNED_PROTOCOLS[0]?.id ?? "aave-v3-ethereum"],
      context,
    );
    return { ok: false, status: 400, inspect, error: "wallet query must be a 0x address." };
  }
  const inspectProtocols = payingRisk
    ? [protocols?.[0] ?? PINNED_PROTOCOLS[0]?.id ?? "aave-v3-ethereum"]
    : protocols;
  const inspect = await inspectNamedDesk(
    name,
    directory,
    brain,
    config,
    inspectProtocols,
    context,
  );
  if (!inspect.verdict.allow) {
    return { ok: false, status: 403, inspect };
  }
  if (!payEndpointAllowed(inspect.descriptor.endpoint, config.publicDeskUrl)) {
    return {
      ok: false,
      status: 403,
      inspect,
      error: "Pay is pinned to this desk's public URL.",
    };
  }
  const paid = await buyer.payOnce(
    settleEndpoint(inspect.descriptor.endpoint, config.publicDeskUrl),
    payingRisk && riskWallet
      ? { path: RISK_PATH, query: { wallet: riskWallet } }
      : protocols?.length
        ? { protocols }
        : {},
  );
  if (paid.status !== 200 || !paid.settleTx) {
    return { ok: false, status: paid.status || 502, inspect };
  }
  const bill = await waitForMatchingBill(
    ledger,
    paid.settleTx,
    config.billMatchTimeoutMs !== undefined
      ? { timeoutMs: config.billMatchTimeoutMs }
      : {},
  );
  const topicId = ledger?.topicId ?? config.hcsTopicId ?? inspect.descriptor.hcsTopic;
  const network = explorerNetwork(config.network);
  return {
    ok: true,
    result: {
      ...inspect,
      paid,
      merchandise: viewMerchandise(paid.body),
      ...(bill ? { bill: auditBill(bill, config.priceTinybars, network) } : {}),
      ...(topicId
        ? {
            topicId,
            topicHashscanUrl: hashscanTopicUrl(topicId, network),
          }
        : {}),
    },
  };
}
