# Vendored official agent sources

Working set is the **top 5 integrable partners**: Hedera, ENS, Chainlink, World, The Graph. 1inch is flex only.

Shallow clones. Update with `git -C <dir> pull`. Do not invent APIs missing from these trees or the live MCP URLs in `docs/partners/README.md`.

| Path | Upstream | SHA |
| --- | --- | --- |
| `vendor/hedera-skills` | https://github.com/hedera-dev/hedera-skills | `8b1fccd` |
| `vendor/chainlink-agent-skills` | https://github.com/smartcontractkit/chainlink-agent-skills | `48a024b` |
| `vendor/ens-cli` | https://github.com/ensdomains/ens-cli | `256cc45` |
| `vendor/ensnode` (sparse: `packages/ensskills`) | https://github.com/namehash/ensnode | `566cab2` |
| `vendor/x402-inference-pay-per-request-poc` | https://github.com/hedera-dev/x402-inference-pay-per-request-poc | `a56ad60` |
| `vendor/subgraphs-skills` | https://github.com/graphprotocol/subgraphs-skills | `7b3499a` |
| `vendor/substreams-skills` | https://github.com/streamingfast/substreams-skills | `8ccccf2` |
| `vendor/agentkit` | https://github.com/worldcoin/agentkit | `1ec70f7` |
| `vendor/1inch-ai` | https://github.com/1inch/1inch-ai | `e60a741` |

ENSNode hosted suite was documented as `1.15.2` at first scrape; the clone tracks `main` at the SHA above.
