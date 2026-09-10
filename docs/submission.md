# Nametoll — ETHOnline 2026 submission pack

**Form picks (locked):** Hedera · ENS · Chainlink  
**Off the ETHOnline form:** World and The Graph (Graph is merchandise only).  
**Repo:** https://github.com/shreyas-sovani/Nametoll (public)  
**Video:** 2–4 min, human voice, 720p. Record the README timestamp script. Do not speed the take.

Paste the checklists below into the partner forms. Each row names the README clock and the repo evidence. `join()` is not pursued.

---

## Hedera — AI

- [x] **Live URL, not localhost** — https://nonwaxing-xeromorphic-dagmar.ngrok-free.dev (session-scoped ngrok). Stable host: `PUBLIC_DESK_URL` + `Dockerfile`. Clock **0:15**.
- [x] **x402 v2 + Blocky402 facilitator** — unpaid `GET /desk/snapshot` is HTTP 402, `x402Version: 2`, asset `0.0.0`, tinybars, fee-payer `0.0.7162784` from live `GET https://api.testnet.blocky402.com/supported`. Clock **1:10**.
- [x] **Agent/platform paid at least once** — `npm run buyer -- <paste-a-name>`. First settle https://hashscan.io/testnet/tx/0.0.7162784@1789065380.080315812 — buyer `0.0.10463842`, seller `0.0.10463755`, `100000` tinybars. Clock **1:30**.
- [x] **HashScan tx + HCS topic id in README** — topic `0.0.10464309` · https://hashscan.io/testnet/topic/0.0.10464309 · Mirror https://testnet.mirrornode.hedera.com/api/v1/topics/0.0.10464309/messages. Clock **2:25**.
- [x] **Metering or refund (not only flat fee)** — `100000` tinybars × requested protocol count. 1 protocol vs 2 = `100000` vs `200000` on HashScan + HCS. Unused-remainder refund is stretch B13 (not this form). Clock **2:00**.
- [x] **Demo shows the paid request executing** — blotter Pay or `npm run buyer`. Clock **1:30**.

Hedera Harness stretch: not claimed (no PR).

---

## ENS

- [x] **ENSv2 Sepolia, not v1** — parent `nametoll.eth`, child `desk.nametoll.eth`. Register https://sepolia.etherscan.io/tx/0x28ab9c164cca6f967413f944a3ef1f81ca3ef86f7e1620fdc5b7a57d8d7a8a96. Clock **0:15**.
- [x] **Hierarchy or EAC or Permissioned Resolver demoed** — Permissioned Resolver `0x558283D5F8E36316B60be7e24F4e58C7133752D2`. Operator `0xFeAf5C921996FC53f4DEf35e181E766e6D74690A` has `ROLE_SET_TEXT` on `url` / `agent-context` / `agent-endpoint[web]` only; cannot transfer. Clock **0:35**.
- [x] **No hardcoded name/address on the happy path** — blotter, `GET /desk/resolve?name=`, `GET /desk/inspect?name=`, and `npm run buyer -- <name>` take a pasted name. Tests forbid `.eth` on `/`. Clock **0:15**.
- [x] **Video + live URL + public GitHub** — this file + README clock + https://github.com/shreyas-sovani/Nametoll + public desk URL.

---

## Chainlink

- [x] **`handlerInTee` / `HandlerInTee` in the repo** — `cre/nametoll-brain/workflow.ts` from official `hello-confidential-workflows-ts`. Clock **2:50**.
- [x] **`getSecret` inside the enclave** — `runtime.getSecret({ id: "SPEND_CAP" })`. Cap used in simulate: `150000` tinybars.
- [x] **Feature does not work without that secret/threshold** — Gate asks Brain before Blocky402 settle. Deny or skipped TEE → HTTP **403**, no merchandise, no HCS bill (`test/gate-brain.test.ts`). Clock **0:50**.
- [x] **`cre workflow simulate` log (Nitro / us-west-2)** — `docs/partners/chainlink/simulate-allow.log` (`100000` allow) and `simulate-deny.log` (`200000` deny). Both show TEE Execution / AWS Nitro `us-west-2`. Clock **2:50**.
- [x] **Something user-visible or onchain changes because of the TEE verdict** — over-cap Pay stays locked on the blotter; under-cap can settle. Clock **0:50** and **1:10**.
- [ ] **`join()` tx if chasing $500** — not pursued. No challenge transaction.
- [x] **No Functions / Automation** — Confidential Workflows only. No `ConfidentialHTTPClient` in the TEE handler.

---

## Recompute recipe (Hedera bill)

`GET` the Mirror Node topic URL, base64-decode each `message`, check `units * priceTinybarsPerUnit = tinybars`. `PRICE_TINYBARS` is `100000`.
