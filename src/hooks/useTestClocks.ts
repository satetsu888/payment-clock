import { useCallback, useEffect, useState } from "react";
import {
  listTestClocks,
  createTestClock as apiCreateTestClock,
  advanceTestClock as apiAdvanceTestClock,
  deleteTestClock as apiDeleteTestClock,
} from "../lib/api";
import type { TestClock } from "../lib/types";

export function useTestClocks(accountId: string) {
  const [testClocks, setTestClocks] = useState<TestClock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listTestClocks(accountId);
      setTestClocks(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (frozenTime: number, name?: string) => {
      const clock = await apiCreateTestClock(accountId, frozenTime, name);
      await refresh();
      return clock;
    },
    [accountId, refresh],
  );

  const advance = useCallback(
    async (testClockId: string, frozenTime: number) => {
      const clock = await apiAdvanceTestClock(accountId, testClockId, frozenTime);
      await refresh();
      return clock;
    },
    [accountId, refresh],
  );

  const remove = useCallback(
    async (testClockId: string) => {
      await apiDeleteTestClock(accountId, testClockId);
      await refresh();
    },
    [accountId, refresh],
  );

  return { testClocks, loading, error, refresh, create, advance, remove };
}
