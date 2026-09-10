# Working notes (B0–B3)

## Blocky402 probe (10 Sep 2026)

- `GET https://api.testnet.blocky402.com/health` → `{"status":"ok"}`
- Hedera fee-payer from `GET /supported`: `hedera:testnet` `extra.feePayer` = `0.0.7162784` (also `signers["hedera:*"][0]`)

## Public desk (B3)

- Origin: https://nonwaxing-xeromorphic-dagmar.ngrok-free.dev
- `GET /health` 200
- `GET /desk/snapshot` 402, `resource.url` https, `payTo` `0.0.10463755`, `extra.feePayer` `0.0.7162784`

## Live settle / HashScan (B2)

Buyer CLI paid the desk through Blocky402. Resource server held no facilitator key.

- Seller (payTo): `0.0.10463755`
- Buyer: `0.0.10463842`
- Amount: `100000` tinybars (0.001 HBAR), asset `0.0.0`
- Settle tx: `0.0.7162784@1789065380.080315812`
- HashScan: https://hashscan.io/testnet/tx/0.0.7162784@1789065380.080315812
- Public-URL settle: https://hashscan.io/testnet/tx/0.0.7162784@1789065412.888366457
- Mirror Node: `SUCCESS` `CRYPTOTRANSFER` — buyer `-100000`, seller `+100000`

```text
HASHSCAN_SETTLE=https://hashscan.io/testnet/tx/0.0.7162784@1789065380.080315812
HASHSCAN_SETTLE_PUBLIC=https://hashscan.io/testnet/tx/0.0.7162784@1789065412.888366457
```
