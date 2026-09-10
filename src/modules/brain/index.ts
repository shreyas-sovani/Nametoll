import type { AppConfig } from "../../config.ts";
import type { BrainVerdict } from "../../types.ts";
import { askCreHttp, askCreSimulate } from "./simulate.ts";
import { unavailableVerdict } from "./verdict.ts";

export type Brain = {
  decide(input: { requestedTinybars: string }): Promise<BrainVerdict>;
};

export type BrainAsk = (input: {
  requestedTinybars: string;
}) => Promise<BrainVerdict>;

export type BrainOptions = {
  ask?: BrainAsk;
  httpUrl?: string;
  projectDir?: string;
  workflowName?: string;
  target?: string;
  creBin?: string;
};

const DEFAULT_WORKFLOW = "nametoll-brain";
const DEFAULT_TARGET = "staging-settings";

export function createBrain(options: BrainOptions = {}): Brain {
  return {
    async decide(input) {
      try {
        if (options.ask) return await options.ask(input);
        if (options.httpUrl) return await askCreHttp(options.httpUrl, input);
        if (options.projectDir) {
          return await askCreSimulate(
            {
              projectDir: options.projectDir,
              workflowName: options.workflowName ?? DEFAULT_WORKFLOW,
              target: options.target ?? DEFAULT_TARGET,
              ...(options.creBin ? { creBin: options.creBin } : {}),
            },
            input,
          );
        }
        return unavailableVerdict();
      } catch {
        return unavailableVerdict();
      }
    },
  };
}

export function createBrainFromConfig(config: AppConfig): Brain {
  return createBrain({
    ...(config.creBrainUrl ? { httpUrl: config.creBrainUrl } : {}),
    ...(config.creProjectDir && !config.creBrainUrl
      ? { projectDir: config.creProjectDir }
      : {}),
    ...(config.creWorkflowName ? { workflowName: config.creWorkflowName } : {}),
    target: config.creTarget,
  });
}

export { decideSpend, unavailableVerdict } from "./verdict.ts";
export { parseCreSimulateVerdict, redactCreLog } from "./simulate.ts";
