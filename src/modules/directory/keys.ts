/** ENSIP-5 global key: website URL. */
export const URL_TEXT_KEY = "url";

/** ENSIP-26 entry point. Value is machine-readable desk JSON. */
export const AGENT_CONTEXT_KEY = "agent-context";

/** ENSIP-26 web endpoint. Value is an http(s) URL. */
export const AGENT_ENDPOINT_WEB_KEY = "agent-endpoint[web]";

export const DESK_TEXT_KEYS = {
  url: URL_TEXT_KEY,
  agentContext: AGENT_CONTEXT_KEY,
  agentEndpointWeb: AGENT_ENDPOINT_WEB_KEY,
} as const;

export const DESK_TEXT_KEY_LIST = [
  DESK_TEXT_KEYS.url,
  DESK_TEXT_KEYS.agentContext,
  DESK_TEXT_KEYS.agentEndpointWeb,
] as const;

export type DeskTextKey = (typeof DESK_TEXT_KEY_LIST)[number];
