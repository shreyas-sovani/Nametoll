/** Claim + subscribe forms shared by /app and /desks. */
export function sideFormsScript(): string {
  return `(function () {
    var claim = document.getElementById("claim-form");
    var claimOut = document.getElementById("claim-out");
    if (claim && claimOut) {
      claim.addEventListener("submit", function (event) {
        event.preventDefault();
        var schedule = String(new FormData(claim).get("schedule") || "").trim();
        if (!schedule) {
          claimOut.textContent = "Paste a schedule id.";
          claimOut.hidden = false;
          claimOut.className = "banner err";
          return;
        }
        claimOut.hidden = true;
        fetch("/desk/claim?schedule=" + encodeURIComponent(schedule), {
          credentials: "same-origin",
          headers: { accept: "application/json" }
        })
          .then(function (res) { return res.json().then(function (body) { return { res: res, body: body }; }); })
          .then(function (pack) {
            claimOut.hidden = false;
            if (!pack.res.ok) {
              claimOut.className = "banner err";
              claimOut.textContent = pack.body.error || "Claim refused.";
              return;
            }
            claimOut.className = "banner ok";
            claimOut.textContent = "Claimed. Snapshot delivered.";
          })
          .catch(function () {
            claimOut.hidden = false;
            claimOut.className = "banner err";
            claimOut.textContent = "Claim failed.";
          });
      });
    }
    var sub = document.getElementById("subscribe-form");
    var subOut = document.getElementById("subscribe-out");
    if (sub && subOut) {
      sub.addEventListener("submit", function (event) {
        event.preventDefault();
        var slots = String(new FormData(sub).get("slots") || "2").trim() || "2";
        var interval = String(new FormData(sub).get("intervalSec") || "604800").trim() || "604800";
        subOut.hidden = true;
        fetch("/desk/subscribe?slots=" + encodeURIComponent(slots) + "&intervalSec=" + encodeURIComponent(interval), {
          headers: { accept: "application/json" }
        })
          .then(function (res) { return res.json().then(function (body) { return { res: res, body: body }; }); })
          .then(function (pack) {
            subOut.hidden = false;
            if (!pack.res.ok) {
              subOut.className = "banner err";
              subOut.textContent = pack.body.error || "Subscribe plan refused.";
              return;
            }
            subOut.className = "banner ok";
            var n = pack.body.slots ? pack.body.slots.length : pack.body.slotCount;
            subOut.textContent = "Unsigned plan" + (n ? " · " + n + " slots" : "") + ". Broadcast with npm run subscribe. Not the 402 rail.";
          })
          .catch(function () {
            subOut.hidden = false;
            subOut.className = "banner err";
            subOut.textContent = "Subscribe plan failed.";
          });
      });
    }
  })();`;
}

export function claimFormHtml(): string {
  return `
        <form class="side" id="claim-form">
          <label>Have a schedule?
            <input name="schedule" autocomplete="off" spellcheck="false" placeholder="0.0.x" />
          </label>
          <button type="submit">Claim</button>
        </form>
        <p class="banner" id="claim-out" hidden role="status"></p>`;
}

export function subscribeFormHtml(): string {
  return `
        <form class="side" id="subscribe-form">
          <label>Slots
            <input name="slots" type="number" min="1" max="8" value="2" />
          </label>
          <label>Interval (sec)
            <input name="intervalSec" type="number" min="60" value="604800" />
          </label>
          <button type="submit">Plan subscribe</button>
        </form>
        <p class="banner" id="subscribe-out" hidden role="status"></p>`;
}
