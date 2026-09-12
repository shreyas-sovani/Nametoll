/** Desk console client. Same inspect / pay / join contracts as the previous blotter. */
export function deskDriveScript(options: {
  pinnedIds: readonly string[];
  hashscanTxPrefix: string;
}): string {
  return `(function () {
        var form = document.getElementById("drive-form");
        var openBtn = document.getElementById("open-desk");
        var payBtn = document.getElementById("pay-desk");
        var scoreBtn = document.getElementById("score-desk");
        var joinBtn = document.getElementById("join-desk");
        var payerMode = document.getElementById("payer-mode");
        var guestBtn = document.getElementById("guest-create");
        var guestStatus = document.getElementById("guest-status");
        var empty = document.getElementById("desk-empty");
        var err = document.getElementById("desk-error");
        var deny = document.getElementById("desk-deny");
        var ok = document.getElementById("desk-ok");
        var lastInspect = null;
        var guestAccount = "";
        var pinnedProtocols = ${JSON.stringify(options.pinnedIds)};
        var hashscanTxPrefix = ${JSON.stringify(options.hashscanTxPrefix)};
        if (!form || !openBtn || !payBtn || !joinBtn) return;
        function typedWallet() {
          var field = document.getElementById("desk-wallet");
          return field && "value" in field ? String(field.value).trim() : "";
        }
        function setPayButtons(disabled) {
          payBtn.disabled = disabled;
          if (scoreBtn) scoreBtn.disabled = disabled;
        }

        function protocols() {
          var units = document.getElementById("desk-units");
          if (units && units.value === "1") return pinnedProtocols.slice(0, 1);
          return pinnedProtocols.slice();
        }
        function typedName() {
          var value = new FormData(form).get("name");
          return value ? String(value).trim() : "";
        }
        function payer() {
          return payerMode && payerMode.value === "guest" ? "guest" : "operator";
        }
        function canPayNow() {
          if (payer() === "guest") return Boolean(guestAccount);
          return payBtn.getAttribute("data-can-pay") === "1";
        }
        function showGuest(account, href) {
          guestAccount = account || "";
          if (!guestStatus) return;
          if (!guestAccount) {
            guestStatus.hidden = true;
            return;
          }
          guestStatus.hidden = false;
          guestStatus.className = "banner ok";
          if (href) {
            guestStatus.innerHTML = "Guest account <a href=\\"" + href + "\\" rel=\\"noreferrer\\" target=\\"_blank\\">" + guestAccount + "</a>";
          } else {
            guestStatus.textContent = "Guest account " + guestAccount;
          }
        }
        function setLamp(state) {
          var lamp = document.getElementById("lane-lamp");
          if (lamp) lamp.setAttribute("data-state", state);
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
            dd.title = "Copy";
            dd.addEventListener("click", function (event) {
              if (event.target && event.target.tagName === "A") return;
              var text = pair[1];
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(String(text));
              }
            });
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
          fillDl("risk-out", []);
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
          setLamp("error");
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
            ["asset", d.asset],
            ["payer", body.payer]
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
            setLamp("allow");
            setPayButtons(!canPayNow());
            if (payBtn.disabled) {
              showError(payer() === "guest"
                ? "Create a guest account first."
                : "Desk has no buyer signer. Set buyer keys and restart, or use the buyer CLI.");
            }
          } else {
            hideBanners();
            deny.textContent = "TEE denied: " + (v.reason || "over cap") + ". No settle, no snapshot.";
            deny.hidden = false;
            setLamp("deny");
            setPayButtons(true);
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
            ["payer", body.payer],
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
          setLamp("settled");
          setPayButtons(false);
        }
        function showRisk(body) {
          showPaid(body);
          var paid = body.paid || {};
          var score = paid.body || {};
          fillDl("risk-out", [
            ["sku", score.sku],
            ["wallet", score.wallet],
            ["source", score.source],
            ["score", score.score != null ? String(score.score) : ""],
            ["health factor", score.healthFactor],
            ["distance to liq %", score.distanceToLiquidationPct],
            ["worst market", score.worstMarket ? (score.worstMarket.name || score.worstMarket.id) : ""],
            ["collateral USD", score.factors && score.factors.collateralUsd],
            ["borrow USD", score.factors && score.factors.borrowUsd],
            ["methodology", score.methodology]
          ]);
        }
        form.addEventListener("submit", function (event) {
          event.preventDefault();
          var name = typedName();
          hideBanners();
          resetStations();
          lastInspect = null;
          setPayButtons(true);
          if (!name) {
            empty.hidden = false;
            empty.textContent = "Paste a name.";
            setLamp("idle");
            return;
          }
          openBtn.disabled = true;
          openBtn.textContent = "Opening…";
          openBtn.setAttribute("aria-busy", "true");
          setLamp("busy");
          var query = "/desk/inspect?name=" + encodeURIComponent(name);
          var ids = protocols();
          if (ids.length) query += "&protocols=" + encodeURIComponent(ids.join(","));
          if (payer() === "guest") query += "&payer=guest";
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
              openBtn.removeAttribute("aria-busy");
            });
        });
        payBtn.addEventListener("click", function () {
          var name = typedName();
          if (!name) {
            showError("Paste a name.");
            return;
          }
          setPayButtons(true);
          payBtn.textContent = "Paying…";
          payBtn.setAttribute("aria-busy", "true");
          setLamp("busy");
          fetch("/desk/pay", {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify({ name: name, protocols: protocols(), payer: payer() })
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
              payBtn.removeAttribute("aria-busy");
              if (lastInspect && lastInspect.verdict && lastInspect.verdict.allow && canPayNow()) {
                setPayButtons(false);
              }
            });
        });
        if (scoreBtn) {
          scoreBtn.addEventListener("click", function () {
            var name = typedName();
            var wallet = typedWallet();
            if (!name) {
              showError("Paste a name.");
              return;
            }
            if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) {
              showError("Paste a 0x wallet to score.");
              return;
            }
            setPayButtons(true);
            scoreBtn.textContent = "Scoring…";
            scoreBtn.setAttribute("aria-busy", "true");
            setLamp("busy");
            fetch("/desk/pay", {
              method: "POST",
              credentials: "same-origin",
              headers: { "content-type": "application/json", accept: "application/json" },
              body: JSON.stringify({ name: name, sku: "risk-score", wallet: wallet, payer: payer() })
            })
              .then(function (res) { return res.json().then(function (body) { return { res: res, body: body }; }); })
              .then(function (pack) {
                if (pack.body.verdict && pack.body.verdict.allow === false) {
                  showInspect(pack.body);
                  return;
                }
                if (!pack.res.ok || !pack.body.paid) {
                  showError(pack.body.error || "Risk score refused.");
                  return;
                }
                showRisk(pack.body);
              })
              .catch(function () { showError("Risk score failed."); })
              .finally(function () {
                scoreBtn.textContent = "Score wallet";
                scoreBtn.removeAttribute("aria-busy");
                if (lastInspect && lastInspect.verdict && lastInspect.verdict.allow && canPayNow()) {
                  setPayButtons(false);
                }
              });
          });
        }
        joinBtn.addEventListener("click", function () {
          joinBtn.disabled = true;
          joinBtn.textContent = "Asking TEE…";
          joinBtn.setAttribute("aria-busy", "true");
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
              setLamp("allow");
            })
            .catch(function () { showError("join() failed."); })
            .finally(function () {
              joinBtn.disabled = false;
              joinBtn.textContent = "TEE join()";
              joinBtn.removeAttribute("aria-busy");
            });
        });
        function loadGuest() {
          fetch("/desk/session", { credentials: "same-origin", headers: { accept: "application/json" } })
            .then(function (res) { return res.json().then(function (body) { return { res: res, body: body }; }); })
            .then(function (pack) {
              if (pack.res.ok && pack.body.accountId) {
                showGuest(pack.body.accountId, pack.body.hashscanAccountUrl);
              }
            })
            .catch(function () {});
        }
        if (guestBtn) {
          guestBtn.addEventListener("click", function () {
            guestBtn.disabled = true;
            guestBtn.textContent = "Creating…";
            fetch("/desk/session", {
              method: "POST",
              credentials: "same-origin",
              headers: { accept: "application/json" }
            })
              .then(function (res) { return res.json().then(function (body) { return { res: res, body: body }; }); })
              .then(function (pack) {
                if (!pack.res.ok || !pack.body.accountId) {
                  showError(pack.body.error || "Guest session refused.");
                  return;
                }
                showGuest(pack.body.accountId, pack.body.hashscanAccountUrl);
                if (payerMode) payerMode.value = "guest";
                if (lastInspect && lastInspect.verdict && lastInspect.verdict.allow) {
                  setPayButtons(!canPayNow());
                }
              })
              .catch(function () { showError("Guest session failed."); })
              .finally(function () {
                guestBtn.disabled = false;
                guestBtn.textContent = "Create guest account";
              });
          });
        }
        if (payerMode) {
          payerMode.addEventListener("change", function () {
            if (lastInspect && lastInspect.verdict && lastInspect.verdict.allow) {
              setPayButtons(!canPayNow());
            }
          });
        }
        loadGuest();
        var seeded = new URLSearchParams(window.location.search).get("name")
          || (window.location.hash.indexOf("name=") >= 0
            ? decodeURIComponent(window.location.hash.split("name=")[1] || "").split("&")[0]
            : "");
        if (seeded) {
          var nameField = form.querySelector('input[name="name"]');
          if (nameField) nameField.value = seeded;
        }
      })();`;
}
