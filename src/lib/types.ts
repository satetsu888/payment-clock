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

export interface ResourceCounts {
  customerCount: number;
  subscriptionCount: number;
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
  active: boolean;
}

export interface StripePrice {
  id: string;
  product: string;
  unit_amount: number | null;
  currency: string;
  recurring: {
    interval: string;
    interval_count: number;
    usage_type?: string;
    meter?: string;
  } | null;
  nickname: string | null;
}

export interface StripeMeter {
  id: string;
  display_name: string;
  event_name: string;
  status: string;
  default_aggregation: {
    formula: string;
  };
}

export interface BillingCycleAnchorConfig {
  day_of_month: number;
  month?: number;
  hour?: number;
  minute?: number;
  second?: number;
}

export interface CustomerAddress {
  country: string;
  postal_code?: string;
}

export interface SubscriptionItemInput {
  price: string;
  tax_rates: string[];
}

export interface CreateSubscriptionOptions {
  trialPeriodDays?: number;
  trialEnd?: number;
  trialEndBehavior?: "create_invoice" | "cancel" | "pause";
  billingCycleAnchor?: number;
  billingCycleAnchorConfig?: BillingCycleAnchorConfig;
  prorationBehavior?: "create_prorations" | "none";
  automaticTaxEnabled?: boolean;
  metadata?: Record<string, string>;
}

export interface StripeTaxRate {
  id: string;
  display_name: string;
  percentage: number;
  inclusive: boolean;
  active: boolean;
  country: string | null;
  state: string | null;
  jurisdiction: string | null;
  tax_type: string | null;
}

export interface SubscriptionItemUpdate {
  id?: string;
  price?: string;
  deleted?: boolean;
}

export interface SubscriptionActions {
  cancel: (subscriptionId: string) => Promise<void>;
  cancelImmediately: (subscriptionId: string, opts: { invoiceNow: boolean; prorate: boolean }) => Promise<void>;
  cancelAt: (subscriptionId: string, cancelAt: number) => Promise<void>;
  undoCancel: (subscriptionId: string) => Promise<void>;
  pause: (subscriptionId: string) => Promise<void>;
  pauseWithOptions: (subscriptionId: string, opts: { behavior: string; resumesAt?: number }) => Promise<void>;
  resume: (subscriptionId: string) => Promise<void>;
  updateItems: (subscriptionId: string, items: SubscriptionItemUpdate[], prorationBehavior: string) => Promise<void>;
  updateTrial: (subscriptionId: string, trialEnd: number | "now", endBehavior?: string) => Promise<void>;
  updateBillingAnchor: (subscriptionId: string, anchor: number | "now" | "unchanged", prorationBehavior: string) => Promise<void>;
  applyDiscount: (subscriptionId: string, couponId?: string, promotionCodeId?: string) => Promise<void>;
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
