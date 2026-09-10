import express, { type Express } from "express";
import type { AppConfig } from "../config.ts";
import { mountGate } from "../modules/gate/index.ts";
import { MODULE_NAMES } from "../types.ts";
import { renderHomePage } from "./homePage.ts";

export async function createApp(config: AppConfig): Promise<Express> {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "nametoll", modules: MODULE_NAMES });
  });

  app.get("/", (_req, res) => {
    res.type("html").send(renderHomePage(config));
  });

  mountGate(app, config);

  return app;
}
