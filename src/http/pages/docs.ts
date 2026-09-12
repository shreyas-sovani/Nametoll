import { publishedDeskOrigin, type AppConfig } from "../../config.ts";
import { RISK_PATH, SNAPSHOT_PATH } from "../../modules/gate/index.ts";
import { VERDICT_TTL_MS } from "../../modules/brain/index.ts";
import { explorerNetwork, hashscanTopicUrl } from "../../modules/ledger/hashscan.ts";
import { RECOMPUTE_RECIPE } from "../../modules/ledger/http.ts";
import { PINNED_PROTOCOLS } from "../../modules/merchandise/deployments.ts";
import { escapeHtml, tinybarsToHbar } from "./escape.ts";
import { renderShell } from "./shell.ts";
import type { ProductPageOptions } from "./landing.ts";

export function renderDocsPage(
  config: AppConfig,
  _options: ProductPageOptions = {},
): string {
  const network = explorerNetwork(config.network);
  const topic = config.hcsTopicId;
  const topicUrl = topic ? hashscanTopicUrl(topic, network) : "";
  const priceHbar = tinybarsToHbar(config.priceTinybars);
  const ttlSec = Math.round((config.verdictTtlMs ?? VERDICT_TTL_MS) / 1000);
  const origin = escapeHtml(publishedDeskOrigin(config.publicDeskUrl));
  const body = `
    <div class="docs">
      <nav class="doc-toc" aria-label="Manual">
        <a href="#overview">Overview</a>
        <a href="#loop">The loop</a>
        <a href="#directory">Directory</a>
        <a href="#desk">Open a desk</a>
        <a href="#402">HTTP 402</a>
        <a href="#cap">Spend cap</a>
        <a href="#meter">Metering</a>
        <a href="#remainder">Remainder</a>
        <a href="#ledger">Ledger</a>
        <a href="#http">HTTP API</a>
        <a href="#subscribe">Subscribe</a>
        <a href="#cli">Agent CLI</a>
        <a href="#ops">Operators</a>
      </nav>
      <div>
        <article class="doc-card" id="overview">
          <p class="eyebrow">Manual</p>
          <h1>Nametoll</h1>
          <p>Nametoll is a named pay desk. A buyer agent is given a name, not a URL and not an API key. The desk resolves that name, asks a TEE whether the spend is under cap, challenges unpaid GETs with HTTP 402, settles HBAR through Blocky402, returns metered units, and appends a bill the public can recompute.</p>
          <p>This origin sells live lending-risk snapshots. Price is ${escapeHtml(config.priceTinybars)} tinybars per requested protocol${priceHbar ? ` (${escapeHtml(priceHbar)})` : ""} on ${escapeHtml(config.network)}.</p>
        </article>
        <article class="doc-card" id="loop">
          <h2>The loop</h2>
          <pre>name → TEE allow → pay (Blocky402) → metered units → HCS bill</pre>
          <ol>
            <li>Paste or pass a name. The happy path does not ship one.</li>
            <li>Directory returns endpoint, pay-to, price rule, HCS topic, asset <code>0.0.0</code>.</li>
            <li>Brain returns <code>allow</code>, <code>maxTinybars</code>, and a public reason. Secrets stay in the enclave.</li>
            <li>Unpaid <code>GET ${SNAPSHOT_PATH}</code> is HTTP 402.</li>
            <li>Pay settles <code>exact</code> HBAR. The snapshot is billed per delivered protocol.</li>
            <li>The bill is on the HCS topic. Recompute from Mirror Node.</li>
          </ol>
        </article>
        <article class="doc-card" id="directory">
          <h2>Directory</h2>
          <p>A parent namespace is the catalog. <a href="/desks">/desks</a> and <code>GET /desk/catalog?parent=</code> list children, resolve each descriptor, and probe whether that origin is taking payment. <code>GET /desk/offer</code> is this origin's public price and protocol list — not the pay path.</p>
          <p>An agent that is handed only the parent:</p>
          <pre>npm run agent -- &lt;paste-a-parent-name&gt;</pre>
          <p>It enumerates children, picks by price and protocols, asks the TEE, pays, and prints the receipt. That is how another agent finds a service and pays for it.</p>
        </article>
        <article class="doc-card" id="desk">
          <h2>Open a desk</h2>
          <p>Use <a href="/app">the desk console</a> or HTTP. Type or paste the name. Choose 1 or 2 protocols. <strong>Open desk</strong> calls <code>GET /desk/inspect</code>. If the TEE allows, <strong>Pay</strong> calls <code>POST /desk/pay</code> with the same name and protocol list.</p>
          <p>Pay can spend the operator buyer key or a guest account from <code>POST /desk/session</code> (ephemeral ECDSA, seller-funded 0.05 HBAR). The faucet closes with HTTP 503 if the seller is under 5 HBAR or guest capacity is full. Both are rate-limited, optionally gated by a shared secret cookie or <code>x-desk-pay-secret</code>, and pinned to <code>PUBLIC_DESK_URL</code> when that is set. Inspect stays open.</p>
        </article>
        <article class="doc-card" id="402">
          <h2>HTTP 402</h2>
          <p>The resource is <code>${SNAPSHOT_PATH}</code>. Amounts are tinybars. Asset is Hedera <code>0.0.0</code>. Scheme is x402 v2 <code>exact</code>. Facilitator: <code>${escapeHtml(config.facilitatorUrl)}</code>. This process does not hold a facilitator key. Fee-payer comes from live <code>GET /supported</code>.</p>
          <pre>curl -sD - -H 'Accept: application/json' \\
  ${origin}${SNAPSHOT_PATH}</pre>
        </article>
        <article class="doc-card" id="cap">
          <h2>Spend cap</h2>
          <p>The CRE handler runs in a TEE. Secrets: spend cap, optional buyer allowlist, optional pays-per-hour. Public reasons are <code>under cap</code>, <code>over cap</code>, <code>buyer not allowlisted</code>, and <code>rate limited</code>. A deny or an unavailable enclave blocks settle and merchandise. Successful verdicts are cached per amount, payer, and hour-count for ${escapeHtml(String(ttlSec))}s. The process re-warms the 1-unit and 2-unit amounts every half-TTL. One <code>cre workflow simulate</code> runs at a time; a hung child is killed at 60s and the desk fails closed. Failures are not cached. <code>GET /health</code> reports <code>brain.verdictTtlMs</code>. Committed <code>cre workflow simulate</code> logs: cap flip <code>simulate-allow.log</code> / <code>simulate-deny.log</code>; policy engine <code>simulate-allowlist-deny.log</code> / <code>simulate-rate-deny.log</code> (Nitro <code>us-west-2</code>).</p>
          <pre>curl -sS "${origin}/desk/brain?tinybars=${escapeHtml(config.priceTinybars)}"</pre>
        </article>
        <article class="doc-card" id="meter">
          <h2>Metering</h2>
          <p>Units are the number of protocols in the request, not response bytes. Catalog on this desk:</p>
          <table>
            <thead><tr><th>id</th><th>label</th><th>network</th></tr></thead>
            <tbody>
              ${PINNED_PROTOCOLS.map(
                (protocol) =>
                  `<tr><td><code>${escapeHtml(protocol.id)}</code></td><td>${escapeHtml(protocol.label)}</td><td>${escapeHtml(protocol.network)}</td></tr>`,
              ).join("")}
            </tbody>
          </table>
          <p>1 protocol = ${escapeHtml(config.priceTinybars)} tinybars. 2 protocols = twice that. If an indexer is down, that protocol fail-softs; you are billed for delivered units.</p>
          <p><code>GET ${RISK_PATH}?wallet=</code> is a second SKU at 1 unit. The desk computes a health factor from live Messari market ratios (or live Account positions when the indexer has them). The wallet is merchandise, not a TEE input. The bill is <code>sku: risk-score</code>. This sells computation, freshness, and a receipt — not privacy of public positions.</p>
        </article>
        <article class="doc-card" id="remainder">
          <h2>Remainder</h2>
          <p>Prepaid tinybars are the 402 amount. Owed tinybars are delivered units × price. If the desk delivers fewer units than prepaid, unused remainder is refunded as a seller-signed HBAR transfer. The HCS bill stores prepaid, owed, and refund. There is no second topic.</p>
        </article>
        <article class="doc-card" id="ledger">
          <h2>Ledger</h2>
          <p>${topic && topicUrl ? `Topic <a href="${escapeHtml(topicUrl)}" rel="noreferrer" target="_blank"><code>${escapeHtml(topic)}</code></a>.` : "Configure an HCS topic to publish bills."} Recipe: ${escapeHtml(RECOMPUTE_RECIPE)}</p>
          <p>Pay attaches the bill only when the settle transaction is on the topic. If Mirror Node is still catching up, the HashScan settle link still stands; the bill block is omitted rather than showing someone else’s receipt.</p>
          <pre>curl -sS ${origin}/desk/ledger</pre>
        </article>
        <article class="doc-card" id="subscribe">
          <h2>Subscribe</h2>
          <p>Recurring snapshots use Hedera scheduled transactions, not a second 402. Plan them on <a href="/app#subscribe">the desk</a> or via HTTP. The buyer pre-authorizes N transfers with <code>wait_for_expiry</code>. Each slot expires at most 62 days out. When Mirror Node shows <code>executed_timestamp</code>, claim on <a href="/desks">/desks</a> or <code>GET /desk/claim?schedule=</code> delivers one snapshot. The HBAR snapshot 402 stays asset <code>0.0.0</code>.</p>
          <p>HTS is a desk-credit token with a custom fixed HBAR fee to the seller. Blocky402 <code>/supported</code> does not advertise a non-HBAR asset, so the pay path does not switch tokens. <code>GET /desk/hts</code> publishes the token plan. <code>npm run hts -- create</code> broadcasts it. Put the id in <code>HTS_TOKEN_ID</code>.</p>
          <pre>curl -sS "${origin}/desk/subscribe?slots=2&amp;intervalSec=604800"
curl -sS ${origin}/desk/hts
npm run subscribe -- --plan --slots 2 --interval-sec 120
npm run subscribe -- --slots 2 --interval-sec 120
npm run hts -- probe
npm run hts -- plan
curl -sS "${origin}/desk/claim?schedule=&lt;0.0.x&gt;"</pre>
        </article>
        <article class="doc-card" id="http">
          <h2>HTTP API</h2>
          <table>
            <thead><tr><th>Method</th><th>Path</th><th>Does</th></tr></thead>
            <tbody>
              <tr><td>GET</td><td><code>/health</code></td><td>Liveness, modules, brain TTL, seller runway, whether this origin can pay</td></tr>
              <tr><td>GET</td><td><code>/desk/resolve?name=</code></td><td>Directory descriptor from a live name</td></tr>
              <tr><td>GET</td><td><code>/desk/catalog?parent=</code></td><td>Children of a parent, each resolved and probed</td></tr>
              <tr><td>GET</td><td><code>/desk/offer</code></td><td>This origin's price and protocol ids</td></tr>
              <tr><td>GET</td><td><code>/desk/inspect?name=&amp;protocols=</code></td><td>Descriptor + TEE verdict + unpaid 402</td></tr>
              <tr><td>POST</td><td><code>/desk/pay</code></td><td>Settle, snapshot, bill (when matched). Body <code>payer: guest|operator</code></td></tr>
              <tr><td>POST</td><td><code>/desk/session</code></td><td>Create an in-memory guest buyer and faucet 0.05 HBAR (503 if runway is closed)</td></tr>
              <tr><td>GET</td><td><code>/desk/session</code></td><td>Current guest account, if the session cookie is set</td></tr>
              <tr><td>POST</td><td><code>/desk/register</code></td><td>Issue a child that resells this desk (price/payTo fixed; optional <code>expiresIn</code>)</td></tr>
              <tr><td>GET</td><td><code>${SNAPSHOT_PATH}</code></td><td>Merchandise; 402 if unpaid</td></tr>
              <tr><td>GET</td><td><code>${RISK_PATH}?wallet=</code></td><td>Desk-side risk score; 1 unit; 402 if unpaid</td></tr>
              <tr><td>GET</td><td><code>/desk/brain?tinybars=</code></td><td>Public verdict for an amount</td></tr>
              <tr><td>GET</td><td><code>/desk/join</code></td><td>Unsigned <code>join()</code> from the same TEE — this origin does not broadcast it</td></tr>
              <tr><td>GET</td><td><code>/desk/ledger</code></td><td>Topic, bills, recompute recipe</td></tr>
              <tr><td>GET</td><td><code>/desk/subscribe?slots=</code></td><td>Unsigned scheduled-payment plan</td></tr>
              <tr><td>GET</td><td><code>/desk/claim?schedule=</code></td><td>Deliver a snapshot after a slot executes</td></tr>
              <tr><td>GET</td><td><code>/desk/hts</code></td><td>TOLL token plan + Blocky402 asset probe</td></tr>
            </tbody>
          </table>
          <pre>curl -sS "${origin}/desk/inspect?name=&lt;paste-a-name&gt;&amp;protocols=aave-v3-ethereum"
curl -sS -X POST ${origin}/desk/pay \\
  -H 'content-type: application/json' \\
  -H "x-desk-pay-secret: \${DESK_PAY_SECRET:-}" \\
  -d '{"name":"&lt;paste-a-name&gt;","protocols":["aave-v3-ethereum"]}'</pre>
        </article>
        <article class="doc-card" id="cli">
          <h2>Agent CLI</h2>
          <p>Headless buyer. Pass a name or a desk URL. Protocol ids are optional; omit them to request the full catalog. A protocol id that is not in the catalog is how you exercise unused-remainder refund.</p>
          <pre>npm run buyer -- ${origin}
npm run buyer -- ${origin} aave-v3-ethereum
npm run buyer -- ${origin} not-a-real-protocol
npm run buyer -- &lt;paste-a-name&gt;
npm run agent -- &lt;paste-a-parent-name&gt;
npm run directory -- &lt;paste-a-name&gt;
npm run ens:subname -- --plan --parent &lt;parent&gt; --label agent-02
npm run subscribe -- --plan --slots 2 --interval-sec 120
npm run hts -- probe
npm run join -- --check
npm run join</pre>
        </article>
        <article class="doc-card" id="ops">
          <h2>Operators</h2>
          <p>Do not commit secrets. Copy <code>.env.example</code> locally. Never put a facilitator private key on the resource server. Directory text keys: <code>url</code>, <code>agent-context</code>, <code>agent-endpoint[web]</code>. CRE HTTP inside the TEE uses <code>HTTPClient</code> + <code>TeeRuntime</code> only.</p>
          <p>Product pages: <a href="/landing">/landing</a>, <a href="/desks">/desks</a>, <a href="/register">/register</a>, <a href="/app">/app</a>, <a href="/docs">/docs</a>. <code>/</code> is the product page. <a href="/register">/register</a> issues a child that resells this desk — label and endpoint vary; price and pay-to do not.</p>
        </article>
      </div>
    </div>`;
  return renderShell({
    title: "Manual · Nametoll",
    description:
      "How to pay a Nametoll desk by name: resolve, HTTP 402, TEE cap, metered units, HCS bill.",
    path: "/docs",
    body,
  });
}
