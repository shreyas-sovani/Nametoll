import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { parseCreSimulateVerdict, redactCreLog } from "./simulate.ts";

const PROJECT = resolve(process.cwd(), process.env.CRE_PROJECT_DIR ?? "cre");
const WORKFLOW = process.env.CRE_WORKFLOW_NAME ?? "nametoll-brain";
const TARGET = process.env.CRE_TARGET ?? "staging-settings";
const CRE = process.env.CRE_BIN ?? "cre";
const OUT_DIR = resolve(process.cwd(), "docs/partners/chainlink");

const RUNS = [
  {
    name: "allowlist-deny",
    payload: { requestedTinybars: "100000", payer: "0.0.9" },
    env: { BUYER_ALLOWLIST_VAR: "0.0.1", RATE_LIMIT_VAR: "" },
    expectReason: "buyer not allowlisted",
  },
  {
    name: "rate-deny",
    payload: { requestedTinybars: "100000", paysThisHour: "2" },
    env: { BUYER_ALLOWLIST_VAR: "", RATE_LIMIT_VAR: "1" },
    expectReason: "rate limited",
  },
] as const;

if (!existsSync(resolve(PROJECT, "project.yaml"))) {
  throw new Error(`CRE project.yaml not found in ${PROJECT}`);
}

function policyEnvFile(overrides: Record<string, string>): string {
  const source = resolve(PROJECT, ".env");
  const dir = mkdtempSync(join(tmpdir(), "nametoll-cre-policy-"));
  const dest = join(dir, ".env");
  const lines = existsSync(source) ? readFileSync(source, "utf8").split(/\r?\n/) : [];
  const kept = lines.filter((line) => {
    const key = line.split("=", 1)[0];
    return !key || !(key in overrides);
  });
  for (const [key, value] of Object.entries(overrides)) {
    kept.push(`${key}=${value}`);
  }
  writeFileSync(dest, `${kept.join("\n")}\n`);
  return dest;
}

function simulate(
  payload: Record<string, string>,
  extraEnv: Record<string, string>,
): Promise<string> {
  const envFile = policyEnvFile(extraEnv);
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      CRE,
      [
        "--env",
        envFile,
        "--non-interactive",
        "--target",
        TARGET,
        "workflow",
        "simulate",
        WORKFLOW,
        "--trigger-index",
        "0",
        "--http-payload",
        JSON.stringify(payload),
      ],
      {
        cwd: PROJECT,
        env: { ...process.env, ...extraEnv },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      rmSync(resolve(envFile, ".."), { recursive: true, force: true });
      reject(error);
    });
    child.on("close", (code) => {
      rmSync(resolve(envFile, ".."), { recursive: true, force: true });
      if (code !== 0) {
        reject(new Error(`cre workflow simulate exited ${code}\n${redactCreLog(out)}`));
        return;
      }
      resolvePromise(out);
    });
  });
}

mkdirSync(OUT_DIR, { recursive: true });

for (const run of RUNS) {
  const raw = await simulate(run.payload, run.env);
  const redacted = redactCreLog(raw);
  const verdict = parseCreSimulateVerdict(redacted);
  const path = resolve(OUT_DIR, `simulate-${run.name}.log`);
  writeFileSync(path, redacted);
  console.log(`${run.name}: ${JSON.stringify(verdict)} -> ${path}`);
  if (verdict.allow || verdict.reason !== run.expectReason) {
    process.exitCode = 1;
  }
}
