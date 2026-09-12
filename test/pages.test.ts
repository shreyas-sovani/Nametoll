import { describe, expect, it } from "vitest";
import { PINNED_PROTOCOLS } from "../src/modules/merchandise/deployments.ts";
import { publicDeskConfig, startDesk } from "./helpers.ts";

function expectChrome(html: string) {
  expect(html).toMatch(/Nametoll/i);
  expect(html).toMatch(/href="\/landing"/);
      expect(html).toMatch(/href="\/desks"/);
      expect(html).toMatch(/href="\/register"/);
      expect(html).toMatch(/href="\/app"/);
      expect(html).toMatch(/href="\/docs"/);
  expect(html).toMatch(/<title>/);
  expect(html).toMatch(/rel="icon"/);
  expect(html).toMatch(/og:title/);
  expect(html).not.toMatch(/Scaffold-ETH/);
}

describe("product pages", () => {
  it("serves the same landing at / and /landing", async () => {
    const desk = await startDesk({}, publicDeskConfig());
    try {
      const home = await fetch(`${desk.url}/`);
      const landing = await fetch(`${desk.url}/landing`);
      expect(home.status).toBe(200);
      expect(landing.status).toBe(200);
      expect(home.headers.get("content-type")).toMatch(/text\/html/);
      const homeHtml = await home.text();
      const landingHtml = await landing.text();
      expectChrome(homeHtml);
      expect(landingHtml).toMatch(/Nametoll/i);
      expect(homeHtml).toMatch(/paste a name/i);
      expect(homeHtml).toMatch(/402/);
      expect(homeHtml).toMatch(/\/desk\/snapshot/);
      expect(homeHtml).toMatch(/\/desk\/resolve/);
      expect(homeHtml).toMatch(/Open desk/);
      expect(homeHtml).toMatch(/href="\/app#subscribe"/);
      expect(homeHtml).not.toMatch(/id="drive-form"/);
      expect(homeHtml.toLowerCase()).not.toMatch(/\.eth/);
      expect(homeHtml.toLowerCase()).not.toMatch(/hackathon/);
      expect(homeHtml.toLowerCase()).not.toMatch(/ethonline/);
    } finally {
      await desk.close();
    }
  });

  it("prints live desk status on the landing when configured", async () => {
    const desk = await startDesk({ hcsTopicId: "0.0.4603900" }, publicDeskConfig());
    try {
      const html = await (await fetch(`${desk.url}/`)).text();
      expect(html).toMatch(/0\.0\.4603900/);
      expect(html).toMatch(/\/desk\/ledger/);
    } finally {
      await desk.close();
    }
  });

  it("puts the named desk on /app with no baked-in name", async () => {
    const desk = await startDesk(
      { network: "hedera:mainnet" },
      publicDeskConfig(),
    );
    try {
      const res = await fetch(`${desk.url}/app`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expectChrome(html);
      expect(html).toMatch(/paste a name/i);
      expect(html).toMatch(/id="drive-form"/);
      expect(html).toMatch(/id="desk-empty"/);
      expect(html).toMatch(/id="desk-error"/);
      expect(html).toMatch(/id="desk-deny"/);
      expect(html).toMatch(/id="station-descriptor"/);
      expect(html).toMatch(/id="station-tee"/);
      expect(html).toMatch(/id="station-challenge"/);
      expect(html).toMatch(/id="station-snapshot"/);
      expect(html).toMatch(/id="station-bill"/);
      expect(html).toMatch(/id="payer-mode"/);
      expect(html).toMatch(/id="guest-create"/);
      expect(html).toMatch(/id="claim-form"/);
      expect(html).toMatch(/id="subscribe"/);
      expect(html).toMatch(/\/desk\/inspect/);
      expect(html).toMatch(/\/desk\/pay/);
      expect(html).toMatch(/HashScan/i);
      expect(html).toMatch(/HCS/);
      expect(html).toMatch(/\/desk\/snapshot/);
      expect(html).toMatch(new RegExp(PINNED_PROTOCOLS[0]!.id));
      expect(html).toMatch(new RegExp(PINNED_PROTOCOLS[1]!.id));
      expect(html).toMatch(/hashscan\.io\/mainnet/);
      expect(html).not.toMatch(/hashscan\.io\/testnet\/tx\/" \+ bill\.refundTx/);
      expect(html.toLowerCase()).not.toMatch(/\.eth/);
    } finally {
      await desk.close();
    }
  });

  it("serves an operations manual at /docs", async () => {
    const desk = await startDesk({ hcsTopicId: "0.0.4603900" }, publicDeskConfig());
    try {
      const res = await fetch(`${desk.url}/docs`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expectChrome(html);
      expect(html).toMatch(/\/desk\/inspect/);
      expect(html).toMatch(/\/desk\/pay/);
      expect(html).toMatch(/\/desk\/resolve/);
      expect(html).toMatch(/\/desk\/catalog/);
      expect(html).toMatch(/\/desk\/ledger/);
      expect(html).toMatch(/\/desk\/subscribe/);
      expect(html).toMatch(/\/desk\/claim/);
      expect(html).toMatch(/\/desk\/hts/);
      expect(html).toMatch(/\/desk\/snapshot/);
      expect(html).toMatch(/simulate-allowlist-deny/);
      expect(html).toMatch(/tinybars/);
      expect(html).toMatch(/402/);
      expect(html).toMatch(/0\.0\.4603900/);
      expect(html.toLowerCase()).not.toMatch(/hackathon/);
    } finally {
      await desk.close();
    }
  });

  it("serves a self-serve register form without a baked-in happy-path name", async () => {
    const desk = await startDesk({}, publicDeskConfig());
    try {
      const res = await fetch(`${desk.url}/register`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expectChrome(html);
      expect(html).toMatch(/id="register-form"/);
      expect(html).toMatch(/name="label"/);
      expect(html).toMatch(/name="endpoint"/);
      expect(html).toMatch(/name="expiresIn"/);
      expect(html).toMatch(/\/desk\/register/);
      expect(html).toMatch(/expiresIn/);
      expect(html.toLowerCase()).not.toMatch(/hackathon/);
    } finally {
      await desk.close();
    }
  });

  it("exposes claim on the registry", async () => {
    const desk = await startDesk({}, publicDeskConfig());
    try {
      const html = await (await fetch(`${desk.url}/desks`)).text();
      expect(html).toMatch(/id="claim-form"/);
      expect(html).toMatch(/\/desk\/claim/);
    } finally {
      await desk.close();
    }
  });

  it("sets the pay cookie on every product page when a secret is configured", async () => {
    const desk = await startDesk({ deskPaySecret: "cookie-secret" }, publicDeskConfig());
    try {
      for (const path of ["/", "/landing", "/app", "/desks", "/docs", "/register"]) {
        const res = await fetch(`${desk.url}${path}`);
        const cookie = res.headers.getSetCookie?.()[0] ?? res.headers.get("set-cookie") ?? "";
        expect(cookie).toMatch(/nametoll_pay=/);
      }
    } finally {
      await desk.close();
    }
  });
});
