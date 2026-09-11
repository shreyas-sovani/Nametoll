export function hashscanTopicUrl(
  topicId: string,
  network: "testnet" | "mainnet" = "testnet",
): string {
  if (!/^0\.0\.\d+$/.test(topicId)) {
    throw new Error(`Not a Hedera topic id: ${topicId}`);
  }
  return `https://hashscan.io/${network}/topic/${topicId}`;
}

export function hashscanScheduleUrl(
  scheduleId: string,
  network: "testnet" | "mainnet" = "testnet",
): string {
  if (!/^0\.0\.\d+$/.test(scheduleId)) {
    throw new Error(`Not a Hedera schedule id: ${scheduleId}`);
  }
  return `https://hashscan.io/${network}/schedule/${scheduleId}`;
}

export function hashscanTokenUrl(
  tokenId: string,
  network: "testnet" | "mainnet" = "testnet",
): string {
  if (!/^0\.0\.\d+$/.test(tokenId)) {
    throw new Error(`Not a Hedera token id: ${tokenId}`);
  }
  return `https://hashscan.io/${network}/token/${tokenId}`;
}

export function explorerNetwork(
  caip2: string,
): "testnet" | "mainnet" {
  return caip2.endsWith("mainnet") ? "mainnet" : "testnet";
}
