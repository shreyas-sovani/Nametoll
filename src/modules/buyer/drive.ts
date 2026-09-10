import type { AppConfig } from "../../config.ts";
import type { Bill, BrainVerdict, DeskDescriptor } from "../../types.ts";
import type { Brain } from "../brain/index.ts";
import type { Directory } from "../directory/index.ts";
import { meterTinybars, requestedUnits } from "../gate/meter.ts";
import { explorerNetwork, hashscanTopicUrl } from "../ledger/hashscan.ts";
import type { Ledger } from "../ledger/index.ts";
import type { Buyer, PaidResult } from "./index.ts";
import { fetchSnapshotChallenge, type SnapshotChallenge } from "./challenge.ts";

export type DeskInspect = {
  name: string;
  descriptor: DeskDescriptor;
  units: number;
  tinybars: string;
  verdict: BrainVerdict;
  challenge: SnapshotChallenge;
};

export type DeskPayResult = DeskInspect & {
  paid: PaidResult;
  bill?: Bill;
  topicId?: string;
  topicHashscanUrl?: string;
};

export async function inspectNamedDesk(
  name: string,
  directory: Directory,
  brain: Brain,
  config: AppConfig,
  protocols?: string[],
): Promise<DeskInspect> {
  const resolved = await directory.resolve(name);
  const units = requestedUnits(protocols);
  const tinybars = meterTinybars(config.priceTinybars, units);
  const [verdict, challenge] = await Promise.all([
    brain.decide({ requestedTinybars: tinybars }),
    fetchSnapshotChallenge(resolved.descriptor.endpoint, protocols),
  ]);
  return {
    name: resolved.name,
    descriptor: resolved.descriptor,
    units,
    tinybars,
    verdict,
    challenge,
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
): Promise<
  | { ok: true; result: DeskPayResult }
  | { ok: false; status: number; inspect: DeskInspect }
> {
  const inspect = await inspectNamedDesk(
    name,
    directory,
    brain,
    config,
    protocols,
  );
  if (!inspect.verdict.allow) {
    return { ok: false, status: 403, inspect };
  }
  const paid = await buyer.payFromName(
    name,
    directory,
    protocols?.length ? { protocols } : {},
  );
  if (paid.status !== 200 || !paid.settleTx) {
    return { ok: false, status: paid.status || 502, inspect };
  }
  const bills = ledger ? await ledger.list() : [];
  const bill =
    bills.find((row) => row.settleTx === paid.settleTx) ?? bills.at(-1);
  const topicId = ledger?.topicId ?? config.hcsTopicId ?? inspect.descriptor.hcsTopic;
  return {
    ok: true,
    result: {
      ...inspect,
      paid,
      ...(bill ? { bill } : {}),
      ...(topicId
        ? {
            topicId,
            topicHashscanUrl: hashscanTopicUrl(
              topicId,
              explorerNetwork(config.network),
            ),
          }
        : {}),
    },
  };
}
