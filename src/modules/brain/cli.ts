import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "../../config.ts";
import { withDefaultCreProject } from "./defaults.ts";
import { createBrainFromConfig } from "./index.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}
if (existsSync("cre/.env")) {
  process.loadEnvFile("cre/.env");
}
const creBinDir = join(homedir(), ".cre", "bin");
if (existsSync(join(creBinDir, "cre"))) {
  process.env.PATH = `${creBinDir}:${process.env.PATH ?? ""}`;
}

const requested = process.argv[2];
if (!requested) {
  console.error("Pass requested tinybars, e.g. npm run brain -- 100000");
  process.exit(1);
}

const verdict = await createBrainFromConfig(withDefaultCreProject(loadConfig())).decide({
  requestedTinybars: requested,
});
console.log(JSON.stringify(verdict, null, 2));
if (!verdict.allow) process.exitCode = 1;
