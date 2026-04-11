import { useCallback, useEffect, useState } from "react";
import { getTestClockDetail, refreshTestClock as apiRefreshTestClock } from "../lib/api";
import type { TestClock, TestClockDetail } from "../lib/types";

export function useTestClockDetail(accountId: string, testClockId: string) {
  const [detail, setDetail] = useState<TestClockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTestClockDetail(testClockId);
      setDetail(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [testClockId]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshFromStripe = useCallback(async (): Promise<TestClock> => {
    const clock = await apiRefreshTestClock(accountId, testClockId);
    await load();
    return clock;
  }, [accountId, testClockId, load]);

  const clearError = useCallback(() => setError(null), []);

  return { detail, loading, error, reload: load, refreshFromStripe, clearError };
}
