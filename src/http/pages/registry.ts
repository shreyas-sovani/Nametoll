export const deskRegistryScript = `
(function () {
  var form = document.getElementById("registry-form");
  var parentInput = form && form.querySelector('input[name="parent"]');
  var btn = document.getElementById("list-desks");
  var empty = document.getElementById("registry-empty");
  var error = document.getElementById("registry-error");
  var list = document.getElementById("desk-registry");
  var lamp = document.querySelector(".hero-lamp");
  if (!form || !parentInput || !btn || !empty || !error || !list) return;
  var idleLabel = btn.textContent || "List desks";
  var busy = false;

  function setBusy(on) {
    busy = on;
    btn.disabled = on;
    btn.textContent = on ? "Listing…" : idleLabel;
    if (on) btn.setAttribute("aria-busy", "true");
    else btn.removeAttribute("aria-busy");
    form.setAttribute("aria-busy", on ? "true" : "false");
    parentInput.disabled = on;
    if (lamp) lamp.setAttribute("data-state", on ? "busy" : "unpaid");
  }

  function show(node, on) {
    if (on) node.removeAttribute("hidden");
    else node.setAttribute("hidden", "");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function protocols(row) {
    if (!row.protocols || !row.protocols.length) return "—";
    return row.protocols.map(function (id) { return "<code>" + escapeHtml(id) + "</code>"; }).join(" ");
  }

  function card(row) {
    var price = row.priceRule || (row.priceTinybars ? row.priceTinybars + " tinybars" : "—");
    var href = row.name ? "/app?name=" + encodeURIComponent(row.name) : "/app";
    return (
      '<article class="station" data-status="' + escapeHtml(row.status) + '">' +
        '<h3><span class="lamp" data-state="' + (row.status === "live" ? "allow" : row.status === "unresolved" ? "idle" : "error") + '"></span>' +
        escapeHtml(row.status) + "</h3>" +
        "<dl>" +
          "<dt>name</dt><dd>" + escapeHtml(row.name || "") + "</dd>" +
          "<dt>price</dt><dd>" + escapeHtml(price) + "</dd>" +
          "<dt>protocols</dt><dd>" + protocols(row) + "</dd>" +
          (row.endpoint ? "<dt>endpoint</dt><dd>" + escapeHtml(row.endpoint) + "</dd>" : "") +
          (row.payTo ? "<dt>payTo</dt><dd>" + escapeHtml(row.payTo) + "</dd>" : "") +
        "</dl>" +
        (row.status === "live"
          ? '<p><a class="btn btn-solid" href="' + href + '">Open on desk</a></p>'
          : "") +
      "</article>"
    );
  }

  async function load(parent) {
    error.textContent = "";
    show(error, false);
    show(empty, false);
    list.innerHTML = "";
    show(list, false);
    if (!parent) {
      empty.textContent = "Paste a parent name. Children with desk records appear here.";
      show(empty, true);
      return;
    }
    setBusy(true);
    empty.textContent = "Resolving children and probing each desk. This can take a moment.";
    show(empty, true);
    try {
      var res = await fetch("/desk/catalog?parent=" + encodeURIComponent(parent), {
        headers: { accept: "application/json" },
      });
      var body = await res.json();
      show(empty, false);
      if (!res.ok || !body.ok) {
        error.textContent = body.error || "Catalog failed.";
        show(error, true);
        return;
      }
      var desks = body.desks || [];
      if (!desks.length) {
        empty.textContent = "No children under that parent.";
        show(empty, true);
        return;
      }
      list.innerHTML = desks.map(card).join("");
      show(list, true);
    } catch (_e) {
      show(empty, false);
      error.textContent = "Catalog failed.";
      show(error, true);
    } finally {
      setBusy(false);
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (busy) return;
    var parent = parentInput.value.trim();
    var url = new URL(window.location.href);
    if (parent) url.searchParams.set("parent", parent);
    else url.searchParams.delete("parent");
    history.replaceState({}, "", url);
    load(parent);
  });

  var seeded = new URLSearchParams(window.location.search).get("parent");
  if (seeded) {
    parentInput.value = seeded;
    load(seeded);
  }
})();
`.trim();
