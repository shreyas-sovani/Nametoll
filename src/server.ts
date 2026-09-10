import { existsSync } from "node:fs";
import { loadConfig } from "./config.ts";
import { createApp } from "./http/createApp.ts";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const config = loadConfig();
const app = await createApp(config);
const port = Number.isFinite(config.port) ? config.port : 8787;

app.listen(port, "0.0.0.0", () => {
  console.log(`nametoll health on http://127.0.0.1:${port}/health`);
});
