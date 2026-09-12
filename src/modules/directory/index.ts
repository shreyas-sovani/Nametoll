import type { DeskDescriptor } from "../../types.ts";
import { descriptorFromTexts, DeskResolveError } from "./descriptor.ts";
import {
  fetchTextsFromEnsCli,
  looksLikeTransportFailure,
} from "./enscli-texts.ts";
import { fetchTextsFromOmnigraph } from "./omnigraph.ts";
import { fetchTextsFromResolver } from "./resolver-texts.ts";

export { DESK_TEXT_KEYS, DESK_TEXT_KEY_LIST } from "./keys.ts";
export {
  MAX_EXPIRES_IN,
  MIN_EXPIRES_IN,
  ensv2ChildIsLive,
  isLiveRegistration,
  parseExpiresIn,
} from "./expiry.ts";
export { descriptorFromTexts, DeskResolveError } from "./descriptor.ts";
export {
  DESK_RECORDS_QUERY,
  fetchTextsFromOmnigraph,
  listChildNames,
  metaFromOmnigraph,
  textsFromOmnigraph,
} from "./omnigraph.ts";
export {
  listDesks,
  pickDesk,
  priceTinybarsFromRule,
  probeDesk,
} from "./catalog.ts";
export type {
  DeskCatalog,
  DeskListing,
  DeskProbe,
  DeskStatus,
  ListDesksOptions,
  ProbeDesk,
} from "./catalog.ts";

export type FetchDeskTexts = (name: string) => Promise<Record<string, string>>;

export type ResolvedDesk = {
  name: string;
  descriptor: DeskDescriptor;
};

export type Directory = {
  resolve(name: string): Promise<ResolvedDesk>;
};

export type DirectoryOptions = {
  fetchTexts?: FetchDeskTexts;
  fallbackFetchTexts?: FetchDeskTexts;
  ensnodeUrl?: string;
  isLive?: (name: string) => Promise<boolean>;
};

const REJECTED_NAME = /[?#%\u0000-\u001f]/;

export function createDirectory(options: DirectoryOptions = {}): Directory {
  const primary =
    options.fetchTexts ??
    ((name: string) => fetchTextsFromOmnigraph(name, options.ensnodeUrl));
  const fallback =
    options.fallbackFetchTexts ??
    (async (name: string) => {
      try {
        return await fetchTextsFromResolver(name);
      } catch {
        return await fetchTextsFromEnsCli(name);
      }
    });
  const useFallbackOnTransport = !options.fetchTexts;

  return {
    async resolve(name: string): Promise<ResolvedDesk> {
      const trimmed = name.trim();
      if (!trimmed) {
        throw new DeskResolveError("Name is required.");
      }
      if (REJECTED_NAME.test(trimmed)) {
        throw new DeskResolveError("Name contains characters ENS will not resolve.");
      }

      let texts: Record<string, string>;
      try {
        texts = await primary(trimmed);
      } catch (error) {
        if (!useFallbackOnTransport || !looksLikeTransportFailure(error)) {
          throw error;
        }
        texts = await fallback(trimmed);
      }
      if (!Object.values(texts).some((value) => value.trim())) {
        throw new DeskResolveError(`Unknown name or no desk records: ${trimmed}`);
      }
      if (options.isLive && !(await options.isLive(trimmed))) {
        throw new DeskResolveError(`Expired or unregistered name: ${trimmed}`);
      }

      return {
        name: trimmed,
        descriptor: descriptorFromTexts(texts),
      };
    },
  };
}
