import { useCallback, useEffect, useState } from "react";
import {
  listAccounts,
  validateAndSaveAccount,
  deleteAccount as apiDeleteAccount,
} from "../lib/api";
import type { AccountSummary } from "../lib/types";

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAccounts();
      setAccounts(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addAccount = useCallback(
    async (apiKey: string) => {
      const account = await validateAndSaveAccount(apiKey);
      await refresh();
      return account;
    },
    [refresh],
  );

  const removeAccount = useCallback(
    async (accountId: string) => {
      await apiDeleteAccount(accountId);
      await refresh();
    },
    [refresh],
  );

  return { accounts, loading, error, refresh, addAccount, removeAccount };
}
