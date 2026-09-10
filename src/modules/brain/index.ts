import type { BrainVerdict } from "../../types.ts";

export type Brain = {
  decide(input: { requestedTinybars: string }): Promise<BrainVerdict>;
};

export function createBrain(): Brain {
  return {
    async decide() {
      throw new Error("Brain is not wired yet (CRE TEE, B9).");
    },
  };
}
