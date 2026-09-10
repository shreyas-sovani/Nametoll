import { PINNED_PROTOCOLS } from "../merchandise/deployments.ts";

export function protocolIdsFromQuery(value: unknown): string[] | undefined {
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value
      .flatMap((item) =>
        typeof item === "string" ? item.split(",").map((id) => id.trim()) : [],
      )
      .filter(Boolean);
  }
  return undefined;
}

export function requestedUnits(protocolIds?: string[]): number {
  return protocolIds?.length ? protocolIds.length : PINNED_PROTOCOLS.length;
}

export function meterTinybars(priceTinybarsPerUnit: string, units: number): string {
  return (BigInt(priceTinybarsPerUnit) * BigInt(units)).toString();
}
