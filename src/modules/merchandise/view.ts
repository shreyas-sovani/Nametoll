import type { ProtocolResult } from "./index.ts";

export type MerchandiseProtocolView = {
  id: string;
  label?: string;
  ok: boolean;
  error?: string;
  tvl?: string;
};

export type MerchandiseView = {
  stub: boolean;
  ok: boolean;
  units?: number;
  protocols: MerchandiseProtocolView[];
};

export function viewMerchandise(body: unknown): MerchandiseView {
  if (!body || typeof body !== "object") {
    return { stub: false, ok: false, protocols: [] };
  }
  const record = body as Record<string, unknown>;
  const protocols = Array.isArray(record.protocols)
    ? record.protocols.map(viewProtocol).filter((row): row is MerchandiseProtocolView => Boolean(row))
    : [];
  return {
    stub: record.stub === true,
    ok: record.ok === true,
    ...(typeof record.units === "number" ? { units: record.units } : {}),
    protocols,
  };
}

function viewProtocol(value: unknown): MerchandiseProtocolView | undefined {
  if (!value || typeof value !== "object") return undefined;
  const row = value as ProtocolResult & { lendingProtocols?: Array<{ totalValueLockedUSD?: string }> };
  if (typeof row.id !== "string") return undefined;
  const tvl = row.lendingProtocols?.[0]?.totalValueLockedUSD;
  return {
    id: row.id,
    ...(typeof row.label === "string" ? { label: row.label } : {}),
    ok: row.ok === true,
    ...(typeof row.error === "string" ? { error: row.error } : {}),
    ...(typeof tvl === "string" ? { tvl } : {}),
  };
}
