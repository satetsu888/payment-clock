import { invoke } from "@tauri-apps/api/core";
import type { Account, AccountSummary } from "./types";

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
