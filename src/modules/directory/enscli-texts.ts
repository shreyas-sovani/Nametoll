import { spawn } from "node:child_process";
import { DESK_TEXT_KEY_LIST } from "./keys.ts";
import { ENS_CLI } from "./write-plan.ts";

export type EnsTextResult = {
  key?: string;
  value?: string | null;
};

export function looksLikeTransportFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /fetch failed|ENOTFOUND|ECONN|TLS|certificate|altnames|ENSNode [45]|E404|pkg\.pr\.new/i.test(
    message,
  );
}

async function runEnsGetText(args: string[]): Promise<EnsTextResult> {
  const command = `${ENS_CLI} ${args.join(" ")}`;
  return await new Promise((resolve, reject) => {
    const child = spawn(command, { shell: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `ens get text exited ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout) as EnsTextResult);
      } catch {
        reject(new Error("ens get text did not return JSON"));
      }
    });
  });
}

export async function fetchTextsFromEnsCli(
  name: string,
  getText: (args: string[]) => Promise<EnsTextResult> = runEnsGetText,
): Promise<Record<string, string>> {
  const texts: Record<string, string> = {};
  for (const key of DESK_TEXT_KEY_LIST) {
    const result = await getText([
      "get",
      "text",
      name,
      "--key",
      key,
      "--chain",
      "sepolia",
      "--json",
    ]);
    if (typeof result.value === "string" && result.value.trim()) {
      texts[key] = result.value;
    }
  }
  return texts;
}
