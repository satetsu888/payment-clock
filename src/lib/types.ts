export interface Account {
  id: string;
  stripeAccountId: string;
  displayName: string | null;
  stripeApiVersion: string | null;
  createdAt: string;
  lastUsedAt: string;
}

export interface AccountSummary {
  id: string;
  stripeAccountId: string;
  displayName: string | null;
  stripeApiVersion: string | null;
  lastUsedAt: string;
}

export interface TestClock {
  id: string;
  accountId: string;
  stripeTestClockId: string;
  name: string | null;
  frozenTime: string;
  status: string;
  createdAt: string;
  deletedAt: string | null;
}

export interface Operation {
  id: number;
  accountId: string;
  testClockId: string | null;
  operationType: string;
  requestParams: string | null;
  responseSummary: string | null;
  createdAt: string;
}

export interface TestClockDetail {
  testClock: TestClock;
  operations: Operation[];
}

export interface ResourceItem {
  stripeId: string;
  resourceType: string;
  data: Record<string, unknown>;
  previousStatus: string | null;
}

export interface TestClockResources {
  customers: ResourceItem[];
  subscriptions: ResourceItem[];
  invoices: ResourceItem[];
  paymentIntents: ResourceItem[];
}

export interface CustomerWithResources {
  customer: ResourceItem;
  subscriptions: ResourceItem[];
  invoices: ResourceItem[];
  paymentIntents: ResourceItem[];
}

export interface PaymentMethodCard {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export interface PaymentMethodData {
  id: string;
  type: string;
  card?: PaymentMethodCard;
}

export interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
}

export interface StripePrice {
  id: string;
  product: string;
  unit_amount: number | null;
  currency: string;
  recurring: {
    interval: string;
    interval_count: number;
  } | null;
  nickname: string | null;
}

export interface CreateSubscriptionOptions {
  trialPeriodDays?: number;
  trialEnd?: number;
  trialEndBehavior?: "create_invoice" | "cancel" | "pause";
  metadata?: Record<string, string>;
}

export interface StripeEvent {
  id: number;
  accountId: string;
  testClockId: string | null;
  stripeEventId: string;
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
  dataSnapshot: string;
  stripeCreatedAt: string;
  receivedAt: string;
  source: string;
}

export interface AdvancePreviewItem {
  stripeId: string;
  resourceType: string;
  description: string;
  triggerTime: string;
}

export interface AdvancePreview {
  affectedSubscriptions: AdvancePreviewItem[];
  affectedInvoices: AdvancePreviewItem[];
}

export interface UnifiedTimelineItem {
  type: "operation" | "event";
  timestamp: string;
  operation?: Operation;
  event?: StripeEvent;
}
