import type { DeskDescriptor } from "../../types.ts";
import { DeskResolveError } from "./descriptor.ts";
import type { Directory } from "./index.ts";

export type DeskStatus = "live" | "unresolved" | "unreachable";

export type DeskListing = {
  name: string;
  status: DeskStatus;
  priceRule?: string;
  priceTinybars?: string;
  endpoint?: string;
  payTo?: string;
  hcsTopic?: string;
  asset?: DeskDescriptor["asset"];
  protocols?: string[];
};

export type DeskCatalog = {
  parent: string;
  desks: DeskListing[];
};

export type DeskProbe = {
  reachable: boolean;
  protocols?: string[];
};

export type ProbeDesk = (endpoint: string) => Promise<DeskProbe>;

export type ListDesksOptions = {
  directory: Directory;
  listChildren: (parent: string) => Promise<string[]>;
  probe?: ProbeDesk;
};

export function priceTinybarsFromRule(priceRule: string): string | undefined {
  const match = priceRule.match(/\d+/);
  return match?.[0];
}

export function pickDesk(
  desks: readonly DeskListing[],
  options: { protocols?: string[] } = {},
): DeskListing | undefined {
  const wanted = options.protocols?.filter(Boolean) ?? [];
  const live = desks.filter((desk) => desk.status === "live");
  const covering = wanted.length
    ? live.filter((desk) => wanted.every((id) => desk.protocols?.includes(id)))
    : live;
  const pool = covering.length ? covering : live;
  return [...pool].sort((left, right) => {
    const leftPrice = BigInt(left.priceTinybars ?? "0");
    const rightPrice = BigInt(right.priceTinybars ?? "0");
    if (leftPrice !== rightPrice) return leftPrice < rightPrice ? -1 : 1;
    return left.name.localeCompare(right.name);
  })[0];
}

export async function listDesks(
  parent: string,
  options: ListDesksOptions,
): Promise<DeskCatalog> {
  const trimmed = parent.trim();
  if (!trimmed) {
    throw new DeskResolveError("Parent name is required.");
  }
  const children = await options.listChildren(trimmed);
  const desks = await Promise.all(
    children.map(async (name): Promise<DeskListing> => {
      try {
        const resolved = await options.directory.resolve(name);
        const probe = options.probe
          ? await options.probe(resolved.descriptor.endpoint)
          : { reachable: true };
        const priceTinybars = priceTinybarsFromRule(resolved.descriptor.priceRule);
        return {
          name: resolved.name,
          status: probe.reachable ? "live" : "unreachable",
          priceRule: resolved.descriptor.priceRule,
          ...(priceTinybars ? { priceTinybars } : {}),
          endpoint: resolved.descriptor.endpoint,
          payTo: resolved.descriptor.payTo,
          hcsTopic: resolved.descriptor.hcsTopic,
          asset: resolved.descriptor.asset,
          ...(probe.protocols?.length ? { protocols: probe.protocols } : {}),
        };
      } catch (error) {
        if (error instanceof DeskResolveError) {
          return { name, status: "unresolved" };
        }
        return { name, status: "unreachable" };
      }
    }),
  );
  return { parent: trimmed, desks };
}

export async function probeDesk(
  endpoint: string,
  fetchImpl: typeof fetch = fetch,
): Promise<DeskProbe> {
  const origin = endpoint.replace(/\/+$/, "");
  try {
    const offerRes = await fetchImpl(`${origin}/desk/offer`, {
      headers: { accept: "application/json", "ngrok-skip-browser-warning": "1" },
      signal: AbortSignal.timeout(4_000),
    });
    if (offerRes.ok) {
      const body = (await offerRes.json()) as { protocols?: unknown };
      const protocols = Array.isArray(body.protocols)
        ? body.protocols.filter((id): id is string => typeof id === "string" && Boolean(id))
        : [];
      return { reachable: true, ...(protocols.length ? { protocols } : {}) };
    }
  } catch {
    // Fall through to an unpaid snapshot probe.
  }
  try {
    const snap = await fetchImpl(`${origin}/desk/snapshot`, {
      headers: { accept: "application/json", "ngrok-skip-browser-warning": "1" },
      signal: AbortSignal.timeout(4_000),
    });
    if (snap.status === 402) return { reachable: true };
  } catch {
    // Unreachable origin.
  }
  return { reachable: false };
}
