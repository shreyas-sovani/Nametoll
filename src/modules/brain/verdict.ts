import type { BrainVerdict } from "../../types.ts";

/**
 * Public spend-cap comparison. The TEE loads the cap with getSecret;
 * this function never sees how the cap was stored.
 */
export function decideSpend(
  requestedTinybars: string,
  spendCapTinybars: string,
): BrainVerdict {
  try {
    if (!requestedTinybars.trim() || !spendCapTinybars.trim()) {
      return { allow: false, maxTinybars: "0", reason: "missing spend cap" };
    }
    const requested = BigInt(requestedTinybars);
    const cap = BigInt(spendCapTinybars);
    if (requested <= cap) {
      return { allow: true, maxTinybars: cap.toString(), reason: "under cap" };
    }
    return { allow: false, maxTinybars: cap.toString(), reason: "over cap" };
  } catch {
    return { allow: false, maxTinybars: "0", reason: "missing spend cap" };
  }
}

export function unavailableVerdict(): BrainVerdict {
  return { allow: false, maxTinybars: "0", reason: "TEE unavailable" };
}

export function isUnavailableVerdict(verdict: BrainVerdict): boolean {
  return (
    verdict.allow === false &&
    verdict.maxTinybars === "0" &&
    /unavailable/i.test(verdict.reason)
  );
}
