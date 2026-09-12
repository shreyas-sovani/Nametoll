import type { AppConfig } from "../../config.ts";
import { CATALOG_PATH } from "../../modules/directory/http.ts";
import { escapeHtml } from "./escape.ts";
import type { ProductPageOptions } from "./landing.ts";
import { deskRegistryScript } from "./registry.ts";
import { claimFormHtml, sideFormsScript } from "./side-forms.ts";
import { renderShell } from "./shell.ts";

export function renderDesksPage(
  config: AppConfig,
  _options: ProductPageOptions = {},
): string {
  const body = `
    <div class="desk">
      <aside>
        <div class="rail-card">
          <p class="eyebrow"><span class="lamp hero-lamp" data-state="unpaid" aria-hidden="true"></span>Directory</p>
          <h2>Findable desks</h2>
          <p class="lede" style="margin-bottom: 0">A parent namespace is the directory. Children publish price and endpoint. Agents list, pick, and pay — they are not handed a URL.</p>
        </div>
        <div class="rail-card">
          <h3>This origin</h3>
          <dl class="status-grid">
            <dt>catalog</dt><dd><code>${CATALOG_PATH}?parent=</code></dd>
            <dt>offer</dt><dd><code>/desk/offer</code></dd>
            <dt>price</dt><dd>${escapeHtml(config.priceTinybars)} tinybars per protocol</dd>
            <dt>network</dt><dd>${escapeHtml(config.network)}</dd>
          </dl>
        </div>
      </aside>
      <section class="console">
        <p class="eyebrow">Registry</p>
        <h1>Desks under a <em>name</em>.</h1>
        <p class="lede">Paste a parent. The registry resolves each child and probes whether that desk is taking payment.</p>
        <form class="drive" id="registry-form">
          <label class="name-field">Parent namespace
            <input name="parent" autocomplete="off" spellcheck="false" placeholder="Paste a parent name" />
          </label>
          <button type="submit" id="list-desks">List desks</button>
        </form>
        <p class="banner" id="registry-empty" role="status">Paste a parent name. Children with desk records appear here.</p>
        <p class="banner err" id="registry-error" role="alert" hidden></p>
        <div class="stations" id="desk-registry" hidden></div>
        <section class="band" id="claim" style="margin-top: 1.2rem">
          <h2>Have a schedule?</h2>
          <p>Claim delivers one snapshot after the slot executes. Replay is refused.</p>
          ${claimFormHtml()}
        </section>
      </section>
    </div>
    <script>${deskRegistryScript}${sideFormsScript()}</script>`;
  return renderShell({
    title: "Desks · Nametoll",
    description:
      "Live directory of named pay desks. Resolve a parent namespace, list children, and open a desk.",
    path: "/desks",
    body,
  });
}
