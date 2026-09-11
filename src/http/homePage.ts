import type { AppConfig } from "../config.ts";
import { SNAPSHOT_PATH } from "../modules/gate/index.ts";
import { hashscanTopicUrl, explorerNetwork } from "../modules/ledger/hashscan.ts";
import { PINNED_PROTOCOLS } from "../modules/merchandise/deployments.ts";
import { VERDICT_TTL_MS } from "../modules/brain/index.ts";

export type HomePageOptions = {
  canPay?: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderHomePage(
  config: AppConfig,
  options: HomePageOptions = {},
): string {
  const payTo = config.sellerAccountId ?? "set HEDERA_SELLER_ACCOUNT_ID";
  const topic = config.hcsTopicId;
  const topicUrl = topic
    ? hashscanTopicUrl(topic, explorerNetwork(config.network))
    : "";
  const canPay = options.canPay === true;
  const network = explorerNetwork(config.network);
  const pinnedIds = PINNED_PROTOCOLS.map((protocol) => protocol.id);
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
      --paper: #fff8e8;
      --ok: #2f5d3a;
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
      width: min(68rem, 100%);
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
    header, footer { padding: 1.1rem 1.4rem; }
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
    h2 {
      margin: 0 0 0.55rem;
      font-size: 0.78rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--brass);
    }
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
    footer {
      border-top: 2px dashed var(--rule);
      font-size: 0.85rem;
    }
    a { color: var(--ink); }
    code { font-family: ui-monospace, "SFMono-Regular", Menlo, monospace; }
    .blotter { padding: 1.1rem 1.4rem 1.3rem; }
    form.drive {
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      gap: 0.55rem 0.7rem;
      align-items: end;
      margin: 0 0 1rem;
    }
    form.drive label { font-size: 0.85rem; color: var(--brass); display: grid; gap: 0.3rem; }
    form.drive .name-field { grid-column: 1 / -1; }
    input[name="name"], select {
      width: 100%;
      border: 1px solid var(--ink);
      background: var(--paper);
      padding: 0.45rem 0.55rem;
      font: inherit;
    }
    button {
      border: 1px solid var(--ink);
      background: var(--navy);
      color: var(--ticket);
      padding: 0.45rem 0.9rem;
      font: inherit;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    button.pay { background: var(--stamp); color: var(--paper); }
    .stations {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.8rem;
    }
    .station {
      border: 1px solid var(--rule);
      background: var(--paper);
      padding: 0.75rem 0.8rem;
      min-height: 7.5rem;
    }
    .station[hidden], .banner[hidden] { display: none; }
    .banner {
      margin: 0 0 0.8rem;
      padding: 0.55rem 0.7rem;
      border: 1px dashed var(--brass);
      font-size: 0.92rem;
    }
    .banner.err, .banner.deny { border-color: var(--stamp); color: var(--stamp); }
    .banner.ok { border-color: var(--ok); color: var(--ok); }
    .meta {
      margin: 0 0 0.9rem;
      font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
      font-size: 0.75rem;
    }
    @media (max-width: 720px) {
      form.drive, .stations { grid-template-columns: 1fr; }
    }
    @media (prefers-reduced-motion: reduce) {
      * { animation: none !important; transition: none !important; }
    }
  </style>
</head>
<body>
  <article class="ticket">
    <header>
      <div class="brand">Nametoll</div>
      <div class="stamp">HTTP 402</div>
    </header>
    <div class="blotter">
      <h1>Named pay desk. Paste a name. Watch TEE → 402 → settle → remainder → HCS. No baked-in name on this path.</h1>
      <dl class="meta">
        <dt>snapshot</dt><dd><code>${SNAPSHOT_PATH}</code></dd>
        <dt>asset</dt><dd>0.0.0 HBAR</dd>
        <dt>network</dt><dd>${escapeHtml(config.network)}</dd>
        <dt>price</dt><dd>${escapeHtml(config.priceTinybars)} tinybars per requested protocol</dd>
        <dt>payTo</dt><dd>${escapeHtml(payTo)}</dd>
        <dt>HCS topic</dt><dd>${topic && topicUrl ? `<a href="${escapeHtml(topicUrl)}">${escapeHtml(topic)}</a>` : escapeHtml("set HCS_TOPIC_ID")}</dd>
        <dt>ledger</dt><dd><code>/desk/ledger</code></dd>
        <dt>brain</dt><dd><code>/desk/brain?tinybars=</code></dd>
        <dt>inspect</dt><dd><code>/desk/inspect?name=</code></dd>
        <dt>pay</dt><dd><code>POST /desk/pay</code></dd>
        <dt>TEE cache</dt><dd>per amount, ${Math.round(VERDICT_TTL_MS / 1000)}s TTL; unavailable is not cached</dd>
        <dt>merchandise</dt><dd>Messari lending · live Aave v3 + Compound III · billed per delivered protocol · unused remainder refunded</dd>
        <dt>facilitator</dt><dd>${escapeHtml(config.facilitatorUrl)}</dd>
      </dl>
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
        <button type="button" id="join-desk">TEE join()</button>
      </form>
      <p id="desk-empty" class="banner">Paste a name to open the desk. Empty on purpose — the happy path does not ship a name.</p>
      <p id="desk-error" class="banner err" hidden></p>
      <p id="desk-deny" class="banner deny" hidden></p>
      <p id="desk-ok" class="banner ok" hidden></p>
      <div class="stations">
        <section class="station" id="station-descriptor">
          <h2>01 Descriptor</h2>
          <dl id="descriptor-out"></dl>
        </section>
        <section class="station" id="station-tee">
          <h2>02 TEE</h2>
          <dl id="tee-out"></dl>
        </section>
        <section class="station" id="station-challenge">
          <h2>03 402</h2>
          <dl id="challenge-out"></dl>
        </section>
        <section class="station" id="station-snapshot">
          <h2>04 Snapshot</h2>
          <dl id="snapshot-out"></dl>
        </section>
        <section class="station" id="station-bill">
          <h2>05 HashScan + HCS</h2>
          <dl id="bill-out"></dl>
        </section>
        <section class="station" id="station-remainder">
          <h2>06 Remainder</h2>
          <dl id="remainder-out"></dl>
        </section>
        <section class="station" id="station-join">
          <h2>07 TEE join()</h2>
          <dl id="join-out"></dl>
        </section>
      </div>
    </div>
    <footer>
      Health: <a href="/health"><code>/health</code></a>.
      Resolve: <a href="/desk/resolve"><code>/desk/resolve?name=</code></a>.
      Bills: <a href="/desk/ledger"><code>/desk/ledger</code></a>.
      Buyer CLI: <code>npm run buyer -- &lt;name-or-url&gt; [protocol-ids]</code>.
      Remainder: <code>npm run buyer -- http://127.0.0.1:8787 not-a-real-protocol</code>.
      Join: <a href="/desk/join"><code>/desk/join</code></a> (unsigned calldata). Broadcast: <code>npm run join</code>.
      Live join tx <code>0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086</code>.
      Recompute: <code>units * priceTinybarsPerUnit = tinybars</code>.
      Do not commit secrets. Resource server holds no facilitator key.
    </footer>
    <script>
      (function () {
        var form = document.getElementById("drive-form");
        var openBtn = document.getElementById("open-desk");
        var payBtn = document.getElementById("pay-desk");
        var joinBtn = document.getElementById("join-desk");
        var empty = document.getElementById("desk-empty");
        var err = document.getElementById("desk-error");
        var deny = document.getElementById("desk-deny");
        var ok = document.getElementById("desk-ok");
        var lastInspect = null;
        var pinnedProtocols = ${JSON.stringify(pinnedIds)};
        var hashscanTxPrefix = ${JSON.stringify(`https://hashscan.io/${network}/tx/`)};
        if (!form || !openBtn || !payBtn || !joinBtn) return;

        function protocols() {
          var units = document.getElementById("desk-units");
          if (units && units.value === "1") return pinnedProtocols.slice(0, 1);
          return pinnedProtocols.slice();
        }
        function typedName() {
          var value = new FormData(form).get("name");
          return value ? String(value).trim() : "";
        }
        function fillDl(id, rows) {
          var node = document.getElementById(id);
          if (!node) return;
          node.replaceChildren();
          rows.forEach(function (pair) {
            if (pair[1] == null || pair[1] === "") return;
            var dt = document.createElement("dt");
            dt.textContent = pair[0];
            var dd = document.createElement("dd");
            if (pair[2]) {
              var a = document.createElement("a");
              a.href = pair[2];
              a.textContent = pair[1];
              a.rel = "noreferrer";
              a.target = "_blank";
              dd.appendChild(a);
            } else {
              dd.textContent = pair[1];
            }
            node.appendChild(dt);
            node.appendChild(dd);
          });
        }
        function resetStations() {
          fillDl("descriptor-out", []);
          fillDl("tee-out", []);
          fillDl("challenge-out", []);
          fillDl("snapshot-out", []);
          fillDl("bill-out", []);
          fillDl("remainder-out", []);
          fillDl("join-out", []);
        }
        function hideBanners() {
          empty.hidden = true;
          err.hidden = true;
          deny.hidden = true;
          ok.hidden = true;
        }
        function showError(message) {
          hideBanners();
          err.textContent = message;
          err.hidden = false;
        }
        function hbar(tinybars) {
          try {
            return (Number(BigInt(tinybars)) / 100000000).toString() + " HBAR";
          } catch (e) {
            return "";
          }
        }
        function showInspect(body) {
          lastInspect = body;
          var d = body.descriptor || {};
          fillDl("descriptor-out", [
            ["name", body.name],
            ["endpoint", d.endpoint],
            ["payTo", d.payTo],
            ["priceRule", d.priceRule],
            ["hcsTopic", d.hcsTopic],
            ["asset", d.asset]
          ]);
          var v = body.verdict || {};
          fillDl("tee-out", [
            ["allow", String(v.allow)],
            ["reason", v.reason],
            ["maxTinybars", v.maxTinybars],
            ["requested", body.tinybars]
          ]);
          var c = body.challenge || {};
          var rec = body.recompute || {};
          fillDl("challenge-out", [
            ["status", c.status != null ? String(c.status) : ""],
            ["amount", c.amount],
            ["HBAR", c.amount ? hbar(c.amount) : ""],
            ["asset", c.asset],
            ["payTo", c.payTo],
            ["scheme", c.scheme],
            ["recompute", rec.formula],
            ["expected", rec.expectedTinybars],
            ["matches", rec.matches != null ? String(rec.matches) : ""]
          ]);
          if (v.allow) {
            hideBanners();
            ok.textContent = "TEE allowed. Unpaid GET is HTTP 402. Pay to settle.";
            ok.hidden = false;
            payBtn.disabled = payBtn.getAttribute("data-can-pay") !== "1";
            if (payBtn.disabled) {
              showError("Desk has no buyer signer. Set buyer keys and restart, or use the buyer CLI.");
            }
          } else {
            hideBanners();
            deny.textContent = "TEE denied: " + (v.reason || "over cap") + ". No settle, no snapshot.";
            deny.hidden = false;
            payBtn.disabled = true;
          }
        }
        function showPaid(body) {
          showInspect(body);
          var paid = body.paid || {};
          var snap = paid.body || {};
          var merch = body.merchandise || {};
          var protocolRows = [["status", paid.status != null ? String(paid.status) : ""],
            ["units", merch.units != null ? String(merch.units) : (snap.units != null ? String(snap.units) : "")],
            ["stub", merch.stub != null ? String(merch.stub) : (snap.stub != null ? String(snap.stub) : "")],
            ["ok", merch.ok != null ? String(merch.ok) : (snap.ok != null ? String(snap.ok) : "")]
          ];
          (merch.protocols || []).forEach(function (protocol) {
            protocolRows.push([
              protocol.label || protocol.id,
              protocol.ok ? ("tvl " + (protocol.tvl || "ok")) : (protocol.error || "fail")
            ]);
          });
          fillDl("snapshot-out", protocolRows);
          var bill = body.bill || {};
          var rec = bill.recompute || {};
          fillDl("bill-out", [
            ["settleTx", paid.settleTx, paid.hashscanUrl || bill.hashscanUrl],
            ["HashScan", paid.hashscanUrl || bill.hashscanUrl, paid.hashscanUrl || bill.hashscanUrl],
            ["HCS topic", body.topicId, body.topicHashscanUrl],
            ["tinybars", bill.tinybars],
            ["consensus", bill.consensusTime],
            ["recompute", rec.formula],
            ["expected", rec.expectedTinybars],
            ["matches", rec.matches != null ? String(rec.matches) : ""]
          ]);
          var refundUrl = bill.refundHashscanUrl || (bill.refundTx
            ? (hashscanTxPrefix + bill.refundTx)
            : "");
          fillDl("remainder-out", [
            ["prepaid", bill.prepaidTinybars],
            ["burned units", bill.units != null ? String(bill.units) : ""],
            ["owed", bill.tinybars],
            ["refund", bill.refundTinybars],
            ["refundTx", bill.refundTx, refundUrl]
          ]);
          hideBanners();
          ok.textContent = bill.refundTinybars && bill.refundTinybars !== "0"
            ? "Settled. Unused remainder refunded. Recompute prepaid − owed on the HCS topic."
            : "Settled. Open HashScan and recompute the HCS topic.";
          ok.hidden = false;
          payBtn.disabled = false;
        }
        form.addEventListener("submit", function (event) {
          event.preventDefault();
          var name = typedName();
          hideBanners();
          resetStations();
          lastInspect = null;
          payBtn.disabled = true;
          if (!name) {
            empty.hidden = false;
            empty.textContent = "Paste a name.";
            return;
          }
          openBtn.disabled = true;
          openBtn.textContent = "Opening…";
          var query = "/desk/inspect?name=" + encodeURIComponent(name);
          var ids = protocols();
          if (ids.length) query += "&protocols=" + encodeURIComponent(ids.join(","));
          fetch(query)
            .then(function (res) { return res.json().then(function (body) { return { res: res, body: body }; }); })
            .then(function (pack) {
              if (!pack.res.ok || !pack.body.descriptor) {
                showError(pack.body.error || "Name did not resolve.");
                return;
              }
              showInspect(pack.body);
            })
            .catch(function () { showError("Inspect failed."); })
            .finally(function () {
              openBtn.disabled = false;
              openBtn.textContent = "Open desk";
            });
        });
        payBtn.addEventListener("click", function () {
          var name = typedName();
          if (!name) {
            showError("Paste a name.");
            return;
          }
          payBtn.disabled = true;
          payBtn.textContent = "Paying…";
          fetch("/desk/pay", {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify({ name: name, protocols: protocols() })
          })
            .then(function (res) { return res.json().then(function (body) { return { res: res, body: body }; }); })
            .then(function (pack) {
              if (pack.body.verdict && pack.body.verdict.allow === false) {
                showInspect(pack.body);
                return;
              }
              if (!pack.res.ok || !pack.body.paid) {
                showError(pack.body.error || "Pay refused.");
                return;
              }
              showPaid(pack.body);
            })
            .catch(function () { showError("Pay failed."); })
            .finally(function () {
              payBtn.textContent = "Pay";
              if (lastInspect && lastInspect.verdict && lastInspect.verdict.allow && payBtn.getAttribute("data-can-pay") === "1") {
                payBtn.disabled = false;
              }
            });
        });
        joinBtn.addEventListener("click", function () {
          joinBtn.disabled = true;
          joinBtn.textContent = "Asking TEE…";
          fetch("/desk/join")
            .then(function (res) { return res.json().then(function (body) { return { res: res, body: body }; }); })
            .then(function (pack) {
              if (!pack.res.ok || pack.body.action !== "join") {
                showError(pack.body.error || "join() refused.");
                return;
              }
              fillDl("join-out", [
                ["action", pack.body.action],
                ["to", pack.body.to],
                ["data", pack.body.data],
                ["chainId", pack.body.chainId != null ? String(pack.body.chainId) : ""],
                ["chain", pack.body.chain],
                ["broadcast", "no — npm run join sends it"]
              ]);
              hideBanners();
              ok.textContent = "Unsigned join() from the same CRE TEE. Broadcast with npm run join — this button does not send a tx.";
              ok.hidden = false;
            })
            .catch(function () { showError("join() failed."); })
            .finally(function () {
              joinBtn.disabled = false;
              joinBtn.textContent = "TEE join()";
            });
        });
      })();
    </script>
  </article>
</body>
</html>`;
}
