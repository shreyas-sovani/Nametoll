import express, { type Express } from "express";
import type { AppConfig } from "../config.ts";
import { createDirectory, type Directory } from "../modules/directory/index.ts";
import { mountDirectory } from "../modules/directory/http.ts";
import { mountGate } from "../modules/gate/index.ts";
import { createHcsLedger } from "../modules/ledger/hcs.ts";
import { mountLedger } from "../modules/ledger/http.ts";
import type { Ledger } from "../modules/ledger/index.ts";
import { createMerchandise, type Merchandise } from "../modules/merchandise/index.ts";
import { MODULE_NAMES } from "../types.ts";
import { renderHomePage } from "./homePage.ts";

export type AppDeps = {
  ledger?: Ledger;
  merchandise?: Merchandise;
  directory?: Directory;
};

function resolveLedger(config: AppConfig, deps: AppDeps): Ledger | undefined {
  if (deps.ledger) return deps.ledger;
  if (config.hcsTopicId && config.sellerAccountId && config.sellerPrivateKey) {
    return createHcsLedger(config);
  }
  return undefined;
}

function resolveMerchandise(config: AppConfig, deps: AppDeps): Merchandise {
  if (deps.merchandise) return deps.merchandise;
  return createMerchandise({
    gatewayUrl: config.graphGatewayUrl,
    ...(config.graphGatewayKey ? { gatewayKey: config.graphGatewayKey } : {}),
  });
}

function resolveDirectory(config: AppConfig, deps: AppDeps): Directory {
  if (deps.directory) return deps.directory;
  return createDirectory({ ensnodeUrl: config.ensnodeUrl });
}

export async function createApp(
  config: AppConfig,
  deps: AppDeps = {},
): Promise<Express> {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", true);
  const ledger = resolveLedger(config, deps);
  const merchandise = resolveMerchandise(config, deps);
  const directory = resolveDirectory(config, deps);

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "nametoll", modules: MODULE_NAMES });
  });

  app.get("/", (_req, res) => {
    res.type("html").send(renderHomePage(config));
  });

  mountDirectory(app, directory);
  mountGate(app, config, ledger, merchandise);
  mountLedger(app, config, ledger);

  return app;
}
