import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");
const pack = readFileSync(
  resolve(process.cwd(), "docs/submission.md"),
  "utf8",
);

describe("B12 submission pack", () => {
  it("locks the form trio as Hedera, ENS, and Chainlink", () => {
    expect(readme).toMatch(/Form picks:.*Hedera.*ENS.*Chainlink/s);
    expect(readme).toMatch(/not on the form:\s*World, The Graph/i);
    expect(pack).toMatch(/Hedera · ENS · Chainlink/);
    expect(pack).not.toMatch(/form pick:\s*World/i);
    expect(pack).not.toMatch(/form pick:\s*The Graph/i);
  });

  it("maps video timestamps onto each locked partner qual", () => {
    expect(readme).toMatch(/\d:\d{2}/);
    expect(readme).toMatch(/Hedera/i);
    expect(readme).toMatch(/ENS/i);
    expect(readme).toMatch(/Chainlink/i);
    expect(readme).toMatch(/2–4|2-4/);
    expect(readme).toMatch(/paste a name/i);
    expect(readme).toMatch(/HashScan/);
    expect(readme).toMatch(/HCS/);
    expect(readme).toMatch(/handlerInTee|simulate-allow\.log/);
  });

  it("points every Hedera AI checklist row at README or repo evidence", () => {
    expect(pack).toMatch(/Live URL/);
    expect(pack).toMatch(/nonwaxing-xeromorphic-dagmar\.ngrok-free\.dev|PUBLIC_DESK_URL/);
    expect(pack).toMatch(/x402 v2/);
    expect(pack).toMatch(/Blocky402/);
    expect(pack).toMatch(/0\.0\.7162784@1789065380\.080315812|hashscan\.io\/testnet\/tx\//);
    expect(pack).toMatch(/0\.0\.10464309/);
    expect(pack).toMatch(/100000/);
    expect(pack).toMatch(/200000/);
    expect(pack).toMatch(/0\.0\.10463755@1789114039\.622724528/);
    expect(pack).toMatch(/npm run buyer/);
  });

  it("points every ENS checklist row at live Sepolia evidence", () => {
    expect(pack).toMatch(/ENSv2/);
    expect(pack).toMatch(/Sepolia/);
    expect(pack).toMatch(/Permissioned Resolver/);
    expect(pack).toMatch(/EAC/);
    expect(pack).toMatch(/nametoll\.eth/);
    expect(pack).toMatch(/does not|no hardcoded|not default/i);
    expect(pack).toMatch(/github\.com\/shreyas-sovani\/Nametoll/);
  });

  it("points every Chainlink checklist row at the TEE pay path", () => {
    expect(pack).toMatch(/handlerInTee/);
    expect(pack).toMatch(/getSecret/);
    expect(pack).toMatch(/SPEND_CAP/);
    expect(pack).toMatch(/simulate-allow\.log/);
    expect(pack).toMatch(/simulate-deny\.log/);
    expect(pack).toMatch(/simulate-allowlist-deny\.log/);
    expect(pack).toMatch(/simulate-rate-deny\.log/);
    expect(pack).toMatch(/Discovery \/ directory/);
    expect(pack).toMatch(/Scheduled Transactions/);
    expect(pack).toMatch(/HTS \/ custom fees/);
    expect(pack).toMatch(/gone\.nametoll\.eth/);
    expect(pack).toMatch(/us-west-2|Nitro/i);
    expect(pack).toMatch(/403/);
    expect(pack).toMatch(/No Functions \/ Automation|no Functions/);
    expect(pack).toMatch(
      /join\(\) tx:\s*0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086/,
    );
    expect(pack).toMatch(
      /sepolia\.etherscan\.io\/tx\/0x980aaffe6d62561964a42675f7831adbca09cf442c7db0cede9255e2ed5e3086/,
    );
  });

  it("attributes AI and states the video rules", () => {
    expect(readme).toMatch(/AI attributed|AI agents wrote|human directed/i);
    expect(pack).toMatch(/2–4 min|2-4 min/);
    expect(pack).toMatch(/≥720p|720p/);
    expect(pack).not.toMatch(/TTS|music-over-text|phone camera/i);
  });
});
