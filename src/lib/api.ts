import { invoke } from "@tauri-apps/api/core";
import type {
  Account,
  AccountSummary,
  TestClock,
  TestClockDetail,
  TestClockResources,
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
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("create_customer", {
    accountId,
    testClockId,
    name,
    email,
  });
}

export async function createSubscription(
  accountId: string,
  testClockId: string,
  customerId: string,
  priceId: string,
  options?: CreateSubscriptionOptions,
): Promise<Record<string, unknown>> {
  return invoke<Record<string, unknown>>("create_subscription", {
    accountId,
    testClockId,
    customerId,
    priceId,
    trialPeriodDays: options?.trialPeriodDays ?? null,
    trialEnd: options?.trialEnd ?? null,
    trialEndBehavior: options?.trialEndBehavior ?? null,
  });
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
