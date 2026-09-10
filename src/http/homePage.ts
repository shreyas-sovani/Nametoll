import type { AppConfig } from "../config.ts";
import { SNAPSHOT_PATH } from "../modules/gate/index.ts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderHomePage(config: AppConfig): string {
  const payTo = config.sellerAccountId ?? "set HEDERA_SELLER_ACCOUNT_ID";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Nametoll desk</title>
  <style>
    :root {
      --navy: #12202b;
      --ticket: #f2ddb6;
      --ink: #1a1208;
      --brass: #8a6230;
      --stamp: #c24520;
      --rule: #c9b48a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 2rem 1rem;
      background:
        repeating-linear-gradient(90deg, #0d1820 0 2px, #12202b 2px 14px);
      color: var(--ink);
      font-family: "Iowan Old Style", "Palatino Linotype", Palatino, serif;
    }
    .ticket {
      width: min(36rem, 100%);
      background: var(--ticket);
      border: 2px solid var(--ink);
      box-shadow: 8px 8px 0 #0a1218;
      position: relative;
    }
    .ticket::before, .ticket::after {
      content: "";
      position: absolute;
      left: 0; right: 0;
      height: 12px;
      background:
        radial-gradient(circle at 8px 0, transparent 7px, var(--navy) 8px) repeat-x;
      background-size: 16px 12px;
    }
    .ticket::before { top: -12px; }
    .ticket::after { bottom: -12px; transform: rotate(180deg); }
    header, main, footer { padding: 1.1rem 1.4rem; }
    header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 2px dashed var(--rule);
    }
    .brand { font-size: 1.7rem; letter-spacing: 0.08em; text-transform: uppercase; }
    .stamp {
      color: var(--stamp);
      font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
      font-weight: 700;
      letter-spacing: 0.14em;
      transform: rotate(-8deg);
    }
    h1 { font-size: 1.05rem; margin: 0 0 0.75rem; }
    dl {
      display: grid;
      grid-template-columns: 8.5rem 1fr;
      gap: 0.45rem 0.8rem;
      margin: 0;
      font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
      font-size: 0.82rem;
    }
    dt { color: var(--brass); }
    dd { margin: 0; word-break: break-all; }
    ol { margin: 0.8rem 0 0; padding-left: 1.2rem; }
    li { margin: 0.3rem 0; }
    footer {
      border-top: 2px dashed var(--rule);
      font-size: 0.85rem;
    }
    a { color: var(--ink); }
    code { font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; }
    form {
      margin: 1rem 0 0;
      display: grid;
      gap: 0.45rem;
    }
    label { font-size: 0.85rem; color: var(--brass); }
    input[name="name"] {
      width: 100%;
      border: 1px solid var(--ink);
      background: #fff8e8;
      padding: 0.45rem 0.55rem;
      font: inherit;
    }
    button {
      justify-self: start;
      border: 1px solid var(--ink);
      background: var(--navy);
      color: var(--ticket);
      padding: 0.35rem 0.8rem;
      font: inherit;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
    }
    .resolve-out {
      margin: 0.7rem 0 0;
      font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
      font-size: 0.78rem;
    }
    .resolve-out[hidden] { display: none; }
    .resolve-err { color: var(--stamp); }
  </style>
</head>
<body>
  <article class="ticket">
    <header>
      <div class="brand">Nametoll</div>
      <div class="stamp">HTTP 402</div>
    </header>
    <main>
      <h1>Named pay desk. Agents pay in tinybars. No baked-in name on this path.</h1>
      <dl>
        <dt>snapshot</dt><dd><code>${SNAPSHOT_PATH}</code></dd>
        <dt>asset</dt><dd>0.0.0 HBAR</dd>
        <dt>network</dt><dd>${escapeHtml(config.network)}</dd>
        <dt>price</dt><dd>${escapeHtml(config.priceTinybars)} tinybars per requested protocol</dd>
        <dt>payTo</dt><dd>${escapeHtml(payTo)}</dd>
        <dt>HCS topic</dt><dd>${escapeHtml(config.hcsTopicId ?? "set HCS_TOPIC_ID")}</dd>
        <dt>ledger</dt><dd><code>/desk/ledger</code></dd>
        <dt>merchandise</dt><dd>Messari lending · live Aave v3 + Compound III · billed per requested protocol</dd>
        <dt>facilitator</dt><dd>${escapeHtml(config.facilitatorUrl)}</dd>
      </dl>
      <ol>
        <li><code>GET ${SNAPSHOT_PATH}</code> or <code>${SNAPSHOT_PATH}?protocols=aave-v3-ethereum</code> — unpaid returns 402. Price is unit × requested protocols.</li>
        <li>Sign x402 v2 <code>exact</code> HBAR. Retry with <code>PAYMENT-SIGNATURE</code>.</li>
        <li>Blocky402 verify + settle. Resource + <code>PAYMENT-RESPONSE</code> only after settle.</li>
        <li>Paste a name below. The desk resolves it live — this page does not ship a name.</li>
      </ol>
      <form id="resolve-form" action="/desk/resolve" method="get">
        <label for="desk-name">Name</label>
        <input id="desk-name" name="name" required autocomplete="off" spellcheck="false" placeholder="paste a name" />
        <button type="submit">Resolve</button>
      </form>
      <p id="resolve-error" class="resolve-out resolve-err" hidden></p>
      <dl id="resolve-out" class="resolve-out" hidden></dl>
    </main>
    <footer>
      Health: <a href="/health"><code>/health</code></a>.
      Bills: <a href="/desk/ledger"><code>/desk/ledger</code></a>.
      Directory: <a href="/desk/resolve"><code>/desk/resolve?name=</code></a>.
      Buyer: <code>npm run buyer -- &lt;name-or-url&gt; [protocol-ids]</code>.
      Do not commit secrets. Resource server holds no facilitator key.
    </footer>
    <script>
      (function () {
        var form = document.getElementById("resolve-form");
        var err = document.getElementById("resolve-error");
        var out = document.getElementById("resolve-out");
        if (!form || !err || !out) return;
        form.addEventListener("submit", function (event) {
          event.preventDefault();
          var name = new FormData(form).get("name");
          err.hidden = true;
          out.hidden = true;
          out.replaceChildren();
          if (!name || !String(name).trim()) {
            err.textContent = "Paste a name.";
            err.hidden = false;
            return;
          }
          fetch("/desk/resolve?name=" + encodeURIComponent(String(name)))
            .then(function (res) { return res.json().then(function (body) { return { res: res, body: body }; }); })
            .then(function (pack) {
              if (!pack.res.ok || !pack.body.descriptor) {
                err.textContent = pack.body.error || "Name did not resolve.";
                err.hidden = false;
                return;
              }
              var d = pack.body.descriptor;
              [["endpoint", d.endpoint], ["payTo", d.payTo], ["priceRule", d.priceRule], ["hcsTopic", d.hcsTopic], ["asset", d.asset]]
                .forEach(function (pair) {
                  var dt = document.createElement("dt");
                  dt.textContent = pair[0];
                  var dd = document.createElement("dd");
                  dd.textContent = pair[1] || "";
                  out.appendChild(dt);
                  out.appendChild(dd);
                });
              out.hidden = false;
            })
            .catch(function () {
              err.textContent = "Resolve failed.";
              err.hidden = false;
            });
        });
      })();
    </script>
  </article>
</body>
</html>`;
}
