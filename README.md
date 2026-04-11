# Payment Clock

A desktop application for managing [Stripe Test Clocks](https://docs.stripe.com/billing/testing/test-clocks). Built with Tauri, React, and Rust.

Stripe Test Clocks let you simulate the passage of time to test subscription billing, invoicing, and other time-dependent Stripe features. Payment Clock provides a visual interface to create, advance, and monitor test clocks without writing code or using the Stripe Dashboard.

## Features

- **Multi-Account Support** - Manage multiple Stripe accounts and switch between them
- **Test Clock Management** - Create, list, advance, and delete test clocks
- **Advance Preview** - See which subscriptions and invoices will be affected before advancing time
- **Resource Creation** - Create customers, manage multiple payment methods (attach, detach, set default), and set up subscriptions within test clocks
- **Event Timeline** - View Stripe events in a unified timeline alongside your operations
- **Resource Snapshots** - Inspect the state of customers, subscriptions, invoices, and payment intents at any point

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

## Roadmap

### Implemented
- Multi-account support
- Test clock CRUD (create, list, delete)
- Time advance with preview
- Customer creation
- Payment method management (attach, detach, set default)
- Subscription creation
- Event timeline
- Resource snapshots (customers, subscriptions, invoices, payment intents)

### Planned
- Usage-based billing support (usage records, meters)
- Coupon / Promotion Code support
- Subscription modification (plan change, cancel, resume)
- Invoice operations (pay, void, manual creation)

## License

MIT
