import { existsSync } from "node:fs";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const key = process.env.GRAPH_GATEWAY_KEY;
if (!key) throw new Error("GRAPH_GATEWAY_KEY missing");
const sid = "JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk";
const query = { query: "{ _meta { block { number } } }" };

const attempts: Array<[string, string, Record<string, string>]> = [
  [
    "bearer_gateway",
    `https://gateway.thegraph.com/api/subgraphs/id/${sid}`,
    { authorization: `Bearer ${key}` },
  ],
  [
    "path_gateway",
    `https://gateway.thegraph.com/api/${key}/subgraphs/id/${sid}`,
    {},
  ],
  [
    "bearer_arb",
    `https://gateway-arbitrum.network.thegraph.com/api/subgraphs/id/${sid}`,
    { authorization: `Bearer ${key}` },
  ],
  [
    "path_arb",
    `https://gateway-arbitrum.network.thegraph.com/api/${key}/subgraphs/id/${sid}`,
    {},
  ],
];

for (const [name, url, extra] of attempts) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...extra },
    body: JSON.stringify(query),
  });
  const text = (await res.text()).replaceAll(key, "<redacted>").slice(0, 240);
  console.log(name, res.status, text);
}
