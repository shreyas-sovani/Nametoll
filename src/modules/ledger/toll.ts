export const TOLL_NAME = "Nametoll Desk Credit";
export const TOLL_SYMBOL = "TOLL";

export type TollFixedFee = {
  type: "fixed";
  collector: string;
  hbarTinybars: string;
};

export type TollTokenPlan = {
  name: typeof TOLL_NAME;
  symbol: typeof TOLL_SYMBOL;
  decimals: 0;
  initialSupply: number;
  treasury: string;
  collectorsExempt: true;
  customFees: TollFixedFee[];
};

export function tollTokenPlan(input: {
  treasury: string;
  collector: string;
  feeTinybars: string;
  initialSupply?: number;
}): TollTokenPlan {
  if (!/^0\.0\.\d+$/.test(input.treasury) || !/^0\.0\.\d+$/.test(input.collector)) {
    throw new Error("Toll treasury and collector must be Hedera account ids.");
  }
  if (BigInt(input.feeTinybars) <= 0n) {
    throw new Error("Toll custom fee must be positive tinybars.");
  }
  return {
    name: TOLL_NAME,
    symbol: TOLL_SYMBOL,
    decimals: 0,
    initialSupply: input.initialSupply ?? 1000,
    treasury: input.treasury,
    collectorsExempt: true,
    customFees: [
      {
        type: "fixed",
        collector: input.collector,
        hbarTinybars: input.feeTinybars,
      },
    ],
  };
}
