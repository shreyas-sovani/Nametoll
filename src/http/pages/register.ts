import { publishedDeskOrigin, type AppConfig } from "../../config.ts";
import { REGISTER_PATH } from "../../modules/directory/register-http.ts";
import { escapeHtml } from "./escape.ts";
import type { ProductPageOptions } from "./landing.ts";
import { renderShell } from "./shell.ts";

export function renderRegisterPage(
  config: AppConfig,
  _options: ProductPageOptions = {},
): string {
  const parent = config.ensParent?.trim() ?? "";
  const defaultEndpoint = publishedDeskOrigin(config.publicDeskUrl);
  const body = `
    <div class="desk">
      <aside>
        <div class="rail-card">
          <p class="eyebrow"><span class="lamp hero-lamp" data-state="unpaid" aria-hidden="true"></span>Issue</p>
          <h2>Claim a desk name</h2>
          <p class="lede" style="margin-bottom: 0">You pick the label, endpoint, and optional expiry. Price and pay-to stay this origin's, so the descriptor cannot lie to a judge. Expired children resolve as unresolved on /desks.</p>
        </div>
        <div class="rail-card">
          <h3>This origin writes</h3>
          <dl class="status-grid">
            <dt>parent</dt><dd>${parent ? `<code>${escapeHtml(parent)}</code>` : "Set ENS_PARENT"}</dd>
            <dt>price</dt><dd>${escapeHtml(config.priceTinybars)} tinybars per protocol</dd>
            <dt>payTo</dt><dd>${escapeHtml(config.sellerAccountId ?? "unset")}</dd>
            <dt>register</dt><dd><code>${REGISTER_PATH}</code></dd>
          </dl>
        </div>
      </aside>
      <section class="console">
        <p class="eyebrow">Self-serve</p>
        <h1>Register a <em>child</em>.</h1>
        <p class="lede">The operator key runs the existing subname write path. The child should appear under <a href="/desks">/desks</a> after the next block.</p>
        <form class="drive" id="register-form">
          <label class="name-field">Child label
            <input name="label" autocomplete="off" spellcheck="false" placeholder="your-label" required />
          </label>
          <label class="name-field">Endpoint
            <input name="endpoint" autocomplete="off" spellcheck="false" placeholder="${escapeHtml(defaultEndpoint || "https://this-origin")}" value="${escapeHtml(defaultEndpoint)}" />
          </label>
          <label class="name-field">Expires in (seconds, optional)
            <input name="expiresIn" inputmode="numeric" autocomplete="off" spellcheck="false" placeholder="31536000" />
          </label>
          <button type="submit">Register desk</button>
        </form>
        <p class="banner" id="register-empty" role="status">Label is yours. Price and pay-to are this desk's.</p>
        <p class="banner err" id="register-error" hidden role="alert"></p>
        <p class="banner ok" id="register-ok" hidden role="status"></p>
      </section>
    </div>
    <script>${registerScript()}</script>`;
  return renderShell({
    title: "Register · Nametoll",
    description:
      "Claim a child name that resells this pay desk. Price and pay-to stay this origin.",
    path: "/register",
    body,
  });
}

function registerScript(): string {
  return `(function () {
    var form = document.getElementById("register-form");
    var empty = document.getElementById("register-empty");
    var err = document.getElementById("register-error");
    var ok = document.getElementById("register-ok");
    if (!form || !empty || !err || !ok) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var label = String(data.get("label") || "").trim();
      var endpoint = String(data.get("endpoint") || "").trim();
      var expiresIn = String(data.get("expiresIn") || "").trim();
      empty.hidden = true;
      err.hidden = true;
      ok.hidden = true;
      var payload = { label: label, endpoint: endpoint };
      if (expiresIn) payload.expiresIn = Number(expiresIn);
      fetch("/desk/register", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) { return res.json().then(function (body) { return { res: res, body: body }; }); })
        .then(function (pack) {
          if (!pack.res.ok || !pack.body.child) {
            err.textContent = pack.body.error || "Register refused.";
            err.hidden = false;
            return;
          }
          ok.textContent = "Issued " + pack.body.child + ". Open /desks or paste the child on the desk.";
          ok.hidden = false;
        })
        .catch(function () {
          err.textContent = "Register failed.";
          err.hidden = false;
        });
    });
  })();`;
}
