import type { AppConfig } from "../../config.ts";
import { SNAPSHOT_PATH } from "../../modules/gate/index.ts";
import { explorerNetwork, hashscanTopicUrl } from "../../modules/ledger/hashscan.ts";
import { PINNED_PROTOCOLS } from "../../modules/merchandise/deployments.ts";
import { escapeHtml, tinybarsToHbar } from "./escape.ts";
import { renderShell } from "./shell.ts";

export type ProductPageOptions = {
  canPay?: boolean;
};

function accountUrl(accountId: string, network: "testnet" | "mainnet"): string {
  if (!/^0\.0\.\d+$/.test(accountId)) return "";
  return `https://hashscan.io/${network}/account/${accountId}`;
}

function liveStatus(config: AppConfig, canPay: boolean): string {
  const network = explorerNetwork(config.network);
  const payTo = config.sellerAccountId ?? "Pay-to not configured";
  const payToUrl = config.sellerAccountId ? accountUrl(config.sellerAccountId, network) : "";
  const topic = config.hcsTopicId;
  const topicUrl = topic ? hashscanTopicUrl(topic, network) : "";
  const priceHbar = tinybarsToHbar(config.priceTinybars);
  return `
    <dl class="status-grid">
      <dt>network</dt><dd>${escapeHtml(config.network)}</dd>
      <dt>asset</dt><dd>0.0.0 HBAR</dd>
      <dt>price</dt><dd>${escapeHtml(config.priceTinybars)} tinybars per protocol${priceHbar ? ` · ${escapeHtml(priceHbar)}` : ""}</dd>
      <dt>payTo</dt><dd>${payToUrl ? `<a href="${escapeHtml(payToUrl)}" rel="noreferrer" target="_blank">${escapeHtml(payTo)}</a>` : escapeHtml(payTo)}</dd>
      <dt>HCS topic</dt><dd>${topic && topicUrl ? `<a href="${escapeHtml(topicUrl)}" rel="noreferrer" target="_blank">${escapeHtml(topic)}</a>` : "Ledger topic not configured"}</dd>
      <dt>ledger</dt><dd><a href="/desk/ledger"><code>/desk/ledger</code></a></dd>
      <dt>snapshot</dt><dd><code>${SNAPSHOT_PATH}</code></dd>
      <dt>resolve</dt><dd><code>/desk/resolve?name=</code></dd>
      <dt>facilitator</dt><dd>${escapeHtml(config.facilitatorUrl)}</dd>
      <dt>pay from this origin</dt><dd>${canPay ? "Buyer signer ready" : "Buyer signer unset — use the CLI or configure keys"}</dd>
    </dl>`;
}

const MARQUEE_ITEMS = [
  "HTTP 402 Payment Required",
  "x402 v2 · exact",
  "asset 0.0.0 · HBAR",
  "tinybars per unit",
  "TEE-gated spend cap",
  "metered delivery",
  "unused remainder refunded",
  "public HCS bill",
  "recompute from Mirror Node",
];

function marquee(): string {
  const items = MARQUEE_ITEMS.map(
    (item) => `<span><b>${escapeHtml(item)}</b></span>`,
  ).join("");
  return `
    <div class="marquee" aria-hidden="true">
      <div class="marquee-track"><div class="marquee-group">${items}</div><div class="marquee-group">${items}</div></div>
    </div>`;
}

export function renderLandingPage(
  config: AppConfig,
  options: ProductPageOptions = {},
): string {
  const canPay = options.canPay === true;
  const body = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow"><span class="lamp hero-lamp" data-state="unpaid" aria-hidden="true"></span>Named toll · HTTP 402</p>
        <h1>Pay any desk<br />by its <em>name</em>.</h1>
        <p class="lede">Agents resolve a live name, take an HTTP 402 in HBAR, and receive metered units plus a public bill. No API key. No hardcoded URL. Paste a name to open the desk.</p>
        <div class="hero-actions">
          <a class="btn btn-solid" href="/app">Open desk</a>
          <a class="btn ghost" href="/desks">Browse desks</a>
          <a class="btn ghost" href="/docs">Read the manual</a>
        </div>
      </div>
      <div class="hero-card">
        <span class="stamp">402</span>
        <h3>One request, five gates</h3>
        <ol class="flow" style="--flow-step: 2.83rem">
          <li class="flow-step"><span class="k">01</span><span class="t">Name</span><span class="v">resolve texts</span></li>
          <li class="flow-step"><span class="k">02</span><span class="t">Cap</span><span class="v">TEE allow / deny</span></li>
          <li class="flow-step"><span class="k">03</span><span class="t">402</span><span class="v">tinybars</span></li>
          <li class="flow-step"><span class="k">04</span><span class="t">Meter</span><span class="v">per protocol</span></li>
          <li class="flow-step"><span class="k">05</span><span class="t">Bill</span><span class="v">HCS topic</span></li>
        </ol>
      </div>
    </section>
    ${marquee()}
    <section class="reveal">
      <h2 style="margin-bottom: 1rem">The loop</h2>
      <ol class="lane">
        <li><b>Name</b><span>Resolve endpoint, price, pay-to, and topic.</span></li>
        <li><b>Cap</b><span>A TEE allow/deny gates whether money can move.</span></li>
        <li><b>402</b><span>Unpaid GET is Payment Required in tinybars.</span></li>
        <li><b>Meter</b><span>Price scales with requested protocol count.</span></li>
        <li><b>Bill</b><span>Settle on HashScan. Recompute on the HCS topic.</span></li>
      </ol>
    </section>
    <section class="band reveal">
      <h2>What the desk sells</h2>
      <p>Live lending-risk snapshots. Units are delivered protocols, not bytes. Unused prepaid remainder is refunded.</p>
      <div class="catalog">
        ${PINNED_PROTOCOLS.map(
          (protocol) =>
            `<div><strong>${escapeHtml(protocol.label)}</strong><code>${escapeHtml(protocol.id)}</code></div>`,
        ).join("")}
      </div>
    </section>
    <section class="band reveal" style="--d: 0.08s">
      <h2>This origin</h2>
      <p>Status is live configuration, not a mock. Agents hit the same <code>${SNAPSHOT_PATH}</code> the desk console uses.</p>
      ${liveStatus(config, canPay)}
    </section>
    <section class="band reveal" style="--d: 0.12s">
      <h2>For operators</h2>
      <div class="band-grid">
        <div>
          <h3>Directory</h3>
          <p>Publish endpoint, price rule, and HCS topic on a child name. The <a href="/desks">desk registry</a> lists those children so another agent can find a service and pay for it.</p>
        </div>
        <div>
          <h3>Spend cap</h3>
          <p>The enclave holds the cap. Over-cap requests never settle and never fetch merchandise.</p>
        </div>
        <div>
          <h3>Public bill</h3>
          <p>Anyone with the topic id can recompute <code>units * priceTinybarsPerUnit = tinybars</code> from Mirror Node.</p>
        </div>
        <div>
          <h3>Subscribe</h3>
          <p>Pre-authorize N weekly snapshots with scheduled transfers. HTS custom fees sit on that rail. The per-request 402 stays HBAR.</p>
        </div>
      </div>
    </section>`;
  return renderShell({
    title: "Nametoll",
    description:
      "Named pay desk. Agents resolve a name, settle HTTP 402 in HBAR, and get a public bill.",
    path: "/landing",
    body,
  });
}
