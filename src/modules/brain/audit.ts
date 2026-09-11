import { createHash } from "node:crypto";
import type { BrainVerdict } from "../../types.ts";

export function verdictAudit(verdict: BrainVerdict): {
  verdictReason: string;
  verdictHash: string;
} {
  return {
    verdictReason: verdict.reason,
    verdictHash: createHash("sha256")
      .update(
        JSON.stringify({
          allow: verdict.allow,
          maxTinybars: verdict.maxTinybars,
          reason: verdict.reason,
        }),
      )
      .digest("hex"),
  };
}
