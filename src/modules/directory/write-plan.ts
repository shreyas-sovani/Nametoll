import { HBAR_ASSET } from "../../config.ts";
import { DESK_TEXT_KEYS } from "./keys.ts";

/** Official preview install from vendor/ens-cli/README.md. Writes stay unsigned. */
export const ENS_CLI = 'npx --yes "https://pkg.pr.new/ensdomains/cli/@ensdomains/cli@main"';

export type WritePlanInput = {
  owner: string;
  operator: string;
  parent?: string;
  child?: string;
  endpoint: string;
  payTo: string;
  priceRule: string;
  hcsTopic: string;
};

export type WriteStep = {
  title: string;
  command: string;
  note?: string;
};

export type WritePlan = {
  broadcast: false;
  steps: WriteStep[];
};

function shellSingle(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function writePlan(input: WritePlanInput): WritePlan {
  const parent = input.parent?.trim();
  if (!parent) {
    throw new Error("Parent name is required. Pass it as an argument — do not bake one in.");
  }
  const childLabel = input.child?.trim();
  const child = childLabel ? `${childLabel}.${parent}` : undefined;
  const context = JSON.stringify({
    payTo: input.payTo,
    priceRule: input.priceRule,
    hcsTopic: input.hcsTopic,
    asset: HBAR_ASSET,
  });
  const batch = JSON.stringify([
    { type: "text", key: DESK_TEXT_KEYS.url, value: input.endpoint },
    { type: "text", key: DESK_TEXT_KEYS.agentEndpointWeb, value: input.endpoint },
    { type: "text", key: DESK_TEXT_KEYS.agentContext, value: context },
  ]);

  const steps: WriteStep[] = [
    {
      title: "Deploy the owner Permissioned Resolver",
      command: `${ENS_CLI} resolver deploy ${input.owner} --chain sepolia --json`,
      note: "Broadcast from the owner. Save predicted `resolver`. Do not register with the zero resolver.",
    },
    {
      title: "Register commit (pass the predicted resolver)",
      command: `${ENS_CLI} register commit ${parent} --owner ${input.owner} --resolver <RESOLVER> --chain sepolia --json`,
      note: "Save `secret`. Wait at least 60s after the commit is mined. --reverse-record is ENSv1-only; do not use it.",
    },
    {
      title: "Register reveal",
      command: `${ENS_CLI} register reveal ${parent} --owner ${input.owner} --secret <SECRET> --value <RENT> --resolver <RESOLVER> --chain sepolia --json`,
    },
    {
      title: "Deploy the parent UserRegistry",
      command: `${ENS_CLI} subregistry deploy ${parent} --deployer ${input.owner} --chain sepolia --json`,
    },
    {
      title: "Attach the subregistry",
      command: `${ENS_CLI} subregistry set ${parent} --registry <SUBREGISTRY> --chain sepolia --json`,
    },
  ];

  if (child) {
    steps.push({
      title: "Create a child under the parent subregistry",
      command: `${ENS_CLI} subname create ${child} --owner ${input.owner} --resolver <RESOLVER> --chain sepolia --json`,
      note: "Same Permissioned Resolver as the parent. IExtendedResolver / ENSIP-10 wildcard is on that resolver.",
    });
  }

  steps.push(
    {
      title: "Set documented desk text records",
      command: `${ENS_CLI} set batch ${parent} --resolver <RESOLVER> --chain sepolia --data ${shellSingle(batch)}`,
      note: "Keys are ENSIP-5 `url` and ENSIP-26 `agent-context` / `agent-endpoint[web]` only.",
    },
    {
      title: "EAC: operator may edit those text keys only",
      command: [
        `authorizeTextRoles(dnsName(${parent}), "${DESK_TEXT_KEYS.url}", ${input.operator}, true)`,
        `authorizeTextRoles(dnsName(${parent}), "${DESK_TEXT_KEYS.agentContext}", ${input.operator}, true)`,
        `authorizeTextRoles(dnsName(${parent}), "${DESK_TEXT_KEYS.agentEndpointWeb}", ${input.operator}, true)`,
      ].join(" && "),
      note: "Official Permissioned Resolver API — ens-cli has no grant command. ROLE_SET_TEXT (1<<4) on those keys only. Do not grant registry transfer roles, so the operator cannot transfer the name.",
    },
  );

  return { broadcast: false, steps };
}
