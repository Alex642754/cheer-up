# 🎉 Cheer Up

**Group collection on Solana — one link, everyone chips in, the chain keeps the books.**

Cheer Up is an on-chain group fundraising app. Create a campaign with a target amount, share the link or QR code, and let friends chip in. A backend scanner watches the receiver address on-chain, so contributions are credited automatically — even when someone pays directly to the address without opening the page.

No more chasing friends for transfers. No manual bookkeeping. The blockchain is the ledger.

---

## ✨ Features

- **Group collection campaigns** — set a title, target amount (SOL or USDC) and a receiver wallet; get a shareable link instantly
- **Pay any way you like** — connect Phantom in the browser, or send directly to the receiver address; both are counted
- **Solana Pay QR codes** — every campaign page shows two QR codes: one opens the page in any mobile browser, one is a `solana:` URI that Phantom/Solflare can scan to start a transfer directly
- **Automatic on-chain reconciliation** — a background scanner picks up new transactions to the receiver address, parses SOL / USDC transfers and updates the progress bar in real time
- **Baseline-signature bookkeeping** — each campaign stores the latest on-chain signature at creation time, so only contributions made *after* creation are counted (no double counting, `tx_hash` unique constraint as a safety net)
- **Auto-complete** — when the raised amount reaches the target, the campaign flips to *completed* on its own
- **Fair fee model** — campaigns of 10 (USDC/SOL) or less are completely free; above that a 0.1% platform fee is forwarded to the platform fee wallet in the same transaction
- **Demo mode** — flip `NEXT_PUBLIC_DEMO_MODE=true` to simulate wallet signing without an on-chain transfer (great for presentations)

## 🧠 How it works

```
                ┌────────────────────────────────────────────┐
                │              Cheer Up backend              │
  create ─────► │  store campaign + baseline signature       │
                │                                            │
  every N sec   │  1. getSignaturesForAddress(receiver)      │
  (reconciler)► │  2. skip signatures ≤ baseline / recorded  │
                │  3. getTransaction(sig) → parse amount     │
                │  4. insert contribution (tx_hash unique)   │
                │  5. recompute raised → auto-complete       │
                └────────────────────────────────────────────┘
                        ▲                          ▲
     browser payment ───┘                          └── direct transfer
     (Phantom + fee)                              (any wallet, no page needed)
```

**Key design decisions**

- **Scan by receiver address, not by expected payer.** Anyone can contribute from any wallet, with or without the link — the scanner only cares about money arriving at the campaign address.
- **Baseline signature.** Recorded at campaign creation; scanning stops once it is reached, cleanly separating "before" from "after".
- **Self-transfer friendly.** If the sender happens to be the receiver (single-wallet demos!), a balance-delta check finds nothing — so the parser also reads the raw `SystemProgram.transfer` instruction amount as a fallback.
- **RPC failover.** Configure multiple endpoints; the client rotates automatically on rate limits or connection errors.

## 🛠 Tech stack

| Layer | Tech |
|---|---|
| Backend | Go 1.25 · Gin · GORM |
| Database | MySQL 8 (Docker) |
| Frontend | Next.js 14 · TypeScript · Tailwind CSS |
| Blockchain | solana-go RPC client · @solana/web3.js · wallet-adapter (Phantom) |
| QR | qrcode.react · Solana Pay URI standard |

## 🚀 Quick start

### 1. Start MySQL

```bash
docker run -d --name exchangapp-mysql -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=root123 mysql:8.0
```

### 2. Run the backend

```bash
go run main.go
# API on http://localhost:8080
```

### 3. Run the frontend

```bash
cd web
npm install
npm run dev
# App on http://localhost:3000
```

### 4. Try it

1. Open `http://localhost:3000/merchant/new` and create a campaign
2. Open the generated link (or scan the QR on the campaign page)
3. Connect Phantom (devnet) and contribute — or just send SOL straight to the receiver address
4. Watch the progress bar update on `http://localhost:3000/merchant/campaigns`

## ⚙️ Environment variables

**Backend**

| Variable | Default | Description |
|---|---|---|
| `SOLANA_RPC_URL` | onfinality devnet | Primary RPC endpoint |
| `SOLANA_RPC_URLS` | — | Comma-separated fallback endpoints (auto failover) |
| `SYNC_INTERVAL_SECONDS` | `15` | Reconciler scan interval |
| `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_PORT` / `DB_NAME` | root / root123 / 127.0.0.1 / 3306 / solana_pay | MySQL connection |

**Frontend (`web/.env.local`)**

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend URL |
| `NEXT_PUBLIC_SOLANA_NETWORK` | `devnet` |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | RPC endpoint used by the wallet adapter |
| `NEXT_PUBLIC_FEE_RECEIVER` | Wallet that receives the 0.1% platform fee |
| `NEXT_PUBLIC_DEMO_MODE` | `true` = simulate payments without on-chain transfers |

## 🔌 API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/campaigns` | Create a campaign |
| `GET` | `/api/campaigns` | List all campaigns |
| `GET` | `/api/campaigns/:id` | Campaign detail + contributions |
| `POST` | `/api/campaigns/:id/sync` | Trigger an on-chain sync now |
| `POST` | `/api/campaigns/:id/contribute` | Demo-mode contribution (no chain) |

## 💸 Fee model

| Amount | Platform fee |
|---|---|
| ≤ 10 | Free |
| > 10 | 0.1% (rounded up to 6 decimals) |

The fee is transferred to the platform fee wallet **in the same transaction** as the user's contribution — no off-chain settlement, no surprises.

## 📁 Project structure

```
├── main.go                 # server bootstrap + reconciler wiring
├── config/                 # DB config
├── models/                 # Campaign & Contribution (GORM)
├── handlers/               # HTTP handlers
├── routes/                 # route registration
├── services/               # campaign syncer + reconciler (chain scanning)
├── solana/                 # RPC client w/ failover, transfer parsing
├── web/                    # Next.js frontend
├── presentation/           # Apple-style demo deck
└── wiki/                   # architecture docs
```

## 📌 Notes

- Built for **devnet** — all addresses and tokens are testnet only
- The demo-mode endpoint (`/contribute`) is for presentations; remove it before any real deployment
- Public devnet RPCs rate-limit aggressively; use your own endpoint (e.g. a free OnFinality/Ankr key) for a smooth experience

## 📄 License

MIT
