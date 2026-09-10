import { existsSync } from "node:fs";
import { privateKeyToAccount } from "viem/accounts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

function readKey(name: string): `0x${string}` {
  let raw = process.env[name]?.trim();
  if (!raw) {
    throw new Error(`Set ${name} in .env (testnet key, never commit it).`);
  }
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim();
  }
  const body = raw.replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{64}$/.test(body)) {
    throw new Error(`${name} is not a 32-byte hex private key.`);
  }
  return `0x${body}` as `0x${string}`;
}

export function loadSepoliaAccounts() {
  const ownerKey = readKey("ACC_1_PRIV_KEY");
  const operatorKey = readKey("ACC3_PRIV_KEY");
  const owner = privateKeyToAccount(ownerKey);
  const operator = privateKeyToAccount(operatorKey);
  return { owner, operator };
}
