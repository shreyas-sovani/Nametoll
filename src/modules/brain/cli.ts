import { existsSync } from "node:fs";
import { loadConfig } from "../../config.ts";
import { createBrainFromConfig } from "./index.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const requested = process.argv[2];
if (!requested) {
  console.error("Pass requested tinybars, e.g. npm run brain -- 100000");
  process.exit(1);
}

const verdict = await createBrainFromConfig(loadConfig()).decide({
  requestedTinybars: requested,
});
console.log(JSON.stringify(verdict, null, 2));
if (!verdict.allow) process.exitCode = 1;
