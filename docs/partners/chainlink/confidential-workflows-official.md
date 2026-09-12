# CRE Confidential Workflows — official rules only

Primary local source: `vendor/chainlink-agent-skills/chainlink-cre-skill/references/confidential-workflows.md`

Official pages:

- https://docs.chain.link/cre/guides/workflow/using-confidential-workflows/making-workflow-confidential-ts
- https://docs.chain.link/cre/reference/sdk/confidential-workflows-client-ts
- https://docs.chain.link/cre/account/confidential-workflows-access
- https://docs.chain.link/cre-templates/hello-confidential-workflows
- Template: `cre init -t hello-confidential-workflows-ts`

## What exists

- Register with `handlerInTee(trigger, fn, tees)` not `handler`.
- Callback gets `TeeRuntime`, not `Runtime`.
- Secrets: `runtime.getSecret({ id })` / `runtime.getSecrets([{ id }])` inside the enclave. No upfront `vaultDonSecrets` declaration.
- HTTP inside TEE: `new HTTPClient().sendRequest(runtime, req)` with the `TeeRuntime`.
- Consensus / reports: `runtime.usingTheDons()` then use the returned `Runtime`. Values passed across that boundary are **not** confidential.
- Scaffold new projects with `cre init`. Simulate with `cre workflow simulate` (include `--target` on every CLI command that accepts it). Nametoll evidence: `docs/partners/chainlink/simulate-allow.log`, `simulate-deny.log`, `simulate-allowlist-deny.log`, and `simulate-rate-deny.log`.

## What does not exist / do not invent

- Do **not** call `ConfidentialHTTPClient` from a TEE handler. That API has no `TeeRuntime` overload. Confidential HTTP and Confidential Workflows are different features and do not compose.
- Do **not** claim the workflow binary is hidden. Only the data the logic computes over is confidential; the binary is revealed to the DON.
- Do **not** log secrets or raw confidential payloads in production TEE handlers.
- Deployment is **private beta** and needs enrollment. Simulation does not.
- Advanced templates (`ai-audit-firewall`, `automated-liquidation-protection`, `automated-portfolio-rebalancing`) are clone-only from `smartcontractkit/cre-templates`, not `cre init -t` names.

Context7 library IDs: `/llmstxt/chain_link_cre_ts_llms-full_txt`, `/websites/chain_link_cre`, `/smartcontractkit/documentation`.
