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
    expect(workflow).toMatch(/BUYER_ALLOWLIST/);
    expect(workflow).toMatch(/RATE_LIMIT/);
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
    expect(creVerdict).toMatch(/buyer not allowlisted/);
    expect(creVerdict).toMatch(/rate limited/);
    expect(decideSpend("100000", "150000").allow).toBe(true);
    expect(decideSpend("200000", "150000").allow).toBe(false);
  });

  it("pins join() to the live official ChallengeLending on the same HTTP TEE handler", () => {
    const challenge = readFileSync(
      resolve(process.cwd(), "cre/nametoll-brain/challenge.ts"),
      "utf8",
    );
    const staging = readFileSync(
      resolve(process.cwd(), "cre/nametoll-brain/config.staging.json"),
      "utf8",
    );
    expect(challenge).toMatch(/function join\(\)/);
    expect(challenge).toMatch(/0x88574e7Cc0027afd04951daa09B64d4441931ba1/);
    expect(challenge).not.toMatch(/0x59d5B29FbA5ca865a171076BE94EbEeC5BCA1E04/);
    expect(staging).toMatch(/0x88574e7Cc0027afd04951daa09B64d4441931ba1/);
    expect(workflow).toMatch(/action === 'join'/);
    expect(workflow).toMatch(/unsignedJoinCall/);
    expect(workflow).not.toMatch(/writeReport\(/);
    expect(workflow).not.toMatch(/CRE_LIQUIDATION_/);
  });

  it("committed join simulate log shows TEE join calldata, not a fake tx", () => {
    const joinLog = readFileSync(
      resolve(process.cwd(), "docs/partners/chainlink/simulate-join.log"),
      "utf8",
    );
    expect(joinLog).toMatch(/TEE Execution|handlerInTee|TeeRuntime/i);
    expect(joinLog).toMatch(/TEE handler: action=join/);
    expect(joinLog).toMatch(/0x88574e7Cc0027afd04951daa09B64d4441931ba1/);
    expect(joinLog).toMatch(/0xb688a363/);
    expect(joinLog).not.toMatch(/SPEND_CAP_TINYBARS_VAR=/);
    expect(joinLog).not.toMatch(/join\(\) tx:\s*0x[a-fA-F0-9]{64}/);
  });
});
