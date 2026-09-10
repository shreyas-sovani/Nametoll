import { existsSync } from "node:fs";
import { writeFileSync } from "node:fs";
import { PINNED_PROTOCOLS } from "./deployments.ts";
import { LENDING_RISK_QUERY, createMerchandise } from "./index.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const key = process.env.GRAPH_GATEWAY_KEY;
const gatewayUrl = process.env.GRAPH_GATEWAY_URL ?? "https://gateway.thegraph.com/api";
if (!key) {
  throw new Error("GRAPH_GATEWAY_KEY missing");
}

const INTROSPECTION = `{
  lendingProtocol: __type(name: "LendingProtocol") { fields { name } }
  market: __type(name: "Market") { fields { name } }
}`;

async function introspect(subgraphId: string, label: string) {
  const url = `${gatewayUrl.replace(/\/+$/, "")}/subgraphs/id/${subgraphId}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query: INTROSPECTION }),
  });
  const body = (await res.json()) as {
    data?: {
      lendingProtocol?: { fields?: Array<{ name: string }> };
      market?: { fields?: Array<{ name: string }> };
    };
    errors?: Array<{ message?: string }>;
  };
  return {
    label,
    subgraphId,
    httpStatus: res.status,
    lendingProtocolFields:
      body.data?.lendingProtocol?.fields?.map((field) => field.name) ?? [],
    marketFields: body.data?.market?.fields?.map((field) => field.name) ?? [],
    errors: body.errors?.map((err) => err.message) ?? [],
  };
}

const merchandise = createMerchandise({ gatewayUrl, gatewayKey: key });
const snapshot = await merchandise.snapshot();
const introspected = [];
for (const pin of PINNED_PROTOCOLS) {
  introspected.push(await introspect(pin.subgraphId, pin.id));
}

const report = {
  fetchedAt: new Date().toISOString(),
  source: "POST https://gateway.thegraph.com/api/subgraphs/id/{id} with Studio gateway key",
  query: LENDING_RISK_QUERY.trim(),
  units: snapshot.units,
  stub: snapshot.stub ?? false,
  protocols: snapshot.protocols.map((protocol) => ({
    id: protocol.id,
    ok: protocol.ok,
    error: protocol.error,
    lendingProtocolNames: protocol.lendingProtocols?.map((row) => row.name),
    marketCount: protocol.markets?.length,
    tvlUSD: protocol.lendingProtocols?.[0]?.totalValueLockedUSD,
  })),
  introspection: introspected,
};

writeFileSync(
  "docs/partners/graph/gateway-live-check.json",
  `${JSON.stringify(report, null, 2)}\n`,
);
console.log(JSON.stringify(report, null, 2));
