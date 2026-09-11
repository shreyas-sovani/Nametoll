import type { AppConfig } from "../../config.ts";
import { SNAPSHOT_PATH } from "../../modules/gate/index.ts";
import { VERDICT_TTL_MS } from "../../modules/brain/index.ts";
import { explorerNetwork, hashscanTopicUrl } from "../../modules/ledger/hashscan.ts";
import { PINNED_PROTOCOLS } from "../../modules/merchandise/deployments.ts";
import { deskDriveScript } from "./drive.ts";
import { escapeHtml, tinybarsToHbar } from "./escape.ts";
import { renderShell } from "./shell.ts";
import type { ProductPageOptions } from "./landing.ts";

function accountUrl(accountId: string, network: "testnet" | "mainnet"): string {
  if (!/^0\.0\.\d+$/.test(accountId)) return "";
  return `https://hashscan.io/${network}/account/${accountId}`;
}

export function renderAppPage(
  config: AppConfig,
  options: ProductPageOptions = {},
): string {
  const payTo = config.sellerAccountId ?? "Pay-to not configured";
  const topic = config.hcsTopicId;
  const network = explorerNetwork(config.network);
  const topicUrl = topic ? hashscanTopicUrl(topic, network) : "";
  const payToUrl = config.sellerAccountId ? accountUrl(config.sellerAccountId, network) : "";
  const canPay = options.canPay === true;
  const pinnedIds = PINNED_PROTOCOLS.map((protocol) => protocol.id);
  const priceHbar = tinybarsToHbar(config.priceTinybars);
  const body = `
    <div class="desk">
      <aside>
        <div class="rail-card">
          <p class="eyebrow"><span id="lane-lamp" class="lamp" data-state="idle" aria-hidden="true"></span>Lane</p>
          <h2>This desk</h2>
          <dl class="status-grid">
            <dt>snapshot</dt><dd><code>${SNAPSHOT_PATH}</code></dd>
            <dt>asset</dt><dd>0.0.0 HBAR</dd>
            <dt>network</dt><dd>${escapeHtml(config.network)}</dd>
            <dt>price</dt><dd>${escapeHtml(config.priceTinybars)} tinybars per requested protocol${priceHbar ? ` · ${escapeHtml(priceHbar)}` : ""}</dd>
            <dt>payTo</dt><dd>${payToUrl ? `<a href="${escapeHtml(payToUrl)}" rel="noreferrer" target="_blank">${escapeHtml(payTo)}</a>` : escapeHtml(payTo)}</dd>
            <dt>HCS topic</dt><dd>${topic && topicUrl ? `<a href="${escapeHtml(topicUrl)}" rel="noreferrer" target="_blank">${escapeHtml(topic)}</a>` : "Ledger topic not configured"}</dd>
            <dt>ledger</dt><dd><a href="/desk/ledger"><code>/desk/ledger</code></a></dd>
            <dt>brain</dt><dd><code>/desk/brain?tinybars=</code></dd>
            <dt>inspect</dt><dd><code>/desk/inspect?name=</code></dd>
            <dt>pay</dt><dd><code>POST /desk/pay</code></dd>
            <dt>subscribe</dt><dd><code>/desk/subscribe</code> · <code>/desk/claim</code></dd>
            <dt>HTS</dt><dd><code>/desk/hts</code></dd>
            <dt>TEE cache</dt><dd>per amount, ${Math.round(VERDICT_TTL_MS / 1000)}s TTL; unavailable is not cached</dd>
            <dt>merchandise</dt><dd>Messari lending · live Aave v3 + Compound III · billed per delivered protocol · unused remainder refunded</dd>
            <dt>facilitator</dt><dd>${escapeHtml(config.facilitatorUrl)}</dd>
          </dl>
        </div>
        <div class="rail-card">
          <h3>Meter catalog</h3>
          <div class="catalog">
            ${PINNED_PROTOCOLS.map(
              (protocol) =>
                `<div><strong>${escapeHtml(protocol.label)}</strong><br><code>${escapeHtml(protocol.id)}</code></div>`,
            ).join("")}
          </div>
        </div>
      </aside>
      <div class="console">
        <p class="eyebrow">Desk console</p>
        <h1>Open a named desk</h1>
        <p class="lede">Paste a name. Watch TEE → 402 → settle → remainder → HCS. No baked-in name on this path.</p>
        <form id="drive-form" class="drive" action="/desk/inspect" method="get">
          <label class="name-field" for="desk-name">Name
            <input id="desk-name" name="name" required autocomplete="off" spellcheck="false" placeholder="paste a name" />
          </label>
          <label for="desk-units">Meter
            <select id="desk-units" name="units">
              <option value="1">1 protocol · 1 × price</option>
              <option value="2">2 protocols · 2 × price</option>
            </select>
          </label>
          <button type="submit" id="open-desk">Open desk</button>
          <button type="button" class="pay" id="pay-desk" disabled data-can-pay="${canPay ? "1" : "0"}">Pay</button>
          <button type="button" class="ghost" id="join-desk">TEE join()</button>
        </form>
        <p id="desk-empty" class="banner" role="status">Paste a name to open the desk. Empty on purpose — the happy path does not ship a name.</p>
        <p id="desk-error" class="banner err" hidden role="alert"></p>
        <p id="desk-deny" class="banner deny" hidden role="alert"></p>
        <p id="desk-ok" class="banner ok" hidden role="status"></p>
        <div class="stations">
          <section class="station" id="station-descriptor">
            <h3>01 Descriptor</h3>
            <dl id="descriptor-out"></dl>
          </section>
          <section class="station" id="station-tee">
            <h3>02 TEE</h3>
            <dl id="tee-out"></dl>
          </section>
          <section class="station" id="station-challenge">
            <h3>03 402</h3>
            <dl id="challenge-out"></dl>
          </section>
          <section class="station" id="station-snapshot">
            <h3>04 Snapshot</h3>
            <dl id="snapshot-out"></dl>
          </section>
          <section class="station" id="station-bill">
            <h3>05 HashScan + HCS</h3>
            <dl id="bill-out"></dl>
          </section>
          <section class="station" id="station-remainder">
            <h3>06 Remainder</h3>
            <dl id="remainder-out"></dl>
          </section>
          <section class="station" id="station-join">
            <h3>07 TEE join()</h3>
            <dl id="join-out"></dl>
          </section>
        </div>
      </div>
    </div>
    <script>
      ${deskDriveScript({
        pinnedIds,
        hashscanTxPrefix: `https://hashscan.io/${network}/tx/`,
      })}
    </script>`;
  return renderShell({
    title: "Desk · Nametoll",
    description:
      "Open a named pay desk. Resolve, TEE-gate, settle HTTP 402, and read the public bill.",
    path: "/app",
    body,
  });
}
