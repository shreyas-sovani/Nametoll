/** 2LD parents to try on ENSv2 Sepolia. First is the product name. */
export const PARENT_CANDIDATES = [
  "nametoll.eth",
  "nametolldesk.eth",
  "nametollhq.eth",
  "nametollpay.eth",
] as const;

export type ParentCandidateStatus = {
  name: string;
  available: boolean;
  ownedByUs: boolean;
};

/**
 * Parent = the 2LD we register (e.g. nametoll.eth).
 * Child = a label under that parent's UserRegistry (e.g. desk.nametoll.eth).
 * Prefer a name we already own, otherwise the first available candidate.
 */
export function chooseParentName(results: readonly ParentCandidateStatus[]): string {
  const owned = results.find((row) => row.ownedByUs);
  if (owned) return owned.name;
  const open = results.find((row) => row.available);
  if (open) return open.name;
  throw new Error(
    "No candidate parent is available or owned by the owner account. Pass a different --parent.",
  );
}

export function childName(parent: string, label = "desk"): string {
  return `${label}.${parent}`;
}
