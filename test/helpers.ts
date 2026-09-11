import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { decodePaymentRequiredHeader } from "@x402/core/http";
import { createApp, type AppDeps } from "../src/http/createApp.ts";
import type { AppConfig } from "../src/config.ts";
import type { Brain } from "../src/modules/brain/index.ts";

export const allowBrain: Brain = {
  source: "injected",
  async decide({ requestedTinybars }) {
    return {
      allow: true,
      maxTinybars: requestedTinybars,
      reason: "under cap",
    };
  },
};

export const FIXTURE_SELLER = "0.0.999999";

export function testDeskConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: 0,
    network: "hedera:testnet",
    facilitatorUrl: "https://api.testnet.blocky402.com",
    sellerAccountId: FIXTURE_SELLER,
    secretsPaths: {},
    priceTinybars: "100000",
    mirrorNodeUrl: "https://testnet.mirrornode.hedera.com",
    graphGatewayUrl: "https://gateway.thegraph.com/api",
    ensnodeUrl: "https://api.v2-sepolia.ensnode.io",
    creTarget: "staging-settings",
    ...overrides,
  };
}

export function publicDeskConfig(): AppConfig {
  return {
    port: 0,
    network: "hedera:testnet",
    facilitatorUrl: "https://api.testnet.blocky402.com",
    secretsPaths: {},
    priceTinybars: "100000",
    mirrorNodeUrl: "https://testnet.mirrornode.hedera.com",
    graphGatewayUrl: "https://gateway.thegraph.com/api",
    ensnodeUrl: "https://api.v2-sepolia.ensnode.io",
    creTarget: "staging-settings",
  };
}

export async function startDesk(
  overrides: Partial<AppConfig> = {},
  config?: AppConfig,
  deps: AppDeps = {},
): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const resolved = config ?? testDeskConfig(overrides);
  const app = await createApp({ ...resolved, ...overrides }, {
    ...deps,
    brain: deps.brain ?? allowBrain,
  });
  const server = await new Promise<Server>((resolve, reject) => {
    const started = app.listen(0, "127.0.0.1", () => resolve(started));
    started.on("error", reject);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected TCP address");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export function decodeChallenge(header: string): Record<string, unknown> {
  return decodePaymentRequiredHeader(header) as unknown as Record<string, unknown>;
}

export async function startFakeFacilitator(feePayer = "0.0.7162784"): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const path = req.url ?? "/";
    if (req.method === "GET" && path === "/supported") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          kinds: [
            {
              x402Version: 2,
              scheme: "exact",
              network: "hedera:testnet",
              extra: { feePayer },
            },
          ],
          extensions: [],
          signers: { "hedera:*": [feePayer] },
        }),
      );
      return;
    }
    if (req.method === "POST" && (path === "/verify" || path === "/settle")) {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk as Buffer));
      req.on("end", () => {
        res.writeHead(200, { "content-type": "application/json" });
        if (path === "/verify") {
          res.end(JSON.stringify({ isValid: true, payer: "0.0.1" }));
          return;
        }
        res.end(
          JSON.stringify({
            success: true,
            payer: "0.0.1",
            transaction: "0.0.1@1234567890.000000001",
            network: "hedera:testnet",
          }),
        );
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", () => resolve());
    server.on("error", reject);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected TCP address");
  }
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export function paymentOffers(body: unknown): Array<Record<string, unknown>> {
  if (!body || typeof body !== "object") return [];
  const record = body as Record<string, unknown>;
  const accepts = record.accepts ?? record.accepted;
  if (Array.isArray(accepts)) {
    return accepts.filter((item): item is Record<string, unknown> =>
      Boolean(item && typeof item === "object"),
    );
  }
  if (accepts && typeof accepts === "object") {
    return [accepts as Record<string, unknown>];
  }
  return [];
}
