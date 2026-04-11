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
    CustomerTabs.tsx         # Tab-based customer management (replaces ResourcePanel)
    BillingHistory.tsx       # Per-customer invoice billing history table
    UnifiedTimeline.tsx      # Event log (operations + Stripe events)
    SubscriptionSection.tsx  # Subscription list display
    InvoiceSection.tsx       # Invoice list display
    PaymentIntentSection.tsx # Payment intent list display
    EventItem.tsx            # Single event display with expandable detail
    AdvanceTimeDialog.tsx    # Time advance dialog with preview
    CreateCustomerDialog.tsx # Customer creation dialog
    CreateSubscriptionDialog.tsx # Subscription creation dialog
    ConfirmDialog.tsx        # Generic confirmation dialog
    ErrorBanner.tsx          # Error display with retry/dismiss
    DashboardScreen.tsx      # Test clock list view
    TestClockCard.tsx        # Test clock card in dashboard
    AccountSelectScreen.tsx  # Account selection/creation
    AccountList.tsx          # Account list
    AccountCard.tsx          # Account card
    ApiKeyInput.tsx          # API key input
    ResourcePanel.tsx        # (legacy, replaced by CustomerTabs)
    CustomerResourceCard.tsx # (legacy, replaced by CustomerTabs)
  hooks/                    # Custom hooks
    useAccounts.ts          # Account list + CRUD
    useTestClocks.ts        # Test clock list + create/advance/delete
    useTestClockDetail.ts   # Single test clock detail + operations
    useTestClockEvents.ts   # Stripe events for a test clock
    useTestClockResources.ts # Stripe resources (customers, subscriptions, invoices, paymentIntents) + mutations
  contexts/                 # React Context (AccountContext)
  lib/
    api.ts                  # Tauri command invocations
    types.ts                # TypeScript type definitions
    resource-grouping.ts    # Group resources by customer + extract customer IDs
    stripe-compat.ts        # Stripe API version compatibility helpers

src-tauri/src/              # Rust backend
  commands/                 # Tauri command handlers
    account.rs              # Account CRUD
    test_clock.rs           # Test clock management + advance + preview
    resource.rs             # Customer, subscription, payment method management
    event.rs                # Event fetching (API polling)
  models/                   # Data models (account, test_clock, operation, event, resource_snapshot)
  db/
    connection.rs           # DB initialization
    migrations.rs           # Schema definitions
  stripe/                   # Stripe API client modules
    client.rs               # HTTP client wrapper
    compat.rs               # API version compatibility layer
    account.rs, test_clock.rs, customer.rs, subscription.rs, payment_method.rs, event.rs, invoice.rs, payment_intent.rs, product.rs
  state.rs                  # AppState (DB handle)
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
- Backend state is managed through `AppState` with `Arc<Mutex<>>` for thread-safe DB access
- Stripe API keys are stored in SQLite, not in environment variables - users enter them via the UI
- Events are fetched via Stripe API polling (incremental, using latest timestamp)
- API version compatibility is handled in `stripe/compat.rs` and `lib/stripe-compat.ts` to support field changes across Stripe API versions (e.g., v2025-03-31.basil)

### Frontend data flow

- **Hooks** (`useTestClockDetail`, `useTestClockEvents`, `useTestClockResources`) own data fetching, state, and mutations
- **TestClockDetail** (page component) orchestrates hooks and passes data down to child components
- Stripe resources (customers, subscriptions, invoices, paymentIntents) are test clock-level data managed by `useTestClockResources`, not by individual UI components
- **Components** (CustomerTabs, TimeControlBar, etc.) are presentation-focused and receive data via props

## Test Clock Detail Page Layout

1. **Header**: Clock name, status badge, Stripe ID, delete button
2. **TimeControlBar** (sticky): Current simulation time, visual timeline (advance points + billing event markers), "Advance Time" button, refresh
3. **CustomerTabs**: Tab-based per-customer view. [+] tab creates a new customer. Each tab contains:
   - Payment Methods (attach/detach/set default)
   - Subscriptions (create/view status)
   - Billing History (invoice table with billed date, paid date, amount, status + totals)
4. **Event Log**: UnifiedTimeline showing operations and Stripe events with filters
