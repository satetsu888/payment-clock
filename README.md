# Payment Clock

A desktop application for managing [Stripe Test Clocks](https://docs.stripe.com/billing/testing/test-clocks). Built with Tauri, React, and Rust.

Stripe Test Clocks let you simulate the passage of time to test subscription billing, invoicing, and other time-dependent Stripe features. Payment Clock provides a visual interface to create, advance, and monitor test clocks without writing code or using the Stripe Dashboard.

## Features

- **Visual Timeline** - See test clocks as interactive timelines with subscription period bars, invoice markers, and click-to-advance interaction
- **Complex Subscription Setup** - Trials, billing cycle anchors, metered usage, multiple line items, various billing intervals — set up complex scenarios from a single dialog
- **Subscription Lifecycle** - Pause, cancel, and resume subscriptions directly from the UI
- **Payment Method Management** - Attach, detach, and set default payment methods with test card selection
- **Stripe Event Log** - Events are automatically fetched after each advance and displayed chronologically with expandable details
- **Billing History** - Per-customer invoice table with bidirectional highlight linked to the timeline
- **Multi-Account Support** - Manage multiple Stripe accounts and switch between them
- **Product & Price Management** - Create and manage products with recurring/metered pricing
- **Bulk Operations** - Bulk purge deleted test clocks

## Prerequisites

- [Node.js](https://nodejs.org/)
- [Rust](https://www.rust-lang.org/tools/install)
## Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

On first launch, you'll be prompted to enter a Stripe API key (secret key starting with `sk_test_`). The key is stored locally in an SQLite database.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | [Tauri 2](https://v2.tauri.app/) |
| Frontend | React 19, TypeScript, Tailwind CSS v4 |
| Backend | Rust |
| Database | SQLite (via rusqlite) |
| Stripe communication | reqwest (HTTP) |

## License

MIT
