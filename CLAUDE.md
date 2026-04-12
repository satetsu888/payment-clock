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
    TestClockDetail.tsx      # Test clock detail page (main layout)
    TimeControlBar.tsx       # Sticky time control bar with visual timeline
    CustomerTabs.tsx         # Tab-based customer management
    CustomerTabContent.tsx   # Per-customer content (payment methods, subscriptions, billing history)
    PaymentMethodList.tsx    # Payment method list with attach/detach/set default
    BillingHistory.tsx       # Per-customer invoice billing history table
    UnifiedTimeline.tsx      # Event log (operations + Stripe events)
    SubscriptionSection.tsx  # Subscription list display
    InvoiceSection.tsx       # Invoice list display
    PaymentIntentSection.tsx # Payment intent list display
    EventItem.tsx            # Single event display with expandable detail
    CreateTestClockDialog.tsx # Test clock creation dialog with optional customer/PM setup
    CreateCustomerDialog.tsx # Customer creation dialog
    CreateSubscriptionDialog.tsx # Subscription creation dialog with trial options
    ConfirmDialog.tsx        # Generic confirmation dialog
    UpdateDialog.tsx         # App update dialog (Tauri updater + relaunch)
    ErrorBanner.tsx          # Error display with retry/dismiss
    DashboardScreen.tsx      # Test clock list view with create/delete/purge
    TestClockCard.tsx        # Test clock card with status badge and menu
    AccountSelectScreen.tsx  # Account selection/creation
    AccountList.tsx          # Account list
    AccountCard.tsx          # Account card
    ApiKeyInput.tsx          # API key input (sk_test_ validation)
  hooks/                    # Custom hooks
    useAccounts.ts          # Account list + CRUD
    useTestClocks.ts        # Test clock list + create/advance/delete/purge
    useTestClockDetail.ts   # Single test clock detail + operations
    useTestClockEvents.ts   # Stripe events for a test clock
    useTestClockResources.ts # Resources (customers, subscriptions, invoices, paymentIntents) + mutations + customer grouping + chronological ordering
    useAdvancePolling.ts    # Advance completion polling (2s interval, auto-fetch on ready)
  contexts/                 # React Context
    AccountContext.tsx       # Selected account state (AccountProvider, useAccountContext)
  lib/
    api.ts                  # Tauri command invocations (22 commands)
    types.ts                # TypeScript type definitions
    format.ts               # Currency/price formatting utilities
    resource-grouping.ts    # Group resources by customer + extract customer IDs from events/operations
    stripe-compat.ts        # Stripe API version compatibility helpers (subscription period field location)
    timeline-data.ts        # Timeline lane/marker/period computation for TimeControlBar
    payment-methods.ts      # Test payment method constants (Visa, Mastercard, Amex, etc.)

src-tauri/src/              # Rust backend
  commands/                 # Tauri command handlers
    account.rs              # Account CRUD (validate, list, select, delete with cascade)
    test_clock.rs           # Test clock management + advance + preview
    resource.rs             # Customer, subscription, payment method, product/price management
    event.rs                # Event fetching (incremental API polling + DB sync)
  models/                   # Data models + DB operations
    account.rs              # Account, AccountSummary + DB queries
    test_clock.rs           # TestClock + upsert/list/mark_deleted/purge
    operation.rs            # Operation (audit log) + record/list
    event.rs                # Event + record/list/get_latest_timestamp
    resource_snapshot.rs    # ResourceSnapshot + save(upsert)/list_latest
  db/
    connection.rs           # DB initialization (WAL mode, foreign keys)
    migrations.rs           # Schema definitions (7 migrations)
  stripe/                   # Stripe API client modules
    client.rs               # HTTP client wrapper (get/post/delete with auth)
    compat.rs               # API version compatibility (subscription period field migration)
    account.rs              # Fetch account info
    test_clock.rs           # Test clock CRUD + advance
    customer.rs             # Customer create/update/list
    subscription.rs         # Subscription create/list
    payment_method.rs       # Payment method attach/detach/list
    event.rs                # Event fetch + test_clock_id extraction
    invoice.rs              # Invoice list
    payment_intent.rs       # Payment intent list
    product.rs              # Product/price list
  timestamp.rs              # Unix timestamp conversion utilities (unix_to_rfc3339, unix_to_display)
  state.rs                  # AppState (Arc<Mutex<Connection>>, API key helpers)
  error.rs                  # AppError enum (Db, Stripe, Validation, Io, Json, Http)
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
- Backend state is managed through `AppState` with `Arc<Mutex<>>` for thread-safe DB access
- Stripe API keys are stored in SQLite, not in environment variables - users enter them via the UI
- Events are fetched via Stripe API polling (incremental, using latest timestamp)
- API version compatibility is handled in `stripe/compat.rs` and `lib/stripe-compat.ts` to support field changes across Stripe API versions (e.g., v2025-03-31.basil)

### Advance flow

- Advance API call returns immediately with `status: "advancing"`
- `useAdvancePolling` polls `refresh_test_clock` every 2s until `status: "ready"`
- On ready: auto-fetches events and resources
- If the user navigates away and back while advancing, polling auto-resumes
- Timeout: 120s, with error after 3 consecutive polling failures

### ResourceSnapshot

- Stores the latest state of each Stripe resource per test clock (UPSERT, one row per resource)
- Used as a cache for `preview_advance` (predicting what will happen when advancing time)
- Not used for tracking historical changes — that role belongs to Stripe Events

### Frontend data flow

- **Hooks** (`useTestClockDetail`, `useTestClockEvents`, `useTestClockResources`, `useAdvancePolling`) own data fetching, state, and mutations
- **TestClockDetail** (page component) orchestrates hooks and passes data down to child components
- Stripe resources (customers, subscriptions, invoices, paymentIntents) are test clock-level data managed by `useTestClockResources`, not by individual UI components
- **Components** (CustomerTabs, TimeControlBar, etc.) are presentation-focused and receive data via props

## Test Clock Detail Page Layout

1. **Header**: Clock name, status badge, Stripe ID, delete button
2. **TimeControlBar** (sticky): Current simulation time, visual timeline (advance points + billing event markers + per-subscription period bars), click-to-advance interaction (hover shows time cursor, click pins advance target, button executes advance), refresh
3. **CustomerTabs**: Tab-based per-customer view. [+] tab creates a new customer. Each tab contains:
   - Payment Methods (attach/detach/set default)
   - Subscriptions (create/view status)
   - Billing History (invoice table with billed date, paid date, amount, status + totals)
4. **Event Log**: UnifiedTimeline showing operations and Stripe events with filters
