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
        <dt>price</dt><dd>${escapeHtml(config.priceTinybars)} tinybars (flat until meter lands)</dd>
        <dt>payTo</dt><dd>${escapeHtml(payTo)}</dd>
        <dt>facilitator</dt><dd>${escapeHtml(config.facilitatorUrl)}</dd>
      </dl>
      <ol>
        <li><code>GET ${SNAPSHOT_PATH}</code> with <code>Accept: application/json</code> — unpaid returns 402 and a <code>PAYMENT-REQUIRED</code> header.</li>
        <li>Sign x402 v2 <code>exact</code> HBAR. Retry with <code>PAYMENT-SIGNATURE</code>.</li>
        <li>Blocky402 verify + settle. Resource + <code>PAYMENT-RESPONSE</code> only after settle.</li>
      </ol>
    </main>
    <footer>
      Health: <a href="/health"><code>/health</code></a>. Buyer: <code>npm run buyer -- &lt;desk-url&gt;</code>.
      Do not commit secrets. Resource server holds no facilitator key.
    </footer>
  </article>
</body>
</html>`;
}
