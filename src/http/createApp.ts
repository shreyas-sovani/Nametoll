import express, { type Express, type Request, type Response } from "express";
import type { AppConfig } from "../config.ts";
import {
  createBrainFromConfig,
  createPayWindow,
  startBrainKeepWarm,
  type Brain,
  warmBrain,
  warmTinybars,
  VERDICT_TTL_MS,
} from "../modules/brain/index.ts";
import { mountBrain } from "../modules/brain/http.ts";
import { createDirectory, type Directory } from "../modules/directory/index.ts";
import { ensv2ChildIsLive } from "../modules/directory/expiry.ts";
import { mountDirectory } from "../modules/directory/http.ts";
import type { ProbeDesk } from "../modules/directory/catalog.ts";
import { mountGate } from "../modules/gate/index.ts";
import { deskOffer, OFFER_PATH } from "../modules/merchandise/offer.ts";
import { createHcsLedger } from "../modules/ledger/hcs.ts";
import { mountLedger } from "../modules/ledger/http.ts";
import type { Ledger } from "../modules/ledger/index.ts";
import { mountSubscribe } from "../modules/ledger/subscribe-http.ts";
import type { LookupSchedule } from "../modules/ledger/subscribe-http.ts";
import {
  createHbarRefundRail,
  type RefundRail,
} from "../modules/ledger/refund.ts";
import { createMerchandise, type Merchandise } from "../modules/merchandise/index.ts";
import type { Buyer } from "../modules/buyer/index.ts";
import { mountBuyer } from "../modules/buyer/http.ts";
import { mountGuestSession } from "../modules/buyer/session-http.ts";
import {
  createMemoryGuestStore,
  faucetFloorFrom,
  faucetTinybarsFrom,
  guestMaxActiveFrom,
  tryCreateGuestFaucet,
  type GuestFaucet,
  type GuestStore,
} from "../modules/buyer/session.ts";
import {
  deskRunway,
  readSellerTinybars,
  type SellerBalanceReader,
} from "../modules/buyer/runway.ts";
import {
  createPayRateLimiter,
  DEFAULT_PAY_GLOBAL_MAX,
  DEFAULT_PAY_RATE_MAX,
  DEFAULT_PAY_RATE_WINDOW_MS,
} from "../modules/buyer/pay-guard.ts";
import { mountRegister } from "../modules/directory/register-http.ts";
import { issueDeskChild } from "../modules/directory/issue-subname.ts";
import type { IssueChild } from "../modules/directory/register.ts";
import { MODULE_NAMES } from "../types.ts";
import {
  renderAppPage,
  renderDesksPage,
  renderDocsPage,
  renderLandingPage,
  renderRegisterPage,
} from "./pages/index.ts";
import { JOIN_PATH } from "../modules/brain/http.ts";
import { paySecretCookie } from "../modules/buyer/pay-guard.ts";

export type AppDeps = {
  ledger?: Ledger;
  merchandise?: Merchandise;
  directory?: Directory;
  brain?: Brain;
  buyer?: Buyer;
  refund?: RefundRail;
  listChildren?: (parent: string) => Promise<string[]>;
  probeDesk?: ProbeDesk;
  lookupSchedule?: LookupSchedule;
  guestFaucet?: GuestFaucet;
  guestStore?: GuestStore;
  issueChild?: IssueChild;
  readSellerTinybars?: SellerBalanceReader;
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
  return createDirectory({
    ensnodeUrl: config.ensnodeUrl,
    isLive: ensv2ChildIsLive,
  });
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
  const payWindow = createPayWindow();
  const guestStore = deps.guestStore ?? createMemoryGuestStore();
  const guestFaucet = deps.guestFaucet ?? tryCreateGuestFaucet(config);
  const issueChild = deps.issueChild ?? (process.env.ACC_1_PRIV_KEY ? issueDeskChild : undefined);
  const limiter = createPayRateLimiter({
    max: config.deskPayRateMax ?? DEFAULT_PAY_RATE_MAX,
    windowMs: config.deskPayRateWindowMs ?? DEFAULT_PAY_RATE_WINDOW_MS,
    globalMax: config.deskPayGlobalMax ?? DEFAULT_PAY_GLOBAL_MAX,
  });
  const refund =
    deps.refund ??
    (config.sellerAccountId && config.sellerPrivateKey
      ? createHbarRefundRail(config)
      : undefined);

  const warmAmounts = warmTinybars(config.priceTinybars);
  void warmBrain(brain, warmAmounts);
  startBrainKeepWarm(brain, warmAmounts, {
    intervalMs: Math.max(
      1_000,
      Math.floor((brain.verdictTtlMs ?? config.verdictTtlMs ?? VERDICT_TTL_MS) / 2),
    ),
  });

  const readBalance =
    deps.readSellerTinybars ??
    ((accountId: string) => readSellerTinybars(config.mirrorNodeUrl, accountId));
  let runwayCache: { at: number; sellerTinybars?: string } | undefined;

  app.use(express.json());

  app.get("/health", async (_req, res) => {
    const source = brain.source ?? "unavailable";
    let sellerTinybars = runwayCache && Date.now() - runwayCache.at < 15_000
      ? runwayCache.sellerTinybars
      : undefined;
    if (config.sellerAccountId && (!runwayCache || Date.now() - runwayCache.at >= 15_000)) {
      sellerTinybars = await readBalance(config.sellerAccountId).catch(() => undefined);
      runwayCache = {
        at: Date.now(),
        ...(sellerTinybars !== undefined ? { sellerTinybars } : {}),
      };
    }
    res.json({
      ok: true,
      service: "nametoll",
      modules: MODULE_NAMES,
      brain: {
        source,
        configured: source !== "unavailable",
        verdictTtlMs: brain.verdictTtlMs ?? config.verdictTtlMs ?? VERDICT_TTL_MS,
        ...(brain.lastError ? { lastError: brain.lastError } : {}),
      },
      merchandise: config.graphGatewayKey ? "live" : "stub",
      canPay: Boolean(buyer),
      join: JOIN_PATH,
      runway: deskRunway({
        faucetTinybars: faucetTinybarsFrom(config),
        faucetFloorTinybars: faucetFloorFrom(config),
        guestMaxActive: guestMaxActiveFrom(config),
        activeGuests: guestStore.size(),
        ...(config.sellerAccountId ? { sellerAccountId: config.sellerAccountId } : {}),
        ...(sellerTinybars !== undefined ? { sellerTinybars } : {}),
      }),
    });
  });

  const pageOptions = { canPay: Boolean(buyer) };
  const sendPage = (req: Request, res: Response, html: string) => {
    if (config.deskPaySecret) {
      res.setHeader("Set-Cookie", paySecretCookie(config.deskPaySecret, req.secure));
    }
    res.type("html").send(html);
  };

  app.get("/", (req, res) => {
    sendPage(req, res, renderLandingPage(config, pageOptions));
  });
  app.get("/landing", (req, res) => {
    sendPage(req, res, renderLandingPage(config, pageOptions));
  });
  app.get("/app", (req, res) => {
    sendPage(req, res, renderAppPage(config, pageOptions));
  });
  app.get("/docs", (req, res) => {
    sendPage(req, res, renderDocsPage(config, pageOptions));
  });
  app.get("/desks", (req, res) => {
    sendPage(req, res, renderDesksPage(config, pageOptions));
  });
  app.get("/register", (req, res) => {
    sendPage(req, res, renderRegisterPage(config, pageOptions));
  });

  app.get(OFFER_PATH, (_req, res) => {
    res.json(deskOffer(config));
  });

  mountDirectory(app, directory, {
    ensnodeUrl: config.ensnodeUrl,
    ...(deps.listChildren ? { listChildren: deps.listChildren } : {}),
    ...(deps.probeDesk ? { probeDesk: deps.probeDesk } : {}),
  });
  mountBrain(app, brain);
  mountGuestSession(app, {
    config,
    store: guestStore,
    limiter,
    ...(guestFaucet ? { faucet: guestFaucet } : {}),
  });
  mountRegister(app, {
    config,
    limiter,
    ...(issueChild ? { issueChild } : {}),
  });
  mountBuyer(app, {
    directory,
    brain,
    config,
    payWindow,
    limiter,
    guestStore,
    ...(buyer ? { buyer } : {}),
    ...(ledger ? { ledger } : {}),
  });
  mountGate(app, config, ledger, merchandise, brain, refund, payWindow);
  mountSubscribe(app, {
    config,
    merchandise,
    brain,
    ...(ledger ? { ledger } : {}),
    ...(deps.lookupSchedule ? { lookupSchedule: deps.lookupSchedule } : {}),
  });
  mountLedger(app, config, ledger);

  return app;
}
