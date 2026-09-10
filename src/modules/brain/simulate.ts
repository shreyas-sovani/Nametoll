import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { BrainVerdict } from "../../types.ts";

export function parseCreSimulateVerdict(log: string): BrainVerdict {
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
      /\b(SPEND_CAP_TINYBARS_VAR|CRE_ETH_PRIVATE_KEY|SECRET_[A-Z0-9_]+)\s*[=:]\s*\S+/gi,
      "$1=[redacted]",
    );
}

export type SimulateAskOptions = {
  projectDir: string;
  workflowName: string;
  target: string;
  creBin?: string;
};

export async function askCreSimulate(
  options: SimulateAskOptions,
  input: { requestedTinybars: string },
): Promise<BrainVerdict> {
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

  const log = await runCommand(bin, args, options.projectDir);
  return parseCreSimulateVerdict(log);
}

function runCommand(bin: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
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
  input: { requestedTinybars: string },
): Promise<BrainVerdict> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const text = await res.text();
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && "allow" in parsed) {
      return parsed as BrainVerdict;
    }
  } catch {
    return parseCreSimulateVerdict(text);
  }
  throw new Error(`CRE HTTP trigger did not return a verdict (${res.status})`);
}
