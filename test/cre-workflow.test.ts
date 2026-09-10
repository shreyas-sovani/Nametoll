import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCreSimulateVerdict } from "../src/modules/brain/simulate.ts";
import { decideSpend } from "../src/modules/brain/verdict.ts";

describe("CRE confidential workflow", () => {
  const workflow = readFileSync(
    resolve(process.cwd(), "cre/nametoll-brain/workflow.ts"),
    "utf8",
  );

  it("registers handlerInTee and loads the spend cap with getSecret", () => {
    expect(workflow).toMatch(/handlerInTee/);
    expect(workflow).toMatch(/getSecret/);
    expect(workflow).toMatch(/TeeRuntime/);
    expect(workflow).not.toMatch(/\bhandler\(/);
  });

  it("does not mix ConfidentialHTTPClient or leak secrets through usingTheDons", () => {
    expect(workflow).not.toMatch(/new\s+ConfidentialHTTPClient/);
    expect(workflow).not.toMatch(/runtime\.usingTheDons/);
    expect(workflow).not.toMatch(/vaultDonSecrets\s*:/);
  });

  it("committed simulate logs show a TEE handler and a secret-cap flip", () => {
    const allow = readFileSync(
      resolve(process.cwd(), "docs/partners/chainlink/simulate-allow.log"),
      "utf8",
    );
    const deny = readFileSync(
      resolve(process.cwd(), "docs/partners/chainlink/simulate-deny.log"),
      "utf8",
    );
    for (const log of [allow, deny]) {
      expect(log).toMatch(/TEE Execution|handlerInTee|TeeRuntime/i);
      expect(log).toMatch(/TEE handler/);
      expect(log).not.toMatch(/SPEND_CAP_TINYBARS_VAR=/);
      expect(log).not.toMatch(/0x[a-fA-F0-9]{64}/);
    }
    expect(parseCreSimulateVerdict(allow)).toMatchObject({
      allow: true,
      reason: "under cap",
    });
    expect(parseCreSimulateVerdict(deny)).toMatchObject({
      allow: false,
      reason: "over cap",
    });
  });

  it("keeps the CRE verdict copy aligned with the desk", () => {
    const creVerdict = readFileSync(
      resolve(process.cwd(), "cre/nametoll-brain/verdict.ts"),
      "utf8",
    );
    expect(creVerdict).toMatch(/requested <= cap/);
    expect(decideSpend("100000", "150000").allow).toBe(true);
    expect(decideSpend("200000", "150000").allow).toBe(false);
  });
});
