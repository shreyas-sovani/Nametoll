import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertCanJoin,
  assertJoinCall,
  broadcastUnsignedJoin,
  CHALLENGE_LENDING,
  encodeJoinCalldata,
  sepoliaJoinExplorerUrl,
  unsignedJoinCall,
} from "../src/modules/brain/join-broadcast.ts";

const OFFICIAL = "0x88574e7Cc0027afd04951daa09B64d4441931ba1";
const DEAD_SCRAPE = "0x59d5B29FbA5ca865a171076BE94EbEeC5BCA1E04";
const FROM = "0xFeAf5C921996FC53f4DEf35e181E766e6D74690A" as const;
const TX = `0x${"ab".repeat(32)}` as const;

describe("ChallengeLending join broadcast", () => {
  it("accepts unsigned TEE join calldata for the live official contract", () => {
    const call = unsignedJoinCall();
    expect(assertJoinCall(call)).toEqual({
      action: "join",
      to: OFFICIAL,
      data: "0xb688a363",
      chainId: 11155111,
      chain: "ethereum-testnet-sepolia",
    });
    expect(encodeJoinCalldata()).toBe("0xb688a363");
    expect(CHALLENGE_LENDING).toBe(OFFICIAL);
    const cre = readFileSync(
      resolve(process.cwd(), "cre/nametoll-brain/challenge.ts"),
      "utf8",
    );
    expect(cre).toContain(OFFICIAL);
    expect(cre).toMatch(/function join\(\)/);
  });

  it("refuses the dead ETHOnline scrape address and a non-join selector", () => {
    expect(() =>
      assertJoinCall({ ...unsignedJoinCall(), to: DEAD_SCRAPE }),
    ).toThrow(/official ChallengeLending/i);
    expect(() =>
      assertJoinCall({ ...unsignedJoinCall(), data: "0xdeadbeef" }),
    ).toThrow(/join\(\) calldata/i);
  });

  it("refuses to send when the challenge is closed or the wallet already joined", () => {
    expect(() =>
      assertCanJoin({ challengeOpen: false, alreadyJoined: false }),
    ).toThrow(/not open/i);
    expect(() =>
      assertCanJoin({ challengeOpen: true, alreadyJoined: true }),
    ).toThrow(/already joined/i);
    expect(() =>
      assertCanJoin({ challengeOpen: true, alreadyJoined: false }),
    ).not.toThrow();
  });

  it("broadcasts the TEE calldata after preflight and never carries a private key", async () => {
    const sent: Array<{ to: string; data: string }> = [];
    const result = await broadcastUnsignedJoin({
      call: unsignedJoinCall(),
      from: FROM,
      async challengeOpen() {
        return true;
      },
      async alreadyJoined() {
        return false;
      },
      async send(tx) {
        sent.push(tx);
        return TX;
      },
    });
    expect(sent).toEqual([{ to: OFFICIAL, data: "0xb688a363" }]);
    expect(result).toEqual({
      txHash: TX,
      from: FROM,
      to: OFFICIAL,
      chainId: 11155111,
      explorerUrl: sepoliaJoinExplorerUrl(TX),
    });
    expect(JSON.stringify(result)).not.toMatch(/privateKey|PRIV_KEY|ACC_1/i);
  });

  it("does not send a transaction when already joined", async () => {
    let sent = 0;
    await expect(
      broadcastUnsignedJoin({
        call: unsignedJoinCall(),
        from: FROM,
        async challengeOpen() {
          return true;
        },
        async alreadyJoined() {
          return true;
        },
        async send() {
          sent += 1;
          return TX;
        },
      }),
    ).rejects.toThrow(/already joined/i);
    expect(sent).toBe(0);
  });

  it("points the result at Sepolia Etherscan", () => {
    expect(sepoliaJoinExplorerUrl(TX)).toBe(
      `https://sepolia.etherscan.io/tx/${TX}`,
    );
  });

  it("exposes npm run join without putting a private key on the command", () => {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.join).toBe("tsx src/modules/brain/join-cli.ts");
    expect(pkg.scripts?.join).not.toMatch(/PRIV|0x[a-fA-F0-9]{64}/);
  });
});
