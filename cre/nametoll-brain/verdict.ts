/** WASM-safe copy of src/modules/brain/verdict.ts. Keep the two in sync. */
export type BrainVerdict = {
  allow: boolean
  maxTinybars: string
  reason: string
}

export function decideSpend(
  requestedTinybars: string,
  spendCapTinybars: string,
): BrainVerdict {
  try {
    if (!requestedTinybars.trim() || !spendCapTinybars.trim()) {
      return { allow: false, maxTinybars: '0', reason: 'missing spend cap' }
    }
    const requested = BigInt(requestedTinybars)
    const cap = BigInt(spendCapTinybars)
    if (requested <= cap) {
      return { allow: true, maxTinybars: cap.toString(), reason: 'under cap' }
    }
    return { allow: false, maxTinybars: cap.toString(), reason: 'over cap' }
  } catch {
    return { allow: false, maxTinybars: '0', reason: 'missing spend cap' }
  }
}
