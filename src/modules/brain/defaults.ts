import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { AppConfig } from "../../config.ts";

export type BrainSource = "http" | "simulate" | "unavailable" | "injected";

export function brainSource(config: AppConfig): BrainSource {
  if (config.creBrainUrl) return "http";
  if (config.creProjectDir) return "simulate";
  return "unavailable";
}

/** Use the repo's `cre/` tree when the operator did not set a brain URL or project dir. */
export function withDefaultCreProject(
  config: AppConfig,
  cwd: string = process.cwd(),
): AppConfig {
  if (config.creBrainUrl || config.creProjectDir) return config;
  const dir = resolve(cwd, "cre");
  if (!existsSync(join(dir, "project.yaml"))) return config;
  return { ...config, creProjectDir: dir };
}
