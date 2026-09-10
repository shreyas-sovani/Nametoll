import { existsSync, writeFileSync } from "node:fs";
import { PINNED_PROTOCOLS } from "./deployments.ts";
import { LENDING_RISK_QUERY } from "./index.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const gatewayKey: string = process.env.GRAPH_GATEWAY_KEY?.trim() ?? "";
if (!gatewayKey) throw new Error("GRAPH_GATEWAY_KEY missing");

const MCP_ORIGIN = "https://subgraphs.mcp.thegraph.com";

type JsonRpc = {
  jsonrpc: "2.0";
  id?: number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { message?: string };
};

async function openSession(): Promise<{
  sessionId: string;
  read: () => Promise<JsonRpc>;
  close: () => Promise<void>;
}> {
  const res = await fetch(`${MCP_ORIGIN}/sse`, {
    headers: {
      accept: "text/event-stream",
      authorization: `Bearer ${gatewayKey}`,
    },
  });
  if (!res.ok || !res.body) {
    throw new Error(`MCP SSE ${res.status}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sessionId = "";

  const nextEvent = async (): Promise<{ event: string; data: string }> => {
    while (true) {
      const idx = buffer.indexOf("\n\n");
      if (idx >= 0) {
        const raw = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        let event = "message";
        const dataLines: string[] = [];
        for (const line of raw.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
        }
        return { event, data: dataLines.join("\n") };
      }
      const { value, done } = await reader.read();
      if (done) throw new Error("MCP SSE closed");
      buffer += decoder.decode(value, { stream: true });
    }
  };

  const first = await nextEvent();
  if (first.event !== "endpoint") {
    throw new Error(`expected MCP endpoint event, got ${first.event}`);
  }
  const url = new URL(first.data, MCP_ORIGIN);
  sessionId = url.searchParams.get("sessionId") ?? "";
  if (!sessionId) throw new Error("MCP sessionId missing");

  return {
    sessionId,
    read: async () => {
      const evt = await nextEvent();
      return JSON.parse(evt.data) as JsonRpc;
    },
    close: async () => {
      await reader.cancel();
    },
  };
}

async function rpc(
  sessionId: string,
  payload: JsonRpc,
): Promise<Response> {
  return fetch(`${MCP_ORIGIN}/messages?sessionId=${sessionId}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${gatewayKey}`,
    },
    body: JSON.stringify(payload),
  });
}

const REQUIRED_PROTOCOL_FIELDS = [
  "id",
  "name",
  "slug",
  "network",
  "schemaVersion",
  "totalValueLockedUSD",
  "totalDepositBalanceUSD",
  "totalBorrowBalanceUSD",
];
const REQUIRED_MARKET_FIELDS = [
  "id",
  "name",
  "isActive",
  "maximumLTV",
  "liquidationThreshold",
  "totalValueLockedUSD",
  "totalDepositBalanceUSD",
  "totalBorrowBalanceUSD",
  "inputToken",
];

function toolText(result: JsonRpc): string {
  const payload = result.result as
    | { content?: Array<{ text?: string }>; isError?: boolean }
    | undefined;
  const text = payload?.content?.map((part) => part.text ?? "").join("\n") ?? "";
  return text.replaceAll(gatewayKey, "<redacted>");
}

function fieldsForType(sdl: string, typeName: string): string[] {
  const block = sdl.match(new RegExp(`type ${typeName}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`));
  if (!block?.[1]) return [];
  return [...block[1].matchAll(/^\s{2}([A-Za-z_]\w*)\s*[:(]/gm)].map((match) => match[1]!);
}

function summarize(row: unknown): unknown {
  const record = row as {
    id: string;
    subgraphId: string;
    result: JsonRpc;
  };
  const text = toolText(record.result);
  const protocolFields = fieldsForType(text, "LendingProtocol");
  const marketFields = fieldsForType(text, "Market");
  const names = [...text.matchAll(/"name"\s*:\s*"([^"]+)"/g)].map((match) => match[1]);
  return {
    id: record.id,
    subgraphId: record.subgraphId,
    error: record.result.error?.message,
    isError: Boolean(record.result.error) || /api key not found|auth error/i.test(text),
    protocolFieldsPresent: REQUIRED_PROTOCOL_FIELDS.filter((field) =>
      protocolFields.includes(field),
    ),
    protocolFieldsMissing: REQUIRED_PROTOCOL_FIELDS.filter(
      (field) => protocolFields.length > 0 && !protocolFields.includes(field),
    ),
    marketFieldsPresent: REQUIRED_MARKET_FIELDS.filter((field) => marketFields.includes(field)),
    marketFieldsMissing: REQUIRED_MARKET_FIELDS.filter(
      (field) => marketFields.length > 0 && !marketFields.includes(field),
    ),
    lendingProtocolNames: names.slice(0, 4),
  };
}

const session = await openSession();
try {
  const posted = await rpc(session.sessionId, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "nametoll-probe", version: "0.1.0" },
    },
  });
  const initHttp = posted.status;
  const init = await session.read();

  await rpc(session.sessionId, {
    jsonrpc: "2.0",
    method: "notifications/initialized",
  });

  await rpc(session.sessionId, {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  });
  const listed = await session.read();
  const toolRows = Array.isArray((listed.result as { tools?: unknown })?.tools)
    ? ((listed.result as { tools: Array<{ name?: string }> }).tools)
    : [];
  const tools = toolRows.map((tool) => tool.name).filter(Boolean);

  const schemas: unknown[] = [];
  const queries: unknown[] = [];
  let id = 3;
  for (const pin of PINNED_PROTOCOLS) {
    await rpc(session.sessionId, {
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: {
        name: "get_schema_by_subgraph_id",
        arguments: { subgraph_id: pin.subgraphId },
      },
    });
    schemas.push({ id: pin.id, subgraphId: pin.subgraphId, result: await session.read() });
    id += 1;

    await rpc(session.sessionId, {
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: {
        name: "execute_query_by_subgraph_id",
        arguments: {
          subgraph_id: pin.subgraphId,
          query: LENDING_RISK_QUERY,
        },
      },
    });
    queries.push({ id: pin.id, subgraphId: pin.subgraphId, result: await session.read() });
    id += 1;
  }

  const report = {
    fetchedAt: new Date().toISOString(),
    source: "Subgraph MCP https://subgraphs.mcp.thegraph.com/sse",
    initHttp,
    initializeError: init.error?.message,
    tools,
    schemas: schemas.map((row) => summarize(row)),
    queries: queries.map((row) => summarize(row)),
  };
  writeFileSync(
    "docs/partners/graph/mcp-live-check.json",
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await session.close();
}
