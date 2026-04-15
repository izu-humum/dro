// POST /api/admin/escrow — Owner-only escrow management (release, refund, resolve dispute)
import { NextResponse } from "next/server";
import { JsonRpcProvider, Wallet } from "ethers";

const RPC = "https://rpc.ankr.com/celo_sepolia";
const ESCROW_FACTORY = "0xe175B28A80Cc36daE108B69172d44Feb5Ab57327";
const EXPLORER = "https://sepolia.celoscan.io";

const SELECTORS: Record<string, string> = {
  releaseEscrow: "0xb1e6d2a1",
  refundEscrow: "0x7c41ad2c",
  resolveDispute: "0x3e35178b",
  markDelivered: "0x", // will be set below
  getEscrow: "0x5de28ae0",
};

// keccak256("markDelivered(bytes32)") — precomputed
SELECTORS.markDelivered = "0xb6914c52";

function encBytes32(v: string): string {
  return (v.startsWith("0x") ? v.slice(2) : v).padEnd(64, "0");
}

function encBool(v: boolean): string {
  return (v ? "1" : "0").padStart(64, "0");
}

async function sendTx(data: string): Promise<string> {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY not set");

  const provider = new JsonRpcProvider(RPC);
  const wallet = new Wallet(pk, provider);

  const tx = await wallet.sendTransaction({ to: ESCROW_FACTORY, data });
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error("Transaction reverted");
  return tx.hash;
}

async function readEscrow(escrowId: string) {
  const data = SELECTORS.getEscrow + encBytes32(escrowId);
  const provider = new JsonRpcProvider(RPC);

  let result: string;
  try {
    result = await provider.call({ to: ESCROW_FACTORY, data });
  } catch {
    return null;
  }

  if (!result || result === "0x" || result.length < 450) return null;

  const words = result.slice(2).match(/.{64}/g) ?? [];
  if (!words || words.length < 8) return null;

  const statusNames = ["Created", "Funded", "Released", "Refunded", "Disputed", "Delivered"];
  const statusNum = Number(BigInt("0x" + words[6]));
  const buyer = "0x" + words[2].slice(24);

  if (buyer === "0x0000000000000000000000000000000000000000") return null;

  const deliveredAt = words.length > 8 ? Number(BigInt("0x" + words[8])) : 0;
  const GRACE_PERIOD = 3 * 24 * 60 * 60; // 3 days in seconds

  return {
    escrowId,
    buyer,
    token: "0x" + words[3].slice(24),
    amount: Number(BigInt("0x" + words[4])) / 1e6,
    amountRaw: BigInt("0x" + words[4]).toString(),
    deadline: Number(BigInt("0x" + words[5])),
    deadlineDate: new Date(Number(BigInt("0x" + words[5])) * 1000).toISOString(),
    status: statusNum,
    statusName: statusNames[statusNum] ?? "Unknown",
    funded: BigInt("0x" + words[7]) > BigInt(0),
    deliveredAt,
    deliveredAtDate: deliveredAt > 0 ? new Date(deliveredAt * 1000).toISOString() : null,
    graceEndsAt: deliveredAt > 0 ? deliveredAt + GRACE_PERIOD : null,
    graceEndsAtDate: deliveredAt > 0 ? new Date((deliveredAt + GRACE_PERIOD) * 1000).toISOString() : null,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, escrowId, releaseToTreasury } = body;

    if (!escrowId) {
      return NextResponse.json({ error: "escrowId is required" }, { status: 400 });
    }

    let calldata: string;

    switch (action) {
      case "release":
        calldata = SELECTORS.releaseEscrow + encBytes32(escrowId);
        break;
      case "refund":
        calldata = SELECTORS.refundEscrow + encBytes32(escrowId);
        break;
      case "resolve":
        if (typeof releaseToTreasury !== "boolean") {
          return NextResponse.json({ error: "releaseToTreasury (boolean) is required for resolve" }, { status: 400 });
        }
        calldata = SELECTORS.resolveDispute + encBytes32(escrowId) + encBool(releaseToTreasury);
        break;
      case "deliver":
        calldata = SELECTORS.markDelivered + encBytes32(escrowId);
        break;
      case "lookup":
        const escrow = await readEscrow(escrowId);
        if (!escrow) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
        return NextResponse.json(escrow);
      default:
        return NextResponse.json({ error: "Invalid action. Use: release, refund, resolve, deliver, lookup" }, { status: 400 });
    }

    const txHash = await sendTx(calldata);
    const escrow = await readEscrow(escrowId).catch(() => null);

    return NextResponse.json({
      success: true,
      action,
      escrowId,
      txHash,
      explorerUrl: `${EXPLORER}/tx/${txHash}`,
      escrow,
    });
  } catch (error) {
    console.error("Admin escrow error:", error);
    let msg = "Operation failed";
    if (error instanceof Error) {
      if (error.message.includes("EscrowNotFound") || error.message.includes("require(false)") || error.message.includes("no data present")) {
        msg = "Escrow not found. Make sure you entered a valid escrow ID (bytes32 hash), not a contract address.";
      } else if (error.message.includes("InvalidStatus")) {
        msg = "Invalid escrow status for this action. The escrow may already be released or refunded.";
      } else if (error.message.includes("NotBuyer")) {
        msg = "Only the buyer can perform this action.";
      } else if (error.message.includes("DeadlineNotPassed")) {
        msg = "The escrow deadline has not passed yet. Auto-refund is not available.";
      } else if (error.message.includes("DEPLOYER_PRIVATE_KEY")) {
        msg = "Server configuration error: deployer key not set.";
      } else {
        msg = error.message.length > 200 ? error.message.slice(0, 200) + "..." : error.message;
      }
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
