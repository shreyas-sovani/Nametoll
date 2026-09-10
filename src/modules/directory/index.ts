import type { DeskDescriptor } from "../../types.ts";
import { descriptorFromTexts, DeskResolveError } from "./descriptor.ts";
import {
  fetchTextsFromEnsCli,
  looksLikeTransportFailure,
} from "./enscli-texts.ts";
import { fetchTextsFromOmnigraph } from "./omnigraph.ts";

export { DESK_TEXT_KEYS, DESK_TEXT_KEY_LIST } from "./keys.ts";
export { descriptorFromTexts, DeskResolveError } from "./descriptor.ts";
export {
  DESK_RECORDS_QUERY,
  fetchTextsFromOmnigraph,
  textsFromOmnigraph,
} from "./omnigraph.ts";

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
};

const REJECTED_NAME = /[?#%\u0000-\u001f]/;

export function createDirectory(options: DirectoryOptions = {}): Directory {
  const primary =
    options.fetchTexts ??
    ((name: string) => fetchTextsFromOmnigraph(name, options.ensnodeUrl));
  const fallback = options.fallbackFetchTexts ?? fetchTextsFromEnsCli;
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

      return {
        name: trimmed,
        descriptor: descriptorFromTexts(texts),
      };
    },
  };
}
