export const content = {
  header: {
    appName: 'Payment Clock',
    github: 'GitHub',
    download: 'Download',
  },
  hero: {
    title: 'Iterate on Stripe billing, visually',
    subtitle:
      'A desktop app that turns Stripe Test Clock operations into a visual timeline. Advance time, trigger billing events, and test subscription lifecycle — all without writing code.',
    cta: 'Download',
    github: 'View on GitHub',
  },
  features: {
    title: 'Features',
    items: [
      {
        title: 'Visual Timeline',
        description:
          'See your Test Clock as an interactive timeline. Subscription billing periods appear as bars, invoice events as markers. Click anywhere to advance time to that point.',
        value: "See exactly what's happening at every point in time.",
      },
      {
        title: 'Subscription Lifecycle Simulation',
        description:
          'Pause, cancel, and resume subscriptions right from the UI. Combine multiple subscriptions with different billing cycles and watch how they interact as time moves forward.',
        value:
          'Test complex scenarios like trial-to-paid conversion, mid-cycle cancellation, and reactivation — without writing test scripts.',
      },
      {
        title: 'Event Log',
        description:
          'After each time advancement, Stripe Events are automatically fetched and displayed chronologically. See exactly which invoices were created, payments succeeded, or subscriptions changed.',
        value: 'Close the feedback loop — advance time, see what changed, decide what to try next.',
      },
    ],
  },
  howItWorks: {
    title: 'How It Works',
    steps: [
      {
        step: '1',
        title: 'Connect',
        description: 'Enter your Stripe test API key.',
      },
      {
        step: '2',
        title: 'Set Up',
        description:
          'Create a Test Clock with customers, payment methods, and subscriptions — all in one flow.',
      },
      {
        step: '3',
        title: 'Advance',
        description:
          'Click on the timeline to advance time. Watch billing events and subscription period bars appear.',
      },
      {
        step: '4',
        title: 'Iterate',
        description:
          'Try subscription actions like pause or cancel, advance again, and keep exploring different scenarios.',
      },
    ],
  },
  faq: {
    title: 'FAQ',
    items: [
      {
        question: 'Where are my API keys stored?',
        answer:
          'Locally in SQLite on your machine. The app only communicates with the Stripe API — nothing is sent anywhere else.',
      },
      {
        question: 'Which platforms are supported?',
        answer: 'macOS and Windows. Download from GitHub Releases.',
      },
      {
        question: 'Is it open source?',
        answer: 'Yes, MIT licensed.',
      },
    ],
  },
  cta: {
    title: 'Start testing your billing flows',
    download: 'Download',
    github: 'View on GitHub',
  },
  footer: {
    license: 'MIT License',
  },
} as const

export const links = {
  github: 'https://github.com/satetsu888/payment-clock',
  releases: 'https://github.com/satetsu888/payment-clock/releases',
} as const
