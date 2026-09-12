import { DEFAULT_ENSNODE_URL } from "../../config.ts";
import { looksLikeTransportFailure } from "./enscli-texts.ts";
import { DESK_TEXT_KEY_LIST } from "./keys.ts";
import { listChildNamesFromRegistry } from "./registry-children.ts";

export { DEFAULT_ENSNODE_URL };

/**
 * Vetted Omnigraph shape from the ensskills `domain-records` example.
 * Field names confirmed offline with `enscli ensnode omnigraph schema`.
 */
export const DESK_RECORDS_QUERY = `query DeskRecords($name: InterpretedName!) {
  domain(by: { name: $name }) {
    canonical {
      name {
        interpreted
      }
    }
    resolver {
      assigned {
        contract {
          address
        }
      }
      effective {
        contract {
          address
        }
        extended
      }
    }
    resolve {
      records {
        texts(keys: ["url", "agent-context", "agent-endpoint[web]"]) {
          key
          value
        }
      }
    }
    subdomains(first: 20, order: { by: NAME, dir: ASC }) {
      edges {
        node {
          canonical {
            name {
              interpreted
            }
          }
        }
      }
    }
  }
}`;

type OmnigraphText = { key?: string; value?: string | null };

type OmnigraphDomain = {
  canonical?: { name?: { interpreted?: string } } | null;
  resolver?: {
    assigned?: { contract?: { address?: string } } | null;
    effective?: { contract?: { address?: string }; extended?: boolean } | null;
  };
  resolve?: {
    records?: {
      texts?: OmnigraphText[];
    } | null;
  } | null;
  subdomains?: {
    edges?: Array<{
      node?: { canonical?: { name?: { interpreted?: string } } | null };
    }>;
  };
};

type OmnigraphResponse = {
  data?: { domain?: OmnigraphDomain | null };
  errors?: Array<{ message?: string }>;
};

export type DeskResolutionMeta = {
  interpretedName?: string;
  assignedResolver?: string;
  effectiveResolver?: string;
  wildcardResolver?: boolean;
  children: string[];
};

export function textsFromOmnigraph(body: OmnigraphResponse): Record<string, string> {
  const texts = body.data?.domain?.resolve?.records?.texts ?? [];
  const out: Record<string, string> = {};
  for (const record of texts) {
    if (!record.key || record.value == null || record.value === "") continue;
    if ((DESK_TEXT_KEY_LIST as readonly string[]).includes(record.key)) {
      out[record.key] = record.value;
    }
  }
  return out;
}

export function metaFromOmnigraph(body: OmnigraphResponse): DeskResolutionMeta {
  const domain = body.data?.domain;
  const children =
    domain?.subdomains?.edges
      ?.map((edge) => edge.node?.canonical?.name?.interpreted)
      .filter((name): name is string => Boolean(name)) ?? [];
  return {
    ...(domain?.canonical?.name?.interpreted
      ? { interpretedName: domain.canonical.name.interpreted }
      : {}),
    ...(domain?.resolver?.assigned?.contract?.address
      ? { assignedResolver: domain.resolver.assigned.contract.address }
      : {}),
    ...(domain?.resolver?.effective?.contract?.address
      ? { effectiveResolver: domain.resolver.effective.contract.address }
      : {}),
    ...(domain?.resolver?.effective?.extended != null
      ? { wildcardResolver: domain.resolver.effective.extended }
      : {}),
    children,
  };
}

export async function fetchOmnigraphDomain(
  name: string,
  ensnodeUrl = DEFAULT_ENSNODE_URL,
): Promise<{ texts: Record<string, string>; meta: DeskResolutionMeta }> {
  const url = `${ensnodeUrl.replace(/\/+$/, "")}/api/omnigraph`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      query: DESK_RECORDS_QUERY,
      variables: { name },
    }),
  });
  if (!res.ok) {
    throw new Error(`ENSNode ${res.status} from ${url}`);
  }
  const body = (await res.json()) as OmnigraphResponse;
  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message ?? "omnigraph").join("; "));
  }
  return { texts: textsFromOmnigraph(body), meta: metaFromOmnigraph(body) };
}

export async function fetchTextsFromOmnigraph(
  name: string,
  ensnodeUrl = DEFAULT_ENSNODE_URL,
): Promise<Record<string, string>> {
  return (await fetchOmnigraphDomain(name, ensnodeUrl)).texts;
}

export async function listChildNames(
  parent: string,
  ensnodeUrl = DEFAULT_ENSNODE_URL,
): Promise<string[]> {
  try {
    return (await fetchOmnigraphDomain(parent, ensnodeUrl)).meta.children;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fallback = looksLikeTransportFailure(error) || /ENSNode [45]/i.test(message);
    if (!fallback) {
      throw error;
    }
    return await listChildNamesFromRegistry(parent);
  }
}
