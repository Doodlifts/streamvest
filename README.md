# StreamVest

Autonomous token vesting on Flow. Lock FLOW into NFTs that automatically stream tokens to any address — no intermediaries, no manual claims, fully on-chain.

## Live on Mainnet

All contracts are deployed at [`0x5ec90e3dcf0067c4`](https://www.flowscan.io/account/0x5ec90e3dcf0067c4).

| Contract | Purpose |
|---|---|
| `StreamVest` | Core NFT contract — minting, vesting logic, on-chain SVG generation |
| `StreamVestSchedulerV2` | Companion contract — autonomous delivery via FlowTransactionScheduler |

---

## How It Works

StreamVest mints an NFT that holds locked FLOW tokens and delivers them to a destination address on a schedule you choose. Delivery is fully autonomous using Flow's native [Transaction Scheduler](https://developers.flow.com) — once created, the stream runs itself.

1. **Lock & Schedule** — Deposit FLOW with a vesting duration and delivery interval. An NFT is minted as your proof of stream.
2. **Auto-Stream** — Tokens are delivered automatically at each interval. No keeper bots, no off-chain infrastructure.
3. **Track On-Chain** — Each NFT generates a live SVG showing progress, remaining balance, and status. Every delivery is transparent and verifiable.

### Use Cases

- **Token Distributions**: Vesting schedules for employee grants, founder allocations, or community rewards
- **Escrow & Time-Locked Transfers**: Transfer tokens with automatic release conditions
- **NFT Trading**: Buy/sell vesting schedules on secondary markets with transparent, auditable terms
- **Composability**: Integrates with standard Flow NFT infrastructure (marketplaces, wallets, etc.)

---

## Architecture

```
User connects Flow Wallet
        │
        ▼
  mint_and_schedule.cdc
        │
        ├──▶ StreamVest.createStream()             — mints NFT with locked FLOW
        ├──▶ StreamVestSchedulerV2.createHandler()  — creates scheduled handler
        └──▶ FlowTransactionScheduler.schedule()    — queues first delivery
                    │
                    ▼
            Autonomous loop:
            ┌─────────────────────────────────┐
            │  Scheduler fires at interval    │
            │  → handler.executeTransaction() │
            │  → collection.triggerStream()   │
            │  → tokens sent to destination   │
            │  → reschedules next trigger     │
            └─────────────────────────────────┘
```

### Core Resources

- **StreamVest.NFT** — Holds a `@FlowToken.Vault` with locked tokens. Stores vesting parameters, generates dynamic SVG metadata, and tracks streaming state.
- **StreamVest.Collection** — Standard NFT collection with a public `triggerStream()` method that the scheduler calls to deliver tokens.
- **StreamVestSchedulerV2.ScheduledStreamHandler** — Implements `FlowTransactionScheduler.TransactionHandler`. Handles autonomous delivery with configurable priority and execution effort.

### Contract Dependencies

| Contract | Mainnet Address |
|---|---|
| FlowTransactionScheduler | `0xe467b9dd11fa00df` |
| NonFungibleToken | `0x1d7e57aa55817448` |
| FungibleToken | `0xf233dcee88fe0abe` |
| FlowToken | `0x1654653399040a61` |
| MetadataViews | `0x1d7e57aa55817448` |

---

## Frontend

The frontend is a React + Vite app using [FCL](https://github.com/onflow/fcl-js) (Flow Client Library) for wallet connection and on-chain interaction.

### Run Locally

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:3000`. Connect with [Flow Wallet](https://wallet.flow.com) to create streams and view existing ones.

### Deploy

```bash
cd frontend
npx vercel
```

---

## Project Structure

```
streamvest/
├── cadence/
│   ├── contracts/
│   │   ├── StreamVest.cdc              # Core NFT + vesting contract
│   │   ├── StreamVestSchedulerV2.cdc   # Autonomous scheduling (production)
│   │   └── StreamVestScheduler.cdc     # V1 (deprecated)
│   ├── scripts/
│   │   ├── get_all_streams.cdc         # List streams for an address
│   │   ├── get_stream_status.cdc       # Full status of a single stream
│   │   ├── get_nft_display.cdc         # On-chain SVG + metadata
│   │   └── estimate_fees.cdc           # Fee estimation
│   └── transactions/
│       ├── mint_and_schedule.cdc       # Create stream + set up auto-delivery
│       └── revoke_key.cdc             # Key management utility
├── frontend/
│   ├── src/
│   │   ├── App.jsx                     # Full app — FCL config, hooks, components
│   │   ├── App.css                     # Design system
│   │   └── main.jsx                    # Entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## Scripts & Transactions

### mint_and_schedule.cdc

Creates a new StreamVest NFT and sets up autonomous scheduled delivery in a single transaction.

**Arguments:**

| Arg | Type | Description |
|---|---|---|
| `amount` | UFix64 | FLOW tokens to lock in the stream |
| `destinationAddress` | Address | Recipient of streamed tokens |
| `durationSeconds` | UFix64 | Total vesting duration in seconds |
| `intervalSeconds` | UFix64 | Delivery frequency in seconds |
| `feeAmount` | UFix64 | FLOW to pre-fund scheduling fees |

### get_stream_status.cdc

Returns full vesting state for a stream: amounts, progress, rate, timestamps, and status.

```bash
flow scripts execute cadence/scripts/get_stream_status.cdc 0x5ec90e3dcf0067c4 0
```

### get_nft_display.cdc

Returns NFT metadata and the dynamically generated SVG as both a data URI and raw string.

### get_all_streams.cdc

Lists all StreamVest NFTs in an account's collection with summary data.

### estimate_fees.cdc

Calculates total scheduler fees for a given duration, interval, and per-execution cost.

---

## On-Chain SVG

Each StreamVest NFT generates a fully dynamic SVG on-chain using Cadence string manipulation. The SVG reflects real-time vesting state:

- **Tank visualization** with fill level proportional to remaining balance
- **Streaming droplets** when the stream is active
- **Progress bar** color-coded by status (cyan = streaming, green = completed, orange = pending)
- **Live statistics** — remaining balance, streamed amount, rate

The SVG is served via `MetadataViews.Display` as a data URI, compatible with Flow wallets and NFT marketplaces.

---

## Key Parameters

| Parameter | Value | Notes |
|---|---|---|
| Scheduling priority | Low (rawValue: 2) | 2x fee multiplier |
| Execution effort | 500 | Minimum for triggerStream |
| Fee per trigger | ~0.04 FLOW | At current network rates |
| Min interval | 60 seconds | Flow scheduler minimum |

---

## Development

### Local Emulator

```bash
# Install Flow CLI
brew install flow-cli

# Start emulator with scheduler enabled
flow emulator --scheduled-transactions --block-time 1s

# Deploy contracts
flow project deploy
```

### Contract Updates

The core `StreamVest` contract cannot be updated on mainnet due to Cadence's contract update restrictions (a known issue with types referencing `FlowTransactionScheduler` entitlements). New functionality should be added via companion contracts, following the `StreamVestSchedulerV2` pattern.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs welcome.

## License

MIT — see [LICENSE](LICENSE).
