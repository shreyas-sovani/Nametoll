import { existsSync } from "node:fs";
import { loadConfig } from "./config.ts";
import { createApp } from "./http/createApp.ts";
import { tryCreateBuyer } from "./modules/buyer/index.ts";
import { checkGatewayKey } from "./modules/merchandise/index.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const loaded = loadConfig();
let config = loaded;
if (loaded.graphGatewayKey) {
  const accepted = await checkGatewayKey(
    loaded.graphGatewayUrl,
    loaded.graphGatewayKey,
  );
  if (!accepted) {
    console.warn(
      "GRAPH_GATEWAY_KEY was rejected by gateway.thegraph.com (API key not found). Serving a labeled stub so buyers are not charged for empty Graph errors. Put a Subgraph Studio query API key (API Keys tab, not a deploy key) in GRAPH_GATEWAY_KEY.",
    );
    const { graphGatewayKey: _rejected, ...rest } = loaded;
    config = rest;
  }
}
const buyer = tryCreateBuyer();
const app = await createApp(config, buyer ? { buyer } : {});
const port = Number.isFinite(config.port) ? config.port : 8787;

app.listen(port, "0.0.0.0", () => {
  console.log(`nametoll health on http://127.0.0.1:${port}/health`);
});
