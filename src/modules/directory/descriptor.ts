import { HBAR_ASSET } from "../../config.ts";
import type { DeskDescriptor } from "../../types.ts";
import { DESK_TEXT_KEYS } from "./keys.ts";

const HEDERA_ID = /^0\.0\.\d+$/;

type AgentContextValue = {
  endpoint?: unknown;
  payTo?: unknown;
  priceRule?: unknown;
  hcsTopic?: unknown;
  asset?: unknown;
};

export class DeskResolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeskResolveError";
  }
}

function readText(texts: Record<string, string>, key: string): string | undefined {
  const value = texts[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseAgentContext(raw: string | undefined): AgentContextValue {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      throw new DeskResolveError("agent-context must be JSON describing the desk.");
    }
    return parsed as AgentContextValue;
  } catch (error) {
    if (error instanceof DeskResolveError) throw error;
    throw new DeskResolveError("agent-context must be JSON describing the desk.");
  }
}

function requireHederaId(value: unknown, label: string): string {
  if (typeof value !== "string" || !HEDERA_ID.test(value.trim())) {
    throw new DeskResolveError(`${label} must be a Hedera account or topic id (0.0.… ).`);
  }
  return value.trim();
}

function requireHttpUrl(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value.trim())) {
    throw new DeskResolveError(`${label} must be an http(s) URL.`);
  }
  return value.trim();
}

function requirePriceRule(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new DeskResolveError("priceRule is required in agent-context.");
  }
  return value.trim();
}

export function descriptorFromTexts(texts: Record<string, string>): DeskDescriptor {
  const context = parseAgentContext(readText(texts, DESK_TEXT_KEYS.agentContext));
  const endpoint =
    readText(texts, DESK_TEXT_KEYS.agentEndpointWeb) ??
    readText(texts, DESK_TEXT_KEYS.url) ??
    (typeof context.endpoint === "string" ? context.endpoint : undefined);

  if (context.asset !== HBAR_ASSET) {
    throw new DeskResolveError(`Desk asset must be ${HBAR_ASSET} (HBAR).`);
  }

  return {
    endpoint: requireHttpUrl(endpoint, "endpoint"),
    payTo: requireHederaId(context.payTo, "payTo"),
    priceRule: requirePriceRule(context.priceRule),
    hcsTopic: requireHederaId(context.hcsTopic, "hcsTopic"),
    asset: HBAR_ASSET,
  };
}
