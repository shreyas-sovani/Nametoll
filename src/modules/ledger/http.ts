import type { Express } from "express";
import type { AppConfig } from "../../config.ts";
import { explorerNetwork, hashscanTopicUrl } from "./hashscan.ts";
import type { Ledger } from "./index.ts";

export const LEDGER_PATH = "/desk/ledger";

export const RECOMPUTE_RECIPE =
  "GET Mirror Node /api/v1/topics/{topicId}/messages, base64-decode each message, then check units * priceTinybarsPerUnit = tinybars. If prepaidTinybars is present, prepaidTinybars - tinybars = refundTinybars.";

export function mountLedger(
  app: Express,
  config: AppConfig,
  ledger?: Ledger,
): void {
  app.get(LEDGER_PATH, async (_req, res) => {
    const topicId = ledger?.topicId ?? config.hcsTopicId;
    const bills = ledger ? await ledger.list() : [];
    res.json({
      ...(topicId
        ? {
            topicId,
            hashscanUrl: hashscanTopicUrl(
              topicId,
              explorerNetwork(config.network),
            ),
          }
        : {}),
      priceTinybarsPerUnit: config.priceTinybars,
      recompute: RECOMPUTE_RECIPE,
      bills,
    });
  });
}
