# DRO — AI-Powered Proxy Marketplace

DRO is a decentralized proxy marketplace where users describe what they want in natural language and a multi-agent AI system searches 10+ platforms, compares prices, handles payment (fiat or crypto), manages escrow via smart contracts, and tracks delivery — all through a single conversational interface.

Built with **Next.js 16**, **React 19**, **Google ADK**, **Gemini AI**, and **Solidity** smart contracts on **Celo**.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Agent System](#agent-system)
  - [How Orchestration Works](#how-orchestration-works)
  - [Agent Catalog](#agent-catalog)
- [Tool System](#tool-system)
- [Google ADK Integration](#google-adk-integration)
- [Agent Skills (A2A)](#agent-skills-a2a)
- [A2A Protocol (Agent-to-Agent)](#a2a-protocol-agent-to-agent)
- [Smart Contracts](#smart-contracts)
  - [Deployed Addresses](#deployed-addresses)
  - [Escrow Flow — Fiat vs Crypto](#escrow-flow--fiat-vs-crypto)
  - [Escrow State Machine](#escrow-state-machine)
- [API Routes](#api-routes)
- [Frontend Pages](#frontend-pages)
- [AI Integration](#ai-integration)
- [Wallet Integration](#wallet-integration)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)

---

## Architecture Overview

DRO has two complementary agent stacks:

```
┌──────────────────────────────────────────────────────────┐
│                    User (Browser)                        │
│  Search bar · Chat · Checkout · Dashboard · Tracking     │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP
┌────────────────────────▼─────────────────────────────────┐
│              Next.js API Routes                          │
│  /api/chat · /api/search · /api/purchase · /api/track    │
│  /api/dispute · /api/escrow · /api/faucet · /api/a2a     │
└────────────────────────┬─────────────────────────────────┘
                         │
          ┌──────────────▼──────────────┐
          │   Google ADK Runner         │
          │   (dro_orchestrator)        │
          │   model: gemini-2.5-flash   │
          └──────────┬──────────────────┘
                     │ sub-agent transfer
     ┌───────┬───────┼───────┬────────┬────────┬──────────┐
     ▼       ▼       ▼       ▼        ▼        ▼          ▼
  Web      Steam  Digital  Price   Payment  Purchase   Order    Dispute
  Search   Agent  Market   Compare  Agent    Agent    Tracking   Agent
  Agent           Agent    Agent                      Agent
     │       │       │       │        │        │        │          │
     └───────┴───────┴───────┴────────┴────────┴────────┴──────────┘
                     │
          ┌──────────▼──────────────┐
          │     18 Tool Functions    │
          │  (search, pay, escrow…)  │
          └──────────┬──────────────┘
                     │
     ┌───────────────┼────────────────┐
     ▼               ▼                ▼
  External APIs    Mock Markets    Smart Contracts
  (Serper, Oak)    (Steam, G2A…)   (Celo Sepolia)
```

**Runtime path:** Every user-facing HTTP request goes through the **Google ADK** `dro_orchestrator` root agent, which delegates to specialized sub-agents via LLM-driven transfer. Each sub-agent has attached `FunctionTool`s that call the same underlying tool modules.

**Library path:** A parallel `BaseAgent` class hierarchy + in-memory A2A task system exists in `src/lib/agents/` and `src/lib/a2a/` for extensibility, testing, and future standalone deployment.

---

## Agent System

### How Orchestration Works

1. **User sends a message** (search query, purchase request, tracking inquiry, etc.)
2. **API route** calls `runAgent()` from the ADK runner
3. **`dro_orchestrator`** (the root LlmAgent) analyzes intent using Gemini and **transfers** to the appropriate specialist sub-agent
4. **Specialist agent** executes its tools (search APIs, payment processing, escrow creation, etc.)
5. **Results flow back** through the runner, which extracts structured data (`products`, `payment_results`, `tracking_results`, etc.) from agent state
6. **API returns** structured JSON to the frontend

The custom `OrchestratorAgent` class provides a second orchestration path with:
- **AI intent classification** via `geminiJSON` (with regex fallback)
- **Guardrails** for blocked/age-restricted content
- **Query refinement** for ambiguous searches
- **A2A fan-out** to multiple agents in parallel

### Agent Catalog

| Agent | ID | Purpose | Tools Used |
|-------|----|---------|------------|
| **Web Search** | `web_search` | Searches Google Shopping via Serper API, scrapes product details | `web_search`, `web_scrape` |
| **Steam** | `steam` | Searches Steam Community Market for CS2 skins/items, checks float values and price history | `steam_market_search`, `steam_price_history`, `steam_float_check` |
| **Digital Marketplace** | `digital_marketplace` | Parallel search across Skinport, Buff163, and G2A for digital goods and game keys | `skinport_search`, `buff163_search`, `g2a_search` |
| **Price Comparison** | `price_comparison` | Ranks listings across sources with fee-aware totals, recommends best deals | `compare_prices`, `calculate_fees` |
| **Payment** | `payment` | Calculates fees, processes fiat (card/bank) or crypto (USDC) payments, creates escrow | `calculate_fees`, `process_fiat_payment`, `process_crypto_payment`, `create_escrow` |
| **Purchase** | `purchase` | Executes the proxy purchase after escrow is funded | `execute_purchase` |
| **Order Tracking** | `order_tracking` | Tracks order status, timeline, and carrier shipping details | `track_order`, `track_shipping` |
| **Dispute & Refund** | `dispute_refund` | Verifies order status and opens disputes for problematic orders | `initiate_dispute`, `track_order` |
| **Health Monitor** | `health_monitor` | E2E HTTP checks against all pages and APIs (used by `/api/health`) | — |

---

## Tool System

All 18 tools are registered via `initializeTools()` in `src/lib/tools/index.ts` and exposed to agents through both the custom `toolRegistry` and ADK `FunctionTool` wrappers.

### Search Tools

| Tool | Description |
|------|-------------|
| `web_search` | Google Shopping search via Serper API. Inputs: `query`, `maxResults`, `region`. Returns product listings with prices, images, sources. |
| `web_scrape` | Scrapes product details from a URL. Inputs: `url`, optional `selectors`. |

### Steam Tools

| Tool | Description |
|------|-------------|
| `steam_market_search` | Searches Steam Community Market. Inputs: `query`, `appId`, price/quality filters, `sortBy`. |
| `steam_market_listing` | Gets detailed listing info. Inputs: `listingId`, `appId`. |
| `steam_price_history` | Price history + statistics. Inputs: `itemName`, `appId`, `days`. |
| `steam_float_check` | Checks weapon float value and wear. Inputs: `inspectLink`. Returns float, wear tier, paint seed, rare pattern flag. |

### Marketplace Tools

| Tool | Description |
|------|-------------|
| `skinport_search` | Searches Skinport listings. Inputs: `query`, price/wear/sort filters. |
| `buff163_search` | Searches Buff163 listings. Inputs: `query`, price/quality filters. |
| `g2a_search` | Searches G2A for game keys and digital goods. Inputs: `query`, category, price range. |

### Analysis Tools

| Tool | Description |
|------|-------------|
| `compare_prices` | Ranks and summarizes prices across sources. Inputs: `itemName`, `prices[]`, `preferTier`. Returns comparison table, summary, recommendation. |
| `calculate_fees` | Calculates platform (1%), escrow (1%), and payment method fees. Inputs: `itemPrice`, `source`, `paymentMethod`, `currency`. |

### Payment Tools

| Tool | Description |
|------|-------------|
| `process_fiat_payment` | Processes card/bank payments. Inputs: `amount`, `currency`, `method`, `cardLast4`, `orderId`. |
| `process_crypto_payment` | Processes crypto payment intent. Inputs: `amount`, `token`, `walletAddress`, `orderId`. |
| `create_escrow` | Creates escrow via smart contract factory. Inputs: `buyerAddress`, `sellerSource`, `amount`, `orderId`, `token`, `timeoutDays`. Returns escrow address and transaction steps. |

### Fulfillment Tools

| Tool | Description |
|------|-------------|
| `execute_purchase` | Creates a proxy purchase order. Inputs: `source`, `itemId`, `itemName`, `price`, `deliveryType`, `deliveryTarget`, `escrowAddress`. |
| `track_order` | Retrieves order status, timeline, and escrow snapshot. Inputs: `orderId`. |
| `track_shipping` | Gets carrier tracking info. Inputs: `trackingId`, `carrier`. |
| `initiate_dispute` | Opens a dispute. Inputs: `orderId`, `reason`, `description`, optional `evidence`, `requestedResolution`. |

---

## Google ADK Integration

The `src/lib/adk/` layer bridges the tool system into [Google's Agent Development Kit](https://google.github.io/adk-web/):

- **`agents.ts`** — Defines `LlmAgent` instances (one per specialist) with system instructions and attached `FunctionTool`s. The `rootAgent` (`dro_orchestrator`) has all specialists as `subAgents` and uses LLM-driven transfer for delegation. Model: `gemini-2.5-flash-lite`.
- **`tools.ts`** — Wraps each `ToolDefinition.execute` in a `FunctionTool` with Zod schemas. Groups tools by category (search, steam, marketplace, analysis, payment, purchase, tracking, dispute).
- **`runner.ts`** — `Runner` with `InMemorySessionService`. `runAgent(message, opts)` streams events, collects structured output from agent state keys (`web_search_results`, `steam_results`, `payment_results`, etc.), and normalizes products via `extractProducts()`.

---

## Agent Skills (A2A)

Each agent advertises discoverable **skills** via A2A agent cards. External agents or systems can query `GET /.well-known/agent.json` to find which agent handles a given capability.

| Agent | Skill | Description | Tags |
|-------|-------|-------------|------|
| **Orchestrator** | `route` — Intent Routing | Classifies user intent and delegates to the right agent | `routing`, `orchestration` |
| | `workflow` — Multi-Agent Workflow | Coordinates sequential workflows (search → compare → buy) | `workflow`, `pipeline` |
| **Web Search** | `product_search` — Product Search | Search for products by name, category, or description | `search`, `products`, `shopping` |
| **Steam** | `steam_search` — Steam Market Search | Search Steam Community Market for game items | `steam`, `cs2`, `skins`, `gaming` |
| | `float_check` — Float Check | Check CS2 skin float value and wear | `cs2`, `float`, `inspect` |
| | `price_history` — Price History | Get Steam market price history for an item | `steam`, `prices`, `history` |
| **Digital Marketplace** | `marketplace_search` — Marketplace Search | Search Skinport, Buff163, G2A in parallel | `skinport`, `buff163`, `g2a` |
| **Price Comparison** | `compare` — Price Compare | Compare prices across multiple sources | `compare`, `prices`, `deals` |
| | `fees` — Fee Calculator | Calculate total cost including protocol and platform fees | `fees`, `cost` |
| **Payment** | `fiat_pay` — Fiat Payment | Process card/bank payments via Stripe | `payment`, `fiat`, `stripe` |
| | `crypto_pay` — Crypto Payment | Process USDC/USDT payments on Celo | `payment`, `crypto`, `celo`, `usdc` |
| | `escrow` — Escrow | Deploy and manage escrow smart contracts | `escrow`, `smart-contract`, `celo` |
| **Purchase** | `buy` — Execute Purchase | Buy an item from the source marketplace | `purchase`, `buy`, `order` |
| **Order Tracking** | `track_order` — Track Order | Get order status and timeline | `tracking`, `order`, `status` |
| | `track_shipping` — Track Shipping | Track carrier shipment | `tracking`, `shipping`, `delivery` |
| **Dispute & Refund** | `dispute` — Open Dispute | Open a dispute on an order and freeze escrow | `dispute`, `refund`, `escrow` |
| **Health Monitor** | `health_check` — Health Check | Run full E2E health checks across all endpoints | `health`, `monitoring`, `e2e` |
| | `diagnose` — Diagnose Issues | Identify root cause of failures and suggest code fixes | `debug`, `fix`, `diagnose` |

---

## A2A Protocol (Agent-to-Agent)

`src/lib/a2a/` implements [Google's A2A open protocol](https://google.github.io/A2A/) (v0.2):

- **Agent Cards** — Each agent publishes a card with name, description, supported skills, and endpoint. Discovery at `GET /.well-known/agent.json`.
- **Tasks** — Lifecycle: `submitted` → `working` → `completed` / `failed` / `canceled`. Messages contain `text`, `data`, and `file` parts.
- **Client** — `registerExecutor(agentId, fn)` + `sendTask(agentId, message)` for in-memory execution.
- **Server** — `handleA2ARequest` implements JSON-RPC methods: `tasks/send`, `tasks/get`, `tasks/cancel`.
- **Bootstrap** — `bootstrapA2A()` wires all `BaseAgent` subclasses as executors, enabling the custom orchestrator to fan out to specialists.

---

## Smart Contracts

Deployed on **Celo Sepolia** (chain ID `11142220`).

### MockUSDC (`contracts/MockUSDC.sol`)

- ERC-20 "USD Coin (Test)", 6 decimals
- Mints 100,000 USDC to deployer on construction
- Public `faucet()` mints 1,000 USDC to caller (testnet only)

### DroEscrowFactory (`contracts/DroEscrowFactory.sol`)

- **Singleton factory** holding all escrows (no per-escrow contract deployment)
- **Lifecycle:** `Created` → `Funded` → `Released` | `Refunded` | `Disputed`
- **Buyer** calls `fundEscrow` (pulls ERC-20 tokens via `SafeERC20`)
- **Owner** calls `releaseEscrow` (sends to treasury minus protocol fee) or `refundEscrow`
- **Buyer** can `disputeEscrow` while funded
- **Auto-refund** after deadline if still `Funded` or `Disputed`
- **Owner** resolves disputes with `resolveDispute(releaseToTreasury)`
- Configurable `protocolFeeBps` and `treasury` address

### Deployed Addresses

| Contract | Address | Explorer |
|----------|---------|----------|
| **DroEscrowFactory** | `0xe175B28A80Cc36daE108B69172d44Feb5Ab57327` | [Celoscan](https://sepolia.celoscan.io/address/0xe175B28A80Cc36daE108B69172d44Feb5Ab57327) |
| **MockUSDC** | `0xc5aDD550534048Ec1f5F65252653D1c744bB4Ac2` | [Celoscan](https://sepolia.celoscan.io/address/0xc5aDD550534048Ec1f5F65252653D1c744bB4Ac2) |
| **USDT** | `0xC458e1a4eB04cD4E1Fb56B1990cB5E9d35028bb2` | [Celoscan](https://sepolia.celoscan.io/address/0xC458e1a4eB04cD4E1Fb56B1990cB5E9d35028bb2) |
| **Treasury** | `0x87d7eD4285FE9512d2dC9e0B4B993D377eB0d155` | — |

### Escrow Flow — Fiat vs Crypto

The **Payment Agent** always creates an escrow after payment, regardless of method. The 3-step sequence is:

```
calculate_fees  →  process payment  →  create_escrow
```

**Fiat (card/bank):**

```
User clicks "Pay"
  │
  ▼
Payment Agent: calculate_fees
  │  platform 1% + escrow 1% + card fee
  ▼
Payment Agent: process_fiat_payment
  │  Simulates Stripe charge → transactionId
  ▼
Payment Agent: create_escrow
  │  Returns escrow intent (factory, buyer, amount, 14-day deadline)
  ▼
Server (POST /api/escrow)
  │  Deployer wallet signs & sends createEscrow() on-chain
  │  (onlyOwner — must be server-side)
  ▼
Escrow created on Celo Sepolia
  │  Status: Created → auto-refund after 14 days if unfulfilled
  ▼
Purchase Agent: execute_purchase
```

**Crypto (USDC/USDT):**

```
User clicks "Pay with Crypto"
  │
  ▼
Payment Agent: calculate_fees
  │  platform 1% + escrow 1% + crypto fee
  ▼
Payment Agent: process_crypto_payment
  │  Returns payment intent (status: awaiting_signature)
  │  Token address + spender = EscrowFactory
  ▼
Payment Agent: create_escrow
  │  Returns escrow intent + 2 client-side tx steps
  ▼
User signs in MetaMask:
  │  Step 1: approve() — allow factory to spend USDC/USDT
  │  Step 2: fundEscrow() — lock tokens in the factory
  ▼
Escrow funded on Celo Sepolia
  │  Status: Funded → auto-refund after 14 days if unfulfilled
  ▼
Purchase Agent: execute_purchase
```

**Key differences:**

| | Fiat | Crypto |
|---|---|---|
| Payment execution | Server-side (mock Stripe) | Client-side (MetaMask) |
| Escrow creation | Server signs via deployer key | Server creates, buyer funds via 2 MetaMask txs |
| User signatures needed | 0 | 2 (approve + fundEscrow) |
| On-chain token flow | Platform holds funds off-chain | Tokens locked in smart contract |
| Release | Owner calls `releaseEscrow` → treasury | Owner calls `releaseEscrow` → treasury minus fee |
| Refund | Owner calls `refundEscrow` | Owner calls `refundEscrow` or `autoRefund` after deadline |

### Escrow State Machine

```
                          createEscrow (owner)
                               │
                               ▼
                           ┌────────┐
                           │Created │
                           └───┬────┘
                               │ fundEscrow (buyer)
                               ▼
                           ┌────────┐
               ┌───────────│ Funded │───────────┐
               │           └───┬────┘           │
               │               │                │
  releaseEscrow │    markDelivered    disputeEscrow
    (owner)     │      (owner)          (buyer)
               │               │                │
               ▼               ▼                ▼
          ┌──────────┐   ┌───────────┐   ┌──────────┐
          │ Released │   │ Delivered │   │ Disputed │
          └──────────┘   └─────┬─────┘   └────┬─────┘
            payout →          │  │             │
            treasury          │  │    ┌────────┼────────┐
            fee → owner       │  │    │        │        │
                               │  │    │ resolveDispute  │
                               │  │    │   (owner)       │
                               │  │    ▼                 ▼
                               │  │  true→Released false→Refunded
                               │  │
               ┌───────────────┘  └──────────────┐
               │                                  │
     disputeEscrow (buyer)              autoRelease (anyone)
     (during grace period)              (after 3-day grace)
               │                                  │
               ▼                                  ▼
          ┌──────────┐                       ┌──────────┐
          │ Disputed │                       │ Released │
          └──────────┘                       └──────────┘
                                               seller gets
                                               paid safely
               │
               │  autoRefund (anyone, after deadline)
               │  works from Funded, Delivered, OR Disputed
               ▼
           ┌──────────┐
           │ Refunded │
           └──────────┘
             full amount
             → buyer
```

**Seller Safety Net:** The `Delivered` status + `autoRelease` mechanism protects sellers from buyers who refuse to confirm delivery. Once the platform marks delivery (with proof), a 3-day grace period starts. If the buyer doesn't dispute, **anyone** (including the seller or a bot) can call `autoRelease` and the funds transfer automatically.

**After Funded — four possible outcomes:**

| Action | Who Calls | Trigger | Token Flow | Final Status |
|--------|-----------|---------|------------|--------------|
| `releaseEscrow` | Owner (platform) | Delivery confirmed | Payout → treasury, 1% fee → owner | `Released` |
| `markDelivered` | Owner (platform) | Proof of delivery submitted | Funds stay locked, 3-day grace starts | `Delivered` |
| `disputeEscrow` | Buyer | Problem reported | Funds frozen in contract | `Disputed` |
| `autoRefund` | Anyone | Deadline passes (14 days) | Full amount → buyer | `Refunded` |

**After Delivered — three possible outcomes:**

| Action | Who Calls | Trigger | Token Flow | Final Status |
|--------|-----------|---------|------------|--------------|
| `autoRelease` | Anyone | 3-day grace period passes without dispute | Payout → treasury, 1% fee → owner | `Released` |
| `disputeEscrow` | Buyer | Problem found during grace period | Funds frozen for arbiter review | `Disputed` |
| `releaseEscrow` | Owner (platform) | Arbiter fast-tracks release | Payout → treasury, 1% fee → owner | `Released` |

**After Disputed — two possible outcomes:**

| Action | Who Calls | Decision | Token Flow | Final Status |
|--------|-----------|----------|------------|--------------|
| `resolveDispute(true)` | Owner (platform) | Seller wins | Payout → treasury, 1% fee → owner | `Released` |
| `resolveDispute(false)` | Owner (platform) | Buyer wins | Full amount → buyer | `Refunded` |
| `autoRefund` | Anyone | Deadline passes | Full amount → buyer | `Refunded` |

**Terminal states:** Both `Released` and `Refunded` are final — no further transitions possible.

### Browser Integration (`src/lib/contracts/`)

- `addresses.ts` — Contract addresses, RPC endpoint, chain config
- `escrow.ts` — Browser helpers: `ensureChain`, `approveToken`, `createEscrow`, `fundEscrow`, `releaseEscrow`, `refundEscrow`, `disputeEscrow`, `getEscrowStatus`
- `abi-encoder.ts` — Manual ABI encoding for MetaMask `eth_sendTransaction` (avoids bundling ethers in browser)

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/chat` | POST | Conversational chat via ADK `dro_orchestrator` |
| `/api/search` | POST | Product search with region hints, returns structured products + AI summary |
| `/api/purchase` | POST | Purchase flow: payment → escrow → order creation |
| `/api/track` | POST | Order tracking and shipping status |
| `/api/dispute` | POST | Open disputes for problematic orders |
| `/api/escrow` | POST | Server-side escrow creation (signs with deployer key) |
| `/api/faucet` | POST | Mint 1,000 test USDC to an address |
| `/api/agents` | GET | Lists all registered agents and their tools |
| `/api/a2a` | GET/POST | A2A protocol discovery and task execution |
| `/api/health` | GET | Full E2E health check across all endpoints and pages |
| `/api/img` | GET | Image proxy for external URLs |
| `/api/oak/campaigns` | GET | Fetches Oak Network campaigns |
| `/api/oak/campaigns/[id]` | GET | Campaign detail + rewards |
| `/api/oak/pledge` | POST | SSE stream for automated Oak pledge via Playwright |
| `/.well-known/agent.json` | GET | A2A agent card discovery |

---

## Frontend Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with 3D scene, animated hero, search bar → `/results` |
| `/results` | Search results grid, Oak campaigns panel, agent chat |
| `/checkout` | Checkout flow with fiat/crypto payment options, wallet integration |
| `/dashboard` | User dashboard with order stats, recent activity, wallet overview |
| `/tracking` | Order and escrow tracking with timeline visualization |
| `/history` | Local purchase and pledge history (localStorage) |
| `/health` | Visual health dashboard consuming `/api/health` |

---

## AI Integration

### Gemini (Direct)

`src/lib/ai/gemini.ts` provides direct Gemini API access using `gemini-2.5-flash`:
- `geminiChat(messages, systemPrompt)` — Multi-turn conversation
- `geminiPrompt(prompt, systemPrompt)` — Single-shot prompt
- `geminiJSON(prompt, systemPrompt)` — Structured JSON output with auto-parsing

Used by the custom `OrchestratorAgent` for intent classification, query refinement, and conversation.

### ADK Agents

ADK agents use `gemini-2.5-flash-lite` via the `@google/adk` package for tool-use planning and sub-agent delegation.

---

## Wallet Integration

`src/lib/wallet/context.tsx` provides a React context (`WalletProvider` / `useWallet()`) for:

- **MetaMask** connection with chain switching to Celo Sepolia
- **Manual address entry** for read-only balance viewing
- **Balance tracking** for native CELO + USDC + USDT (ERC-20 `balanceOf` calls)
- **Persistent state** via `localStorage` (`dro_wallet`)
- Placeholders for **WalletConnect** and **Coinbase Wallet**

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
# Install dependencies
npm install

# Install contract dependencies (optional, for deployment)
cd contracts && npm install && cd ..

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy Contracts (Celo Sepolia)

See [`contracts/DEPLOY.md`](contracts/DEPLOY.md) for detailed deployment instructions.

---

## Environment Variables

Create a `.env.local` file:

```env
# Gemini AI (required)
GOOGLE_GENAI_API_KEY=your_gemini_api_key
GEMINI_API_KEY=your_gemini_api_key

# Serper (required for web search)
SERPER_API_KEY=your_serper_api_key

# Contract deployment (optional, for server-side escrow)
DEPLOYER_PRIVATE_KEY=your_deployer_private_key

# Oak pledge automation (optional)
MM_PASSWORD=your_metamask_password

# App URL (for health checks)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## Project Structure

```
dro/
├── contracts/                  # Solidity smart contracts
│   ├── DroEscrowFactory.sol    # Escrow factory contract
│   ├── MockUSDC.sol            # Test USDC token
│   ├── deploy-direct.js        # Deployment scripts
│   └── DEPLOY.md               # Deployment guide
├── scripts/
│   └── oak-pledge.js           # Oak Network pledge automation (Playwright)
├── src/
│   ├── app/
│   │   ├── api/                # 15 API routes
│   │   ├── checkout/           # Checkout page
│   │   ├── dashboard/          # User dashboard
│   │   ├── health/             # Health monitor page
│   │   ├── history/            # Purchase history
│   │   ├── results/            # Search results
│   │   ├── tracking/           # Order tracking
│   │   ├── page.tsx            # Landing page
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css         # Global styles
│   ├── components/             # React components
│   │   ├── AgentChat.tsx       # Chat interface
│   │   ├── Navbar.tsx          # Navigation bar
│   │   ├── WalletModal.tsx     # Wallet connection modal
│   │   ├── Scene3D.tsx         # Three.js 3D scene
│   │   ├── ParticleField.tsx   # Particle effects
│   │   ├── GlassCard.tsx       # Glassmorphism card
│   │   ├── NeonButton.tsx      # Neon-styled button
│   │   └── ...                 # More UI components
│   └── lib/
│       ├── adk/                # Google ADK integration
│       │   ├── agents.ts       # LlmAgent definitions + rootAgent
│       │   ├── tools.ts        # FunctionTool wrappers (Zod schemas)
│       │   ├── runner.ts       # ADK Runner + session management
│       │   └── index.ts        # Public exports
│       ├── a2a/                # A2A protocol implementation
│       │   ├── types.ts        # AgentCard, Task, Message types
│       │   ├── client.ts       # Executor registration + sendTask
│       │   ├── server.ts       # JSON-RPC handler
│       │   ├── agent-card.ts   # Agent card generation
│       │   ├── task-store.ts   # In-memory task store
│       │   └── index.ts        # bootstrapA2A + exports
│       ├── agents/             # Custom agent classes
│       │   ├── base.ts         # BaseAgent abstract class
│       │   ├── orchestrator.ts # Intent routing + A2A fan-out
│       │   ├── web-search.ts   # Web search agent
│       │   ├── steam.ts        # Steam market agent
│       │   ├── digital-marketplace.ts
│       │   ├── price-comparison.ts
│       │   ├── payment.ts
│       │   ├── purchase.ts
│       │   ├── order-tracking.ts
│       │   ├── dispute-refund.ts
│       │   ├── health-monitor.ts
│       │   ├── types.ts        # Shared agent types
│       │   ├── registry.ts     # Agent registry
│       │   └── index.ts        # Exports + getOrchestrator()
│       ├── tools/              # 18 tool implementations
│       │   ├── web-search.ts
│       │   ├── web-scrape.ts
│       │   ├── steam-market-search.ts
│       │   ├── steam-market-listing.ts
│       │   ├── steam-price-history.ts
│       │   ├── steam-float-check.ts
│       │   ├── skinport-search.ts
│       │   ├── buff163-search.ts
│       │   ├── g2a-search.ts
│       │   ├── compare-prices.ts
│       │   ├── calculate-fees.ts
│       │   ├── process-fiat-payment.ts
│       │   ├── process-crypto-payment.ts
│       │   ├── create-escrow.ts
│       │   ├── execute-purchase.ts
│       │   ├── track-order.ts
│       │   ├── track-shipping.ts
│       │   ├── initiate-dispute.ts
│       │   ├── types.ts        # ToolDefinition + ToolResult
│       │   ├── registry.ts     # Tool registry
│       │   └── index.ts        # initializeTools()
│       ├── contracts/          # Contract ABIs + browser helpers
│       ├── ai/                 # Direct Gemini API client
│       ├── hooks/              # React hooks (useAgent)
│       ├── wallet/             # Wallet context provider
│       ├── history.ts          # Local history (localStorage)
│       └── mockData.ts         # Mock data for development
└── public/
    └── tokens/                 # Token icons (CELO, USDC, USDT)
```
