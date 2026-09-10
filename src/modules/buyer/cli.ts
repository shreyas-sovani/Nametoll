import { existsSync } from "node:fs";
import { createBuyer, loadBuyerCredentials } from "./index.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const deskUrl =
  process.argv[2] ?? process.env.PUBLIC_DESK_URL ?? "http://127.0.0.1:8787";

const buyer = createBuyer(loadBuyerCredentials());
const result = await buyer.payOnce(deskUrl);

console.log(JSON.stringify(result, null, 2));
if (result.status !== 200) {
  process.exitCode = 1;
}
