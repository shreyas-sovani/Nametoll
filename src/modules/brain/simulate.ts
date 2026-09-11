import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BrainVerdict, JoinCall } from "../../types.ts";

export function parseCreSimulateJson(log: string): unknown {
  const marker = "Workflow Simulation Result:";
  const idx = log.lastIndexOf(marker);
  if (idx < 0) {
    throw new Error("CRE simulate log has no Workflow Simulation Result");
  }
  const after = log.slice(idx + marker.length).trim();
  const firstLine = after.split(/\r?\n/)[0]?.trim() ?? "";
  let value: unknown;
  try {
    value = JSON.parse(firstLine);
  } catch {
    value = JSON.parse(firstJsonObject(after));
  }
  while (typeof value === "string") {
    value = JSON.parse(value);
  }
  return value;
}

export function parseCreSimulateVerdict(log: string): BrainVerdict {
  const value = parseCreSimulateJson(log);
  if (!value || typeof value !== "object") {
    throw new Error("CRE simulate result is not a verdict object");
  }
  const row = value as Record<string, unknown>;
  if (typeof row.allow !== "boolean" || typeof row.maxTinybars !== "string") {
    throw new Error("CRE simulate result is missing allow/maxTinybars");
  }
  return {
    allow: row.allow,
    maxTinybars: row.maxTinybars,
    reason: typeof row.reason === "string" ? row.reason : "",
  };
}

export function parseCreSimulateJoin(log: string): JoinCall {
  const value = parseCreSimulateJson(log);
  if (!value || typeof value !== "object") {
    throw new Error("CRE simulate result is not a join object");
  }
  const row = value as Record<string, unknown>;
  if (
    row.action !== "join" ||
    typeof row.to !== "string" ||
    typeof row.data !== "string" ||
    typeof row.chainId !== "number" ||
    typeof row.chain !== "string"
  ) {
    throw new Error("CRE simulate result is missing join() calldata");
  }
  return {
    action: "join",
    to: row.to,
    data: row.data,
    chainId: row.chainId,
    chain: row.chain,
  };
}

function firstJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start < 0) {
    throw new Error("CRE simulate result has no JSON object");
  }
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("CRE simulate result JSON is incomplete");
}

export function redactCreLog(log: string): string {
  return log
    .replace(/0x[a-fA-F0-9]{64}/g, "0x[redacted]")
    .replace(
      /\b(SPEND_CAP_TINYBARS_VAR|BUYER_ALLOWLIST_VAR|RATE_LIMIT_VAR|CRE_ETH_PRIVATE_KEY|SECRET_[A-Z0-9_]+)\s*[=:]\s*\S+/gi,
      "$1=[redacted]",
    );
}

export type SimulateAskOptions = {
  projectDir: string;
  workflowName: string;
  target: string;
  creBin?: string;
  timeoutMs?: number;
};

export type CreHttpInput = {
  requestedTinybars?: string;
  action?: "join" | "spend";
  payer?: string;
  paysThisHour?: string;
};

export async function askCreSimulate(
  options: SimulateAskOptions,
  input: CreHttpInput,
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "nametoll-cre-"));
  const payloadPath = join(dir, "http-payload.json");
  await writeFile(payloadPath, JSON.stringify(input));

  const bin = options.creBin ?? process.env.CRE_BIN ?? "cre";
  const args = [
    "workflow",
    "simulate",
    options.workflowName,
    "--non-interactive",
    "--trigger-index",
    "0",
    "--http-payload",
    payloadPath,
    "--target",
    options.target,
  ];

  return runTimedCommand(
    bin,
    args,
    options.projectDir,
    options.timeoutMs ?? CRE_SIMULATE_TIMEOUT_MS,
  );
}

export async function askCreSimulateVerdict(
  options: SimulateAskOptions,
  input: { requestedTinybars: string; payer?: string; paysThisHour?: string },
): Promise<BrainVerdict> {
  return parseCreSimulateVerdict(await askCreSimulate(options, input));
}

export async function askCreSimulateJoin(
  options: SimulateAskOptions,
): Promise<JoinCall> {
  return parseCreSimulateJoin(await askCreSimulate(options, { action: "join" }));
}

function creSpawnEnv(): NodeJS.ProcessEnv {
  const creBinDir = join(homedir(), ".cre", "bin");
  const path = process.env.PATH ?? "";
  return {
    ...process.env,
    PATH: existsSync(join(creBinDir, "cre")) ? `${creBinDir}:${path}` : path,
  };
}

export const CRE_SIMULATE_TIMEOUT_MS = 25_000;

export function runTimedCommand(
  bin: string,
  args: string[],
  cwd: string,
  timeoutMs: number = CRE_SIMULATE_TIMEOUT_MS,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd,
      env: creSpawnEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`cre workflow simulate timed out after ${timeoutMs}ms`));
        return;
      }
      if (code !== 0) {
        reject(new Error(`cre workflow simulate exited ${code}\n${out}`));
        return;
      }
      resolve(out);
    });
  });
}

export async function askCreHttp(
  url: string,
  input: CreHttpInput,
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return parseCreSimulateJson(text);
  }
}

export async function askCreHttpVerdict(
  url: string,
  input: { requestedTinybars: string; payer?: string; paysThisHour?: string },
): Promise<BrainVerdict> {
  const parsed = await askCreHttp(url, input);
  if (parsed && typeof parsed === "object" && "allow" in parsed) {
    return parsed as BrainVerdict;
  }
  throw new Error("CRE HTTP trigger did not return a verdict");
}

export async function askCreHttpJoin(url: string): Promise<JoinCall> {
  const parsed = await askCreHttp(url, { action: "join" });
  if (parsed && typeof parsed === "object") {
    const row = parsed as Record<string, unknown>;
    if (row.action === "join" && typeof row.to === "string" && typeof row.data === "string") {
      return {
        action: "join",
        to: row.to,
        data: row.data,
        chainId: typeof row.chainId === "number" ? row.chainId : 11155111,
        chain: typeof row.chain === "string" ? row.chain : "ethereum-testnet-sepolia",
      };
    }
  }
  throw new Error("CRE HTTP trigger did not return join() calldata");
}
