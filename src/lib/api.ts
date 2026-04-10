import { invoke } from "@tauri-apps/api/core";
import type { Account, AccountSummary, TestClock, TestClockDetail } from "./types";

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
