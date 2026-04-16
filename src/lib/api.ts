import { invoke } from "@tauri-apps/api/core";
import type {
  Account,
  AccountSummary,
  TestClock,
  TestClockDetail,
  TestClockResources,
  ResourceCounts,
  StripeProduct,
  StripePrice,
  StripeEvent,
  AdvancePreview,
  PaymentMethodData,
  CreateSubscriptionOptions,
} from "./types";

export async function validateAndSaveAccount(
  apiKey: string,
): Promise<Account> {
  return invoke<Account>("validate_and_save_account", { apiKey });
}

export async function listAccounts(): Promise<AccountSummary[]> {
  return invoke<AccountSummary[]>("list_accounts");
}

export async function selectAccount(accountId: string): Promise<Account> {
  return invoke<Account>("select_account", { accountId });
}

export async function deleteAccount(accountId: string): Promise<void> {
  return invoke<void>("delete_account", { accountId });
}

export async function listTestClocks(accountId: string): Promise<TestClock[]> {
  return invoke<TestClock[]>("list_test_clocks", { accountId });
}

export async function createTestClock(
  accountId: string,
  frozenTime: number,
  name?: string,
): Promise<TestClock> {
  return invoke<TestClock>("create_test_clock", { accountId, frozenTime, name });
}

export async function advanceTestClock(
  accountId: string,
  testClockId: string,
  frozenTime: number,
): Promise<TestClock> {
  return invoke<TestClock>("advance_test_clock", {
    accountId,
    testClockId,
    frozenTime,
  });
}

export async function deleteTestClock(
  accountId: string,
  testClockId: string,
): Promise<void> {
  return invoke<void>("delete_test_clock", { accountId, testClockId });
}

export async function purgeTestClock(
  testClockId: string,
): Promise<void> {
  return invoke<void>("purge_test_clock", { testClockId });
}

export async function getTestClockDetail(
  testClockId: string,
): Promise<TestClockDetail> {
  return invoke<TestClockDetail>("get_test_clock_detail", { testClockId });
}

export async function refreshTestClock(
  accountId: string,
  testClockId: string,
): Promise<TestClock> {
  return invoke<TestClock>("refresh_test_clock", { accountId, testClockId });
}

export async function attachPaymentMethod(
  accountId: string,
  testClockId: string,
  customerId: string,
  paymentMethodId: string,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("attach_payment_method", {
    accountId,
    testClockId,
    customerId,
    paymentMethodId,
  });
}

export async function setDefaultPaymentMethod(
  accountId: string,
  testClockId: string,
  customerId: string,
  paymentMethodId: string,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("set_default_payment_method", {
    accountId,
    testClockId,
    customerId,
    paymentMethodId,
  });
}

export async function listPaymentMethods(
  accountId: string,
  customerId: string,
): Promise<PaymentMethodData[]> {
  return invoke<PaymentMethodData[]>("list_payment_methods", {
    accountId,
    customerId,
  });
}

export async function detachPaymentMethod(
  accountId: string,
  testClockId: string,
  customerId: string,
  paymentMethodId: string,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("detach_payment_method", {
    accountId,
    testClockId,
    customerId,
    paymentMethodId,
  });
}

export async function createCustomer(
  accountId: string,
  testClockId: string,
  name?: string,
  email?: string,
  metadata?: Record<string, string>,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("create_customer", {
    accountId,
    testClockId,
    name,
    email,
    metadata,
  });
}

export async function createSubscription(
  accountId: string,
  testClockId: string,
  customerId: string,
  priceIds: string[],
  options?: CreateSubscriptionOptions,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("create_subscription", {
    accountId,
    testClockId,
    customerId,
    priceIds,
    trialPeriodDays: options?.trialPeriodDays ?? null,
    trialEnd: options?.trialEnd ?? null,
    trialEndBehavior: options?.trialEndBehavior ?? null,
    billingCycleAnchor: options?.billingCycleAnchor ?? null,
    billingCycleAnchorConfig: options?.billingCycleAnchorConfig ?? null,
    prorationBehavior: options?.prorationBehavior ?? null,
    metadata: options?.metadata ?? null,
  });
}

export async function cancelSubscription(
  accountId: string,
  testClockId: string,
  subscriptionId: string,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("cancel_subscription", {
    accountId,
    testClockId,
    subscriptionId,
  });
}

export async function pauseSubscription(
  accountId: string,
  testClockId: string,
  subscriptionId: string,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("pause_subscription", {
    accountId,
    testClockId,
    subscriptionId,
  });
}

export async function resumeSubscription(
  accountId: string,
  testClockId: string,
  subscriptionId: string,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("resume_subscription", {
    accountId,
    testClockId,
    subscriptionId,
  });
}

export async function updateSubscriptionItems(
  accountId: string,
  testClockId: string,
  subscriptionId: string,
  items: Array<Record<string, string>>,
  prorationBehavior?: string,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("update_subscription_items", {
    accountId,
    testClockId,
    subscriptionId,
    items,
    prorationBehavior: prorationBehavior ?? null,
  });
}

export async function updateSubscriptionTrial(
  accountId: string,
  testClockId: string,
  subscriptionId: string,
  trialEnd: string,
  trialEndBehavior?: string,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("update_subscription_trial", {
    accountId,
    testClockId,
    subscriptionId,
    trialEnd,
    trialEndBehavior: trialEndBehavior ?? null,
  });
}

export async function cancelSubscriptionImmediately(
  accountId: string,
  testClockId: string,
  subscriptionId: string,
  invoiceNow: boolean,
  prorate: boolean,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("cancel_subscription_immediately", {
    accountId,
    testClockId,
    subscriptionId,
    invoiceNow,
    prorate,
  });
}

export async function updateSubscriptionCancelAt(
  accountId: string,
  testClockId: string,
  subscriptionId: string,
  cancelAt: number,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("update_subscription_cancel_at", {
    accountId,
    testClockId,
    subscriptionId,
    cancelAt,
  });
}

export async function undoCancelSubscription(
  accountId: string,
  testClockId: string,
  subscriptionId: string,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("undo_cancel_subscription", {
    accountId,
    testClockId,
    subscriptionId,
  });
}

export async function updateSubscriptionBillingAnchor(
  accountId: string,
  testClockId: string,
  subscriptionId: string,
  billingCycleAnchor: string,
  prorationBehavior?: string,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("update_subscription_billing_anchor", {
    accountId,
    testClockId,
    subscriptionId,
    billingCycleAnchor,
    prorationBehavior: prorationBehavior ?? null,
  });
}

export async function pauseSubscriptionWithOptions(
  accountId: string,
  testClockId: string,
  subscriptionId: string,
  behavior: string,
  resumesAt?: number,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("pause_subscription_with_options", {
    accountId,
    testClockId,
    subscriptionId,
    behavior,
    resumesAt: resumesAt ?? null,
  });
}

export async function applySubscriptionDiscount(
  accountId: string,
  testClockId: string,
  subscriptionId: string,
  couponId?: string,
  promotionCodeId?: string,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("apply_subscription_discount", {
    accountId,
    testClockId,
    subscriptionId,
    couponId: couponId ?? null,
    promotionCodeId: promotionCodeId ?? null,
  });
}

export async function createProduct(
  accountId: string,
  name: string,
  description?: string,
): Promise<StripeProduct> {
  return invoke<StripeProduct>("create_product", {
    accountId,
    name,
    description: description ?? null,
  });
}

export async function archiveProduct(
  accountId: string,
  productId: string,
): Promise<StripeProduct> {
  return invoke<StripeProduct>("archive_product", { accountId, productId });
}

export async function createPrice(
  accountId: string,
  productId: string,
  unitAmount: number,
  currency: string,
  recurringInterval?: string,
  recurringIntervalCount?: number,
  nickname?: string,
): Promise<StripePrice> {
  return invoke<StripePrice>("create_price", {
    accountId,
    productId,
    unitAmount,
    currency,
    recurringInterval: recurringInterval ?? null,
    recurringIntervalCount: recurringIntervalCount ?? null,
    nickname: nickname ?? null,
  });
}

export async function archivePrice(
  accountId: string,
  priceId: string,
): Promise<StripePrice> {
  return invoke<StripePrice>("archive_price", { accountId, priceId });
}

export async function listProducts(
  accountId: string,
): Promise<StripeProduct[]> {
  return invoke<StripeProduct[]>("list_products", { accountId });
}

export async function listPrices(
  accountId: string,
  productId?: string,
): Promise<StripePrice[]> {
  return invoke<StripePrice[]>("list_prices", { accountId, productId });
}

export async function getResourceCounts(
  accountId: string,
): Promise<Record<string, ResourceCounts>> {
  return invoke<Record<string, ResourceCounts>>("get_resource_counts", { accountId });
}

export async function fetchTestClockResources(
  accountId: string,
  testClockId: string,
): Promise<TestClockResources> {
  return invoke<TestClockResources>("fetch_test_clock_resources", {
    accountId,
    testClockId,
  });
}

export async function previewAdvance(
  accountId: string,
  testClockId: string,
  frozenTime: number,
): Promise<AdvancePreview> {
  return invoke<AdvancePreview>("preview_advance", { accountId, testClockId, frozenTime });
}

export async function fetchEvents(
  accountId: string,
  testClockId?: string,
): Promise<StripeEvent[]> {
  return invoke<StripeEvent[]>("fetch_events", { accountId, testClockId });
}

export async function getTestClockEvents(
  testClockId: string,
): Promise<StripeEvent[]> {
  return invoke<StripeEvent[]>("get_test_clock_events", { testClockId });
}
