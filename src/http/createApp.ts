import express, { type Express } from "express";
import type { AppConfig } from "../config.ts";
import {
  createBrainFromConfig,
  type Brain,
} from "../modules/brain/index.ts";
import { mountBrain } from "../modules/brain/http.ts";
import { createDirectory, type Directory } from "../modules/directory/index.ts";
import { mountDirectory } from "../modules/directory/http.ts";
import { mountGate } from "../modules/gate/index.ts";
import { createHcsLedger } from "../modules/ledger/hcs.ts";
import { mountLedger } from "../modules/ledger/http.ts";
import type { Ledger } from "../modules/ledger/index.ts";
import {
  createHbarRefundRail,
  type RefundRail,
} from "../modules/ledger/refund.ts";
import { createMerchandise, type Merchandise } from "../modules/merchandise/index.ts";
import type { Buyer } from "../modules/buyer/index.ts";
import { mountBuyer } from "../modules/buyer/http.ts";
import { MODULE_NAMES } from "../types.ts";
import { renderHomePage } from "./homePage.ts";
import { JOIN_PATH } from "../modules/brain/http.ts";

export type AppDeps = {
  ledger?: Ledger;
  merchandise?: Merchandise;
  directory?: Directory;
  brain?: Brain;
  buyer?: Buyer;
  refund?: RefundRail;
};

function resolveBrain(config: AppConfig, deps: AppDeps): Brain {
  if (deps.brain) {
    return { ...deps.brain, source: deps.brain.source ?? "injected" };
  }
  return createBrainFromConfig(config);
}

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
  const brain = resolveBrain(config, deps);
  const buyer = deps.buyer;
  const refund =
    deps.refund ??
    (config.sellerAccountId && config.sellerPrivateKey
      ? createHbarRefundRail(config)
      : undefined);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    const source = brain.source ?? "unavailable";
    res.json({
      ok: true,
      service: "nametoll",
      modules: MODULE_NAMES,
      brain: {
        source,
        configured: source !== "unavailable",
      },
      merchandise: config.graphGatewayKey ? "live" : "stub",
      canPay: Boolean(buyer),
      join: JOIN_PATH,
    });
  });

  app.get("/", (_req, res) => {
    res.type("html").send(renderHomePage(config, { canPay: Boolean(buyer) }));
  });

  mountDirectory(app, directory);
  mountBrain(app, brain);
  mountBuyer(app, { directory, brain, config, ...(buyer ? { buyer } : {}), ...(ledger ? { ledger } : {}) });
  mountGate(app, config, ledger, merchandise, brain, refund);
  mountLedger(app, config, ledger);

  return app;
}
