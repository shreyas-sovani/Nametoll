import { existsSync } from "node:fs";
import { loadConfig } from "../../config.ts";
import { loadBuyerCredentials } from "../buyer/index.ts";
import {
  createSubscribeSchedules,
  planFromConfig,
} from "./subscribe-live.ts";
import { DEFAULT_SUBSCRIBE_SLOTS, WEEK_SECONDS } from "./subscribe.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const planOnly = process.argv.includes("--plan");
const slots = readFlag("--slots", DEFAULT_SUBSCRIBE_SLOTS);
const intervalSeconds = readFlag("--interval-sec", WEEK_SECONDS);

const config = loadConfig();
const plan = planFromConfig(config, slots, intervalSeconds);

if (planOnly) {
  console.log(JSON.stringify({ ok: true, broadcast: false, ...plan }, null, 2));
  process.exit(0);
}

const buyer = loadBuyerCredentials();
const created = await createSubscribeSchedules(config, plan, buyer.privateKey);
console.log(
  JSON.stringify(
    {
      ok: true,
      broadcast: true,
      asset: plan.asset,
      waitForExpiry: true,
      schedules: created,
    },
    null,
    2,
  ),
);

function readFlag(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const raw = process.argv[index + 1];
  const value = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}
