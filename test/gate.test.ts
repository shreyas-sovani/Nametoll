import { describe, expect, it } from "vitest";
import { encodePaymentSignatureHeader } from "@x402/core/http";
import type { PaymentRequirements } from "@x402/core/types";
import {
  FIXTURE_SELLER,
  decodeChallenge,
  paymentOffers,
  startDesk,
  startFakeFacilitator,
} from "./helpers.ts";

describe("gate", () => {
  it("honors forwarded https when building the challenge resource URL", async () => {
    const desk = await startDesk();
    try {
      const res = await fetch(`${desk.url}/desk/snapshot`, {
        headers: {
          accept: "application/json",
          host: "desk.example",
          "x-forwarded-proto": "https",
        },
      });
      const challenge = decodeChallenge(res.headers.get("payment-required")!);
      const resource = challenge.resource as { url?: string } | undefined;
      expect(resource?.url).toMatch(/^https:\/\//);
      expect(resource?.url).toMatch(/\/desk\/snapshot$/);
    } finally {
      await desk.close();
    }
  });

  it("challenges an unpaid snapshot with an x402 v2 body", async () => {
    const desk = await startDesk();
    try {
      const res = await fetch(`${desk.url}/desk/snapshot`, {
        headers: { accept: "application/json" },
      });
      expect(res.status).toBe(402);
      expect(res.headers.get("payment-required")).toBeTruthy();

      const header = res.headers.get("payment-required");
      expect(header).toBeTruthy();
      const challenge = decodeChallenge(header!);
      expect(challenge.x402Version).toBe(2);

      const offer = paymentOffers(challenge)[0];
      expect(offer).toBeTruthy();
      expect(offer?.scheme).toBe("exact");
      expect(offer?.network).toBe("hedera:testnet");
      expect(offer?.asset).toBe("0.0.0");
      expect(offer?.amount).toBe("100000");
      expect(offer?.payTo).toBe(FIXTURE_SELLER);
      expect(String(offer?.payTo)).toMatch(/^0\.0\.\d+$/);
    } finally {
      await desk.close();
    }
  });

  it("puts the live Blocky402 fee-payer on the challenge", async () => {
    const supported = await fetch("https://api.testnet.blocky402.com/supported").then(
      (res) => res.json() as Promise<{
        kinds?: Array<{ network?: string; extra?: { feePayer?: string } }>;
        signers?: Record<string, string[]>;
      }>,
    );
    const hedera = supported.kinds?.find((kind) => kind.network === "hedera:testnet");
    const liveFeePayer =
      hedera?.extra?.feePayer ?? supported.signers?.["hedera:*"]?.[0];
    expect(liveFeePayer).toMatch(/^0\.0\.\d+$/);

    const desk = await startDesk();
    try {
      const res = await fetch(`${desk.url}/desk/snapshot`, {
        headers: { accept: "application/json" },
      });
      const challenge = decodeChallenge(res.headers.get("payment-required")!);
      const extra = paymentOffers(challenge)[0]?.extra as { feePayer?: string } | undefined;
      expect(extra?.feePayer).toBe(liveFeePayer);
    } finally {
      await desk.close();
    }
  });

  it("does not return the resource for a garbage payment header", async () => {
    const desk = await startDesk();
    try {
      const res = await fetch(`${desk.url}/desk/snapshot`, {
        headers: {
          accept: "application/json",
          "payment-signature": "not-a-valid-x402-payload",
        },
      });
      expect(res.status).not.toBe(200);
      const text = await res.text();
      expect(text).not.toMatch(/"stub":\s*true/);
    } finally {
      await desk.close();
    }
  });

  it("returns the stub resource and a payment-response after settle", async () => {
    const facilitator = await startFakeFacilitator();
    const desk = await startDesk({ facilitatorUrl: facilitator.url });
    try {
      const challenged = await fetch(`${desk.url}/desk/snapshot`, {
        headers: { accept: "application/json" },
      });
      const offer = paymentOffers(
        decodeChallenge(challenged.headers.get("payment-required")!),
      )[0] as PaymentRequirements | undefined;
      expect(offer).toBeTruthy();

      const payload = {
        x402Version: 2,
        accepted: offer!,
        payload: { transaction: Buffer.from("stub-tx").toString("base64") },
      };
      const paid = await fetch(`${desk.url}/desk/snapshot`, {
        headers: {
          accept: "application/json",
          "payment-signature": encodePaymentSignatureHeader(payload),
        },
      });

      expect(paid.status).toBe(200);
      expect(paid.headers.get("payment-response")).toBeTruthy();
      expect(await paid.json()).toEqual({ ok: true, stub: true });
    } finally {
      await desk.close();
      await facilitator.close();
    }
  });
});
