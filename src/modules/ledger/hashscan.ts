export function hashscanTopicUrl(
  topicId: string,
  network: "testnet" | "mainnet" = "testnet",
): string {
  if (!/^0\.0\.\d+$/.test(topicId)) {
    throw new Error(`Not a Hedera topic id: ${topicId}`);
  }
  return `https://hashscan.io/${network}/topic/${topicId}`;
}

export function explorerNetwork(
  caip2: string,
): "testnet" | "mainnet" {
  return caip2.endsWith("mainnet") ? "mainnet" : "testnet";
}
