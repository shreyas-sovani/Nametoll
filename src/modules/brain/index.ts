import type { AppConfig } from "../../config.ts";
import type { BrainVerdict, JoinCall } from "../../types.ts";
import { brainSource, type BrainSource } from "./defaults.ts";
import {
  askCreHttpJoin,
  askCreHttpVerdict,
  askCreSimulateJoin,
  askCreSimulateVerdict,
} from "./simulate.ts";
import { unavailableVerdict } from "./verdict.ts";

export type Brain = {
  source?: BrainSource;
  decide(input: { requestedTinybars: string }): Promise<BrainVerdict>;
  join?(): Promise<JoinCall>;
};

export type BrainAsk = (input: {
  requestedTinybars: string;
}) => Promise<BrainVerdict>;

export type BrainOptions = {
  ask?: BrainAsk;
  join?: () => Promise<JoinCall>;
  httpUrl?: string;
  projectDir?: string;
  workflowName?: string;
  target?: string;
  creBin?: string;
  source?: BrainSource;
};

const DEFAULT_WORKFLOW = "nametoll-brain";
const DEFAULT_TARGET = "staging-settings";

function simulateOptions(options: BrainOptions) {
  if (!options.projectDir) {
    throw new Error("CRE project dir is missing");
  }
  return {
    projectDir: options.projectDir,
    workflowName: options.workflowName ?? DEFAULT_WORKFLOW,
    target: options.target ?? DEFAULT_TARGET,
    ...(options.creBin ? { creBin: options.creBin } : {}),
  };
}

export function createBrain(options: BrainOptions = {}): Brain {
  const source: BrainSource =
    options.source ??
    (options.ask
      ? "injected"
      : options.httpUrl
        ? "http"
        : options.projectDir
          ? "simulate"
          : "unavailable");
  const decideCache = new Map<string, Promise<BrainVerdict>>();
  let joinCache: Promise<JoinCall> | undefined;

  return {
    source,
    async decide(input) {
      const key = input.requestedTinybars;
      const hit = decideCache.get(key);
      if (hit) return hit;
      const pending = (async () => {
        try {
          if (options.ask) return await options.ask(input);
          if (options.httpUrl) return await askCreHttpVerdict(options.httpUrl, input);
          if (options.projectDir) {
            return await askCreSimulateVerdict(simulateOptions(options), input);
          }
          return unavailableVerdict();
        } catch {
          return unavailableVerdict();
        }
      })();
      decideCache.set(key, pending);
      return pending;
    },
    async join() {
      if (joinCache) return joinCache;
      joinCache = (async () => {
        if (options.join) return options.join();
        if (options.httpUrl) return askCreHttpJoin(options.httpUrl);
        if (options.projectDir) return askCreSimulateJoin(simulateOptions(options));
        throw new Error("TEE unavailable");
      })();
      try {
        return await joinCache;
      } catch (error) {
        joinCache = undefined;
        throw error;
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
    source: brainSource(config),
  });
}

export { decideSpend, unavailableVerdict } from "./verdict.ts";
export { parseCreSimulateVerdict, redactCreLog, parseCreSimulateJoin } from "./simulate.ts";
export { withDefaultCreProject, brainSource } from "./defaults.ts";
export type { BrainSource } from "./defaults.ts";
