import { HBAR_ASSET } from "../../config.ts";

/** Official ScheduleCreate max expiry: 62 days (docs.hedera.com scheduled create). */
export const MAX_SCHEDULE_SECONDS = 5_356_800;
export const WEEK_SECONDS = 7 * 24 * 60 * 60;
export const DEFAULT_SUBSCRIBE_SLOTS = 2;
export const MAX_SUBSCRIBE_SLOTS = 8;

export type SubscribeSlot = {
  index: number;
  expireAt: string;
  tinybars: string;
  waitForExpiry: true;
  tokenAmount?: string;
  memo: string;
};

export type SubscribePlan = {
  payer: string;
  payTo: string;
  asset: string;
  waitForExpiry: true;
  maxExpirySeconds: typeof MAX_SCHEDULE_SECONDS;
  intervalSeconds: number;
  tinybars: string;
  slots: SubscribeSlot[];
};

export type SubscribePlanInput = {
  slots: number;
  intervalSeconds: number;
  from: Date;
  payer: string;
  payTo: string;
  tinybars: string;
  tokenId?: string;
};

export type MirrorSchedule = {
  schedule_id?: string;
  deleted?: boolean;
  executed_timestamp?: string | null;
  wait_for_expiry?: boolean;
  expiration_time?: string | null;
  memo?: string;
  payer_account_id?: string;
};

export type ScheduleView = {
  scheduleId: string;
  deleted: boolean;
  executed: boolean;
  waitForExpiry: boolean;
  executedTimestamp?: string;
  expirationTime?: string;
  memo?: string;
  payerAccountId?: string;
};

export type ClaimDecision = {
  ok: boolean;
  reason: string;
};

export function subscribePlan(input: SubscribePlanInput): SubscribePlan {
  if (!Number.isInteger(input.slots) || input.slots < 1) {
    throw new Error("Subscribe slots must be a positive integer.");
  }
  if (input.slots > MAX_SUBSCRIBE_SLOTS) {
    throw new Error(`Subscribe slots cannot exceed ${MAX_SUBSCRIBE_SLOTS}.`);
  }
  if (!Number.isInteger(input.intervalSeconds) || input.intervalSeconds < 1) {
    throw new Error("Subscribe interval must be a positive number of seconds.");
  }
  if (!/^0\.0\.\d+$/.test(input.payer) || !/^0\.0\.\d+$/.test(input.payTo)) {
    throw new Error("Subscribe payer and payTo must be Hedera account ids.");
  }
  if (BigInt(input.tinybars) <= 0n) {
    throw new Error("Subscribe tinybars must be positive.");
  }
  const lastOffset = input.intervalSeconds * input.slots;
  if (lastOffset > MAX_SCHEDULE_SECONDS) {
    throw new Error(
      `Last slot expires after the 62-day schedule cap (${MAX_SCHEDULE_SECONDS} seconds).`,
    );
  }
  if (input.tokenId && !/^0\.0\.\d+$/.test(input.tokenId)) {
    throw new Error("HTS token id must look like 0.0.x.");
  }

  const asset = input.tokenId ?? HBAR_ASSET;
  const slots: SubscribeSlot[] = [];
  for (let index = 0; index < input.slots; index += 1) {
    const expire = new Date(input.from.getTime() + input.intervalSeconds * (index + 1) * 1000);
    slots.push({
      index,
      expireAt: expire.toISOString(),
      tinybars: input.tinybars,
      waitForExpiry: true,
      ...(input.tokenId ? { tokenAmount: "1" } : {}),
      memo: `nametoll ${index + 1}/${input.slots}`,
    });
  }

  return {
    payer: input.payer,
    payTo: input.payTo,
    asset,
    waitForExpiry: true,
    maxExpirySeconds: MAX_SCHEDULE_SECONDS,
    intervalSeconds: input.intervalSeconds,
    tinybars: input.tinybars,
    slots,
  };
}

export function scheduleFromMirror(record: MirrorSchedule): ScheduleView {
  const scheduleId = record.schedule_id ?? "";
  if (!/^0\.0\.\d+$/.test(scheduleId)) {
    throw new Error("Mirror schedule is missing schedule_id.");
  }
  const executedTimestamp =
    typeof record.executed_timestamp === "string" && record.executed_timestamp
      ? record.executed_timestamp
      : undefined;
  return {
    scheduleId,
    deleted: record.deleted === true,
    executed: Boolean(executedTimestamp),
    waitForExpiry: record.wait_for_expiry === true,
    ...(executedTimestamp ? { executedTimestamp } : {}),
    ...(typeof record.expiration_time === "string" && record.expiration_time
      ? { expirationTime: record.expiration_time }
      : {}),
    ...(typeof record.memo === "string" ? { memo: record.memo } : {}),
    ...(typeof record.payer_account_id === "string"
      ? { payerAccountId: record.payer_account_id }
      : {}),
  };
}

export function claimReady(input: {
  schedule?: ScheduleView;
  alreadyClaimed?: boolean;
}): ClaimDecision {
  if (!input.schedule) {
    return { ok: false, reason: "missing schedule" };
  }
  if (input.schedule.deleted) {
    return { ok: false, reason: "schedule deleted" };
  }
  if (!input.schedule.executed) {
    return { ok: false, reason: "not executed" };
  }
  if (input.alreadyClaimed) {
    return { ok: false, reason: "already claimed" };
  }
  return { ok: true, reason: "executed" };
}

export async function fetchMirrorSchedule(
  mirrorNodeUrl: string,
  scheduleId: string,
): Promise<ScheduleView> {
  if (!/^0\.0\.\d+$/.test(scheduleId)) {
    throw new Error(`Not a Hedera schedule id: ${scheduleId}`);
  }
  const url = `${mirrorNodeUrl.replace(/\/+$/, "")}/api/v1/schedules/${scheduleId}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Mirror schedule ${scheduleId} returned HTTP ${res.status}.`);
  }
  return scheduleFromMirror((await res.json()) as MirrorSchedule);
}

export function alreadyClaimed(
  bills: Array<{ scheduleId?: string }>,
  scheduleId: string,
): boolean {
  return bills.some((bill) => bill.scheduleId === scheduleId);
}
