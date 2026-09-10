/**
 * Max Amount Policy Example
 *
 * Blocks transfer/airdrop tools when any single recipient amount exceeds a cap.
 * Demonstrates: the threshold pattern, throwing with a custom error message,
 * `relevantTools` filter, optional pluggable strategies for non-default tools.
 */

import {
  AbstractPolicy,
  PostParamsNormalizationParams,
} from '@hashgraph/hedera-agent-kit';

/** Strategy returns the largest single-recipient amount in a normalised params payload. */
type AmountStrategy = (normalisedParams: any) => number;

const DEFAULT_STRATEGIES: Record<string, AmountStrategy> = {
  transfer_hbar: (p) => maxAmount(p?.transfers),
  transfer_hbar_with_allowance: (p) => maxAmount(p?.transfers),
  airdrop_fungible_token: (p) => maxAmount(p?.airdrops),
  transfer_fungible_token_with_allowance: (p) => maxAmount(p?.transfers),
};

const maxAmount = (xs: unknown): number => {
  if (!Array.isArray(xs)) return 0;
  let max = 0;
  for (const item of xs) {
    const amount = Number((item as { amount?: unknown })?.amount ?? 0);
    if (Number.isFinite(amount) && amount > max) max = amount;
  }
  return max;
};

export class MaxAmountPolicy extends AbstractPolicy {
  name = 'Max Amount Policy';
  description: string;
  relevantTools: string[];

  private readonly maxAmount: number;
  private readonly strategies: Record<string, AmountStrategy>;

  /**
   * @param maxAmount  Largest per-recipient amount allowed (in the units the tool uses)
   * @param additionalTools  Custom tool methods to also guard. Each must have a strategy
   * @param customStrategies  Maps tool method → function that returns the largest amount
   */
  constructor(
    maxAmount: number,
    additionalTools: string[] = [],
    customStrategies: Record<string, AmountStrategy> = {},
  ) {
    super();

    if (!Number.isFinite(maxAmount) || maxAmount <= 0) {
      throw new Error(`[max-amount-policy] maxAmount must be a positive number, got ${maxAmount}`);
    }

    for (const tool of additionalTools) {
      if (!customStrategies[tool]) {
        throw new Error(
          `[max-amount-policy] Custom tool "${tool}" requires a strategy in customStrategies`,
        );
      }
    }

    this.maxAmount = maxAmount;
    this.strategies = { ...DEFAULT_STRATEGIES, ...customStrategies };
    this.relevantTools = [...Object.keys(DEFAULT_STRATEGIES), ...additionalTools];
    this.description = `Blocks ${this.relevantTools.join(', ')} when any single amount exceeds ${maxAmount}.`;
  }

  protected shouldBlockPostParamsNormalization(
    params: PostParamsNormalizationParams,
    method: string,
  ): boolean {
    if (!this.relevantTools.includes(method)) return false;

    const strategy = this.strategies[method];
    if (!strategy) {
      // Defensive: relevantTools listed it but no strategy — fail closed.
      throw new Error(`[max-amount-policy] No strategy registered for "${method}"`);
    }

    const largest = strategy(params.normalisedParams);
    if (largest > this.maxAmount) {
      throw new Error(
        `[max-amount-policy] Refusing ${method}: amount ${largest} exceeds limit ${this.maxAmount}`,
      );
    }

    return false;
  }
}

export default MaxAmountPolicy;
