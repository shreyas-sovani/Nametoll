import { existsSync } from "node:fs";
import { loadConfig } from "../../config.ts";
import { createDirectory } from "./index.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const name = process.argv[2]?.trim();
if (!name) {
  console.error("Pass a name to resolve. This command does not ship one.");
  process.exit(1);
}

const resolved = await createDirectory({
  ensnodeUrl: loadConfig().ensnodeUrl,
}).resolve(name);
console.log(JSON.stringify(resolved, null, 2));
