// ============================================================================
// DRO Escrow Service — On-chain interactions via MetaMask
// Inspired by Oak Network's PaymentTreasury pattern
// ============================================================================

import {
  ESCROW_FACTORY_ADDRESS,
  CELO_SEPOLIA_RPC,
  CELO_SEPOLIA_CHAIN_ID,
  BLOCK_EXPLORER,
} from "./addresses";
import {
  encodeApprove,
  encodeFundEscrow,
  encodeReleaseEscrow,
  encodeRefundEscrow,
  encodeDisputeEscrow,
  encodeCreateEscrow,
  decodeUint256,
  decodeAddress,
} from "./abi-encoder";
import { EscrowStatus, type EscrowData } from "./abis";

// ── Types ──

export interface EscrowIntent {
  orderId: string;
  buyer: string;
  token: string;
  amount: string; // hex wei
  amountDisplay: string; // human readable
  deadline: number; // unix timestamp
  deadlineDays: number;
  factoryAddress: string;
  explorerUrl: string;
  status: "awaiting_approval" | "awaiting_fund" | "funded" | "error";
}

export interface TxResult {
  hash: string;
  explorerUrl: string;
}

// ── Helpers ──

function getEthereum(): { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } {
  const eth = (window as unknown as { ethereum?: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
  if (!eth) throw new Error("MetaMask not found. Please install MetaMask.");
  return eth;
}

async function rpcCall(method: string, params: unknown[]): Promise<string> {
  const res = await fetch(CELO_SEPOLIA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.result as string;
}

// ── Ensure correct chain ──

export async function ensureChain(): Promise<void> {
  const eth = getEthereum();
  const chainIdHex = (await eth.request({ method: "eth_chainId" })) as string;
  const currentChain = parseInt(chainIdHex, 16);

  if (currentChain !== CELO_SEPOLIA_CHAIN_ID) {
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${CELO_SEPOLIA_CHAIN_ID.toString(16)}` }],
      });
    } catch {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: `0x${CELO_SEPOLIA_CHAIN_ID.toString(16)}`,
          chainName: "Celo Sepolia Testnet",
          nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
          rpcUrls: [CELO_SEPOLIA_RPC],
          blockExplorerUrls: [BLOCK_EXPLORER],
        }],
      });
    }
  }
}

// ── Send transaction via MetaMask ──

export async function sendTransaction(to: string, data: string, value?: string): Promise<TxResult> {
  const eth = getEthereum();
  await ensureChain();

  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  const from = accounts[0];

  const txParams: Record<string, string> = {
    from,
    to,
    data,
  };
  if (value) txParams.value = value;

  const txHash = (await eth.request({
    method: "eth_sendTransaction",
    params: [txParams],
  })) as string;

  return {
    hash: txHash,
    explorerUrl: `${BLOCK_EXPLORER}/tx/${txHash}`,
  };
}

// ── Wait for transaction receipt ──

export async function waitForReceipt(txHash: string, maxAttempts = 60): Promise<{ status: boolean; blockNumber: number }> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await rpcCall("eth_getTransactionReceipt", [txHash]);
      if (receipt) {
        const r = receipt as unknown as { status: string; blockNumber: string };
        return {
          status: r.status === "0x1",
          blockNumber: parseInt(r.blockNumber, 16),
        };
      }
    } catch { /* receipt not ready yet */ }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Transaction not confirmed after 2 minutes");
}

// ── ERC20: Approve token spending ──

export async function approveToken(
  tokenAddress: string,
  spender: string,
  amount: bigint,
): Promise<TxResult> {
  const data = encodeApprove(spender, amount);
  return sendTransaction(tokenAddress, data);
}

// ── Escrow: Create escrow (called by arbiter/platform) ──

export async function createEscrow(
  orderId: string,
  buyer: string,
  tokenAddress: string,
  amount: bigint,
  deadlineTimestamp: bigint,
): Promise<TxResult> {
  const data = encodeCreateEscrow(orderId, buyer, tokenAddress, amount, deadlineTimestamp);
  return sendTransaction(ESCROW_FACTORY_ADDRESS, data);
}

// ── Escrow: Fund escrow (called by buyer after approval) ──

export async function fundEscrow(escrowId: string): Promise<TxResult> {
  const data = encodeFundEscrow(escrowId);
  return sendTransaction(ESCROW_FACTORY_ADDRESS, data);
}

// ── Escrow: Release (called by arbiter on delivery confirmation) ──

export async function releaseEscrow(escrowId: string): Promise<TxResult> {
  const data = encodeReleaseEscrow(escrowId);
  return sendTransaction(ESCROW_FACTORY_ADDRESS, data);
}

// ── Escrow: Refund (called by arbiter) ──

export async function refundEscrow(escrowId: string): Promise<TxResult> {
  const data = encodeRefundEscrow(escrowId);
  return sendTransaction(ESCROW_FACTORY_ADDRESS, data);
}

// ── Escrow: Dispute (called by buyer) ──

export async function disputeEscrow(escrowId: string): Promise<TxResult> {
  const data = encodeDisputeEscrow(escrowId);
  return sendTransaction(ESCROW_FACTORY_ADDRESS, data);
}

// ── Read escrow status from chain ──

export async function getEscrowStatus(escrowId: string): Promise<EscrowStatus> {
  const selector = "0x5de28ae0"; // getEscrow(bytes32)
  const data = selector + (escrowId.startsWith("0x") ? escrowId.slice(2) : escrowId).padEnd(64, "0");

  try {
    const result = await rpcCall("eth_call", [{ to: ESCROW_FACTORY_ADDRESS, data }, "latest"]);
    if (!result || result === "0x") return EscrowStatus.Created;
    // Status is the 7th word (index 6) in the return data
    const statusHex = result.slice(2 + 64 * 6, 2 + 64 * 7);
    return Number(decodeUint256(statusHex)) as EscrowStatus;
  } catch {
    return EscrowStatus.Created;
  }
}

// ── Read full escrow data from chain ──

export async function getEscrowData(escrowId: string): Promise<EscrowData | null> {
  const selector = "0x5de28ae0"; // getEscrow(bytes32)
  const padded = (escrowId.startsWith("0x") ? escrowId.slice(2) : escrowId).padEnd(64, "0");
  const data = selector + padded;

  try {
    const result = await rpcCall("eth_call", [{ to: ESCROW_FACTORY_ADDRESS, data }, "latest"]);
    if (!result || result === "0x" || result.length < 450) return null;

    const words = result.slice(2).match(/.{64}/g) ?? [];
    return {
      escrowId,
      orderId: "",
      buyer: decodeAddress(words[1]),
      token: decodeAddress(words[2]),
      amount: decodeUint256(words[3]),
      deadline: Number(decodeUint256(words[4])),
      status: Number(decodeUint256(words[5])) as EscrowStatus,
      funded: decodeUint256(words[6]) > BigInt(0),
      deliveredAt: words.length > 7 ? Number(decodeUint256(words[7])) : 0,
    };
  } catch {
    return null;
  }
}

// ── Build escrow intent for client-side execution ──

export function buildEscrowIntent(
  orderId: string,
  buyer: string,
  tokenAddress: string,
  amountRaw: bigint,
  amountDisplay: string,
  deadlineDays: number,
): EscrowIntent {
  const deadline = Math.floor(Date.now() / 1000) + deadlineDays * 24 * 60 * 60;

  return {
    orderId,
    buyer,
    token: tokenAddress,
    amount: "0x" + amountRaw.toString(16),
    amountDisplay,
    deadline,
    deadlineDays,
    factoryAddress: ESCROW_FACTORY_ADDRESS,
    explorerUrl: `${BLOCK_EXPLORER}/address/${ESCROW_FACTORY_ADDRESS}`,
    status: "awaiting_approval",
  };
}
