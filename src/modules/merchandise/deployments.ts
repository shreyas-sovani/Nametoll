/** Pinned from docs/partners/graph/deployments.json (Messari deployment.json, status prod). */
export type PinnedProtocol = {
  id: string;
  label: string;
  network: string;
  subgraphId: string;
};

export const PINNED_PROTOCOLS: readonly PinnedProtocol[] = [
  {
    id: "aave-v3-ethereum",
    label: "Aave v3 Ethereum",
    network: "ethereum",
    subgraphId: "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk",
  },
  {
    id: "compound-v3-ethereum",
    label: "Compound v3 Ethereum",
    network: "ethereum",
    subgraphId: "AwoxEZbiWLvv6e3QdvdMZw4WDURdGbvPfHmZRc8Dpfz9",
  },
];

export function pinnedProtocol(id: string): PinnedProtocol | undefined {
  return PINNED_PROTOCOLS.find((protocol) => protocol.id === id);
}
