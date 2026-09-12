import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import type { AppConfig } from "../../config.ts";

export type BrainSource = "http" | "simulate" | "unavailable" | "injected";

export function brainSource(config: AppConfig): BrainSource {
  if (config.creBrainUrl) return "http";
  if (config.creProjectDir) return "simulate";
  return "unavailable";
}

export function resolveCreProjectDir(
  config: AppConfig,
  cwd: string = process.cwd(),
): string | undefined {
  const fallback = resolve(cwd, "cre");
  const configured = config.creProjectDir?.trim();
  const candidates = configured ? [configured, fallback] : [fallback];
  for (const dir of candidates) {
    if (existsSync(join(dir, "project.yaml"))) return dir;
  }
  return configured || undefined;
}

/** Use the repo's `cre/` tree when the configured dir is missing (laptop path on a VM). */
export function withDefaultCreProject(
  config: AppConfig,
  cwd: string = process.cwd(),
): AppConfig {
  if (config.creBrainUrl) return config;
  const dir = resolveCreProjectDir(config, cwd);
  if (!dir || dir === config.creProjectDir) return config;
  return { ...config, creProjectDir: dir };
}
