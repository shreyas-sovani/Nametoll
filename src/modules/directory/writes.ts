import { existsSync } from "node:fs";
import { loadConfig, publishedDeskOrigin } from "../../config.ts";
import { writePlan } from "./write-plan.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const config = loadConfig();
const parent = flag("parent");
const child = flag("child");
const plan = writePlan({
  owner: flag("owner") ?? process.env.ENS_OWNER_ADDRESS ?? "",
  operator: flag("operator") ?? process.env.ENS_OPERATOR_ADDRESS ?? "",
  ...(parent ? { parent } : {}),
  ...(child ? { child } : {}),
  endpoint: flag("endpoint") ?? publishedDeskOrigin(config.publicDeskUrl),
  payTo: flag("pay-to") ?? config.sellerAccountId ?? "",
  priceRule: `${config.priceTinybars} tinybars per protocol`,
  hcsTopic: flag("hcs-topic") ?? config.hcsTopicId ?? "",
});

console.log(JSON.stringify(plan, null, 2));
console.error(
  "Unsigned only. Broadcast each {to,data,value} from the owner wallet. Do not paste private keys here.",
);
