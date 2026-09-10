import type { DeskDescriptor } from "../../types.ts";

export type Directory = {
  resolve(name: string): Promise<DeskDescriptor>;
};

export function createDirectory(): Directory {
  return {
    async resolve() {
      throw new Error("Directory is not wired yet (ENSv2, B7).");
    },
  };
}
