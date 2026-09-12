import { existsSync } from "node:fs";
import { loadConfig } from "../../config.ts";
import { createDirectory } from "../directory/index.ts";
import { ensv2ChildIsLive } from "../directory/expiry.ts";
import { createBuyer, loadBuyerCredentials } from "./index.ts";
import { buyerTargetFromArgv } from "./target.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const target = buyerTargetFromArgv(process.argv);
const protocols = process.argv[3]
  ?.split(",")
  .map((id) => id.trim())
  .filter(Boolean);

if (!target) {
  console.error("Pass a name or a desk URL as the first argument.");
  process.exit(1);
}

const options = protocols?.length ? { protocols } : {};
const buyer = createBuyer(loadBuyerCredentials());
const result =
  target.kind === "url"
    ? await buyer.payOnce(target.value, options)
    : await buyer.payFromName(
        target.value,
        createDirectory({
          ensnodeUrl: loadConfig().ensnodeUrl,
          isLive: ensv2ChildIsLive,
        }),
        options,
      );

console.log(JSON.stringify(result, null, 2));
if (result.status !== 200) {
  process.exitCode = 1;
}
