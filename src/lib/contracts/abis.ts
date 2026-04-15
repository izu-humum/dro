// ============================================================================
// DRO Contract ABIs — Minimal ABI definitions for on-chain interactions
// ============================================================================

// ERC20 — only the functions we need
export const ERC20_ABI = {
  approve: "approve(address,uint256)",
  allowance: "allowance(address,address)",
  balanceOf: "balanceOf(address)",
  transfer: "transfer(address,uint256)",
} as const;

// Function selectors (first 4 bytes of keccak256)
export const ERC20_SELECTORS = {
  approve: "0x095ea7b3",
  allowance: "0xdd62ed3e",
  balanceOf: "0x70a08231",
  transfer: "0xa9059cbb",
} as const;

// DroEscrowFactory — Oak-inspired escrow contract
export const ESCROW_ABI = {
  createEscrow: "createEscrow(string,address,address,uint256,uint256)",
  fundEscrow: "fundEscrow(bytes32)",
  releaseEscrow: "releaseEscrow(bytes32)",
  refundEscrow: "refundEscrow(bytes32)",
  disputeEscrow: "disputeEscrow(bytes32)",
  autoRefund: "autoRefund(bytes32)",
  getEscrow: "getEscrow(bytes32)",
  getEscrowId: "getEscrowId(string)",
} as const;

export const ESCROW_SELECTORS = {
  createEscrow: "0x", // Will be computed at runtime
  fundEscrow: "0x",
  releaseEscrow: "0x",
  refundEscrow: "0x",
  disputeEscrow: "0x",
  autoRefund: "0x",
  getEscrow: "0x",
  getEscrowId: "0x",
} as const;

// Escrow status enum matching the Solidity contract
export enum EscrowStatus {
  Created = 0,
  Funded = 1,
  Released = 2,
  Refunded = 3,
  Disputed = 4,
  Delivered = 5,
}

export interface EscrowData {
  escrowId: string;
  orderId: string;
  buyer: string;
  token: string;
  amount: bigint;
  deadline: number;
  status: EscrowStatus;
  funded: boolean;
  deliveredAt: number;
}
