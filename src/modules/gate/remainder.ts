import type { MerchandiseSnapshot } from "../merchandise/index.ts";
import { meterTinybars } from "./meter.ts";

/** Credits burned while the snapshot ran. Stub bodies burn every prepaid unit. */
export function burnedUnits(snapshot: MerchandiseSnapshot): number {
  if (snapshot.stub) return snapshot.units;
  if (snapshot.protocols.length === 0) return snapshot.units;
  return snapshot.protocols.filter((row) => row.ok).length;
}

export type RemainderSettlement = {
  burnedUnits: number;
  prepaidTinybars: string;
  owedTinybars: string;
  refundTinybars: string;
};

/** Credit is the settled transfer. Owed is burned × price. Remainder is refunded. */
export function settlementFromUsage(input: {
  prepaidTinybars: string;
  burnedUnits: number;
  priceTinybars: string;
}): RemainderSettlement {
  const owedTinybars = meterTinybars(input.priceTinybars, input.burnedUnits);
  const prepaid = BigInt(input.prepaidTinybars);
  const owed = BigInt(owedTinybars);
  const refund = prepaid > owed ? prepaid - owed : 0n;
  return {
    burnedUnits: input.burnedUnits,
    prepaidTinybars: input.prepaidTinybars,
    owedTinybars,
    refundTinybars: refund.toString(),
  };
}
