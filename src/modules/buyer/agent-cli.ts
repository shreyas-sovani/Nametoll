import { existsSync } from "node:fs";
import { loadConfig } from "../../config.ts";
import { createBrainFromConfig } from "../brain/index.ts";
import { createDirectory, listChildNames } from "../directory/index.ts";
import { createBuyer, loadBuyerCredentials } from "./index.ts";
import { discoverAndPay } from "./agent.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const parent = process.argv[2]?.trim();
const protocols = process.argv[3]
  ?.split(",")
  .map((id) => id.trim())
  .filter(Boolean);

if (!parent) {
  console.error("Pass a parent name. The agent enumerates children — do not paste a desk name.");
  process.exit(1);
}

const config = loadConfig();
const directory = createDirectory({ ensnodeUrl: config.ensnodeUrl });
const result = await discoverAndPay(
  parent,
  {
    directory,
    listChildren: (name) => listChildNames(name, config.ensnodeUrl),
    brain: createBrainFromConfig(config),
    buyer: createBuyer(loadBuyerCredentials()),
    config,
  },
  protocols?.length ? { protocols } : {},
);

console.log(JSON.stringify(result, null, 2));
if (!result.ok) {
  process.exitCode = 1;
}
