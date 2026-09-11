import type { BrainVerdict } from "../../types.ts";

export type PolicyInput = {
  requestedTinybars: string;
  spendCapTinybars: string;
  payer?: string;
  allowlist?: string;
  paysThisHour?: string;
  rateLimit?: string;
};

/**
 * Public spend-cap comparison. The TEE loads the cap with getSecret;
 * this function never sees how the cap was stored.
 */
export function decideSpend(
  requestedTinybars: string,
  spendCapTinybars: string,
): BrainVerdict {
  return decidePolicy({ requestedTinybars, spendCapTinybars });
}

export function decidePolicy(input: PolicyInput): BrainVerdict {
  const capVerdict = compareCap(input.requestedTinybars, input.spendCapTinybars);
  if (capVerdict.reason === "missing spend cap") return capVerdict;

  const allowlist = parseList(input.allowlist);
  if (allowlist.length) {
    const payer = input.payer?.trim() ?? "";
    if (!payer || !allowlist.includes(payer)) {
      return {
        allow: false,
        maxTinybars: capVerdict.maxTinybars,
        reason: "buyer not allowlisted",
      };
    }
  }

  const rateRaw = input.rateLimit?.trim() ?? "";
  if (rateRaw) {
    try {
      const limit = BigInt(rateRaw);
      const used = BigInt(input.paysThisHour?.trim() || "0");
      if (used >= limit) {
        return {
          allow: false,
          maxTinybars: capVerdict.maxTinybars,
          reason: "rate limited",
        };
      }
    } catch {
      return {
        allow: false,
        maxTinybars: capVerdict.maxTinybars,
        reason: "rate limited",
      };
    }
  }

  return capVerdict;
}

function compareCap(requestedTinybars: string, spendCapTinybars: string): BrainVerdict {
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

function parseList(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
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
