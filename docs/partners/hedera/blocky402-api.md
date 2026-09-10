# Blocky402 facilitator API (official snapshot)

Source: https://blocky402.com/docs/api-reference/

Wire format is **x402 v2** (`x402Version: 2`). The facilitator does not accept v1 envelopes.

## Base URLs

- Testnet: `https://api.testnet.blocky402.com` (or `http://localhost:3002` locally)
- Mainnet: `https://api.blocky402.com/v1` (docs marked coming soon at scrape time)

## Auth

- Testnet: open
- Mainnet: `X-Api-Key: b402_<64 hex>` when enabled

## Endpoints that exist

| Method | Path | Role |
| --- | --- | --- |
| `GET` | `/supported` | schemes, networks, Hedera/SVM `extra.feePayer`, `signers` |
| `POST` | `/verify` | check a v2 `paymentPayload` |
| `POST` | `/settle` | broadcast / co-sign |
| `GET` | `/health` | liveness |

Hedera `exact` payload shape:

```json
{ "transaction": "<base64-encoded TransferTransaction bytes>" }
```

Produced by `@x402/hedera` `ExactHederaScheme.createPaymentPayload(...)`. The facilitator fee-payer **must** match `GET /supported` (`kinds[].extra.feePayer` or `signers["hedera:*"][0]`). Put that same value in `paymentRequirements.extra.feePayer` or the client SDK throws before signing.

Asset `0.0.0` is native HBAR. Amounts are **tinybars** (1 HBAR = 1e8 tinybars). Do not invent other facilitator routes.
