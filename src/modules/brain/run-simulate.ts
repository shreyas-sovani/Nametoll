import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { parseCreSimulateVerdict, redactCreLog } from "./simulate.ts";

const PROJECT = resolve(process.cwd(), process.env.CRE_PROJECT_DIR ?? "cre");
const WORKFLOW = process.env.CRE_WORKFLOW_NAME ?? "nametoll-brain";
const TARGET = process.env.CRE_TARGET ?? "staging-settings";
const CRE = process.env.CRE_BIN ?? "cre";
const OUT_DIR = resolve(process.cwd(), "docs/partners/chainlink");

const RUNS = [
  { name: "allow", requestedTinybars: "100000" },
  { name: "deny", requestedTinybars: "200000" },
] as const;

if (!existsSync(resolve(PROJECT, "project.yaml"))) {
  throw new Error(`CRE project.yaml not found in ${PROJECT}`);
}

function simulate(requestedTinybars: string): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      CRE,
      [
        "workflow",
        "simulate",
        WORKFLOW,
        "--non-interactive",
        "--trigger-index",
        "0",
        "--http-payload",
        JSON.stringify({ requestedTinybars }),
        "--target",
        TARGET,
      ],
      { cwd: PROJECT, env: process.env, stdio: ["ignore", "pipe", "pipe"] },
    );
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
      resolvePromise(out);
    });
  });
}

mkdirSync(OUT_DIR, { recursive: true });

for (const run of RUNS) {
  const raw = await simulate(run.requestedTinybars);
  const redacted = redactCreLog(raw);
  const verdict = parseCreSimulateVerdict(redacted);
  const path = resolve(OUT_DIR, `simulate-${run.name}.log`);
  writeFileSync(path, redacted);
  console.log(`${run.name}: ${JSON.stringify(verdict)} -> ${path}`);
  if (run.name === "allow" && !verdict.allow) process.exitCode = 1;
  if (run.name === "deny" && verdict.allow) process.exitCode = 1;
}
