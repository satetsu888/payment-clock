# Payment Clock

Stripe Test Clock を管理するための Tauri デスクトップアプリケーション。

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: Rust (Tauri 2) + SQLite (rusqlite) + Reqwest (Stripe API client)
- **Database**: SQLite (accounts, test_clocks, operations, events, resource_snapshots)

## Project Structure

```
src/                        # React frontend
  components/               # UI components
  hooks/                    # Custom hooks (useAccounts, useTestClocks)
  contexts/                 # React Context (AccountContext)
  lib/
    api.ts                  # Tauri command invocations
    types.ts                # TypeScript type definitions
    stripe-compat.ts        # Stripe API version compatibility helpers

src-tauri/src/              # Rust backend
  commands/                 # Tauri command handlers
    account.rs              # Account CRUD
    test_clock.rs           # Test clock management + advance + preview
    resource.rs             # Customer, subscription, payment method creation
    event.rs                # Event fetching + Stripe CLI control
  models/                   # Data models (account, test_clock, operation, event, resource_snapshot)
  db/
    connection.rs           # DB initialization
    migrations.rs           # Schema definitions
  stripe/                   # Stripe API client modules
    client.rs               # HTTP client wrapper
    cli.rs                  # Stripe CLI process management
    compat.rs               # API version compatibility layer
    account.rs, test_clock.rs, customer.rs, subscription.rs, event.rs, invoice.rs, payment_intent.rs, product.rs
  state.rs                  # AppState (DB + CLI process handle)
  error.rs                  # AppError enum
```

## Commands

```bash
# Install dependencies
npm install

# Frontend dev server (port 1520)
npm run dev

# Tauri dev (frontend + native app with hot reload)
npm run tauri dev

# Type check + build frontend
npm run build

# Package native app
npm run tauri build
```

## Architecture Notes

- Frontend communicates with backend via Tauri commands defined in `src/lib/api.ts`
- Backend state is managed through `AppState` with `Arc<Mutex<>>` for thread-safe DB and CLI process access
- Stripe API keys are stored in SQLite, not in environment variables - users enter them via the UI
- Stripe CLI (`stripe listen`) is spawned as a child process for real-time event streaming
- API version compatibility is handled in `stripe/compat.rs` and `lib/stripe-compat.ts` to support field changes across Stripe API versions (e.g., v2025-03-31.basil)
