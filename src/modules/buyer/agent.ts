import type { AppConfig } from "../../config.ts";
import { DeskResolveError } from "../directory/descriptor.ts";
import {
  listDesks,
  pickDesk,
  type DeskListing,
  type ProbeDesk,
} from "../directory/catalog.ts";
import type { Directory } from "../directory/index.ts";
import type { Brain } from "../brain/index.ts";
import type { Ledger } from "../ledger/index.ts";
import type { Buyer } from "./index.ts";
import { payNamedDesk, type DeskInspect, type DeskPayResult } from "./drive.ts";

export type DiscoverDeps = {
  directory: Directory;
  listChildren: (parent: string) => Promise<string[]>;
  probe?: ProbeDesk;
  brain: Brain;
  buyer: Buyer;
  config: AppConfig;
  ledger?: Ledger;
};

export type DiscoverOk = {
  ok: true;
  parent: string;
  considered: DeskListing[];
  chosen: DeskListing;
  result: DeskPayResult;
};

export type DiscoverFail = {
  ok: false;
  parent: string;
  considered: DeskListing[];
  error: string;
  inspect?: DeskInspect;
};

export type DiscoverResult = DiscoverOk | DiscoverFail;

export async function discoverAndPay(
  parent: string,
  deps: DiscoverDeps,
  options: { protocols?: string[] } = {},
): Promise<DiscoverResult> {
  const trimmed = parent.trim();
  if (!trimmed) {
    throw new DeskResolveError("Parent name is required.");
  }
  const catalog = await listDesks(trimmed, {
    directory: deps.directory,
    listChildren: deps.listChildren,
    ...(deps.probe ? { probe: deps.probe } : {}),
  });
  const remaining = [...catalog.desks];
  let lastInspect: DeskInspect | undefined;
  let lastError: string | undefined;

  while (remaining.length) {
    const chosen = pickDesk(
      remaining,
      options.protocols?.length ? { protocols: options.protocols } : {},
    );
    if (!chosen?.name) break;
    try {
      const paid = await payNamedDesk(
        chosen.name,
        deps.directory,
        deps.brain,
        deps.buyer,
        deps.config,
        deps.ledger,
        options.protocols,
        {
          ...(deps.config.buyerAccountId ? { payer: deps.config.buyerAccountId } : {}),
        },
      );
      if (paid.ok) {
        return {
          ok: true,
          parent: trimmed,
          considered: catalog.desks,
          chosen,
          result: paid.result,
        };
      }
      lastInspect = paid.inspect;
      lastError = paid.error ?? (paid.inspect.verdict.reason || "Pay refused");
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Pay failed";
    }
    const index = remaining.findIndex((row) => row.name === chosen.name);
    if (index >= 0) remaining.splice(index, 1);
  }

  return {
    ok: false,
    parent: trimmed,
    considered: catalog.desks,
    error: lastError ?? "No child desk allowed the spend.",
    ...(lastInspect ? { inspect: lastInspect } : {}),
  };
}
