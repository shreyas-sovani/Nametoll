import express, { type Express } from "express";
import type { AppConfig } from "../config.ts";
import { mountGate } from "../modules/gate/index.ts";
import { createHcsLedger } from "../modules/ledger/hcs.ts";
import { mountLedger } from "../modules/ledger/http.ts";
import type { Ledger } from "../modules/ledger/index.ts";
import { MODULE_NAMES } from "../types.ts";
import { renderHomePage } from "./homePage.ts";

export type AppDeps = {
  ledger?: Ledger;
};

function resolveLedger(config: AppConfig, deps: AppDeps): Ledger | undefined {
  if (deps.ledger) return deps.ledger;
  if (config.hcsTopicId && config.sellerAccountId && config.sellerPrivateKey) {
    return createHcsLedger(config);
  }
  return undefined;
}

export async function createApp(
  config: AppConfig,
  deps: AppDeps = {},
): Promise<Express> {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);
  const ledger = resolveLedger(config, deps);

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "nametoll", modules: MODULE_NAMES });
  });

  app.get("/", (_req, res) => {
    res.type("html").send(renderHomePage(config));
  });

  mountGate(app, config, ledger);
  mountLedger(app, config, ledger);

  return app;
}
