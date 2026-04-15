import { useCallback, useEffect, useState } from "react";
import {
  listTestClocks,
  createTestClock as apiCreateTestClock,
  advanceTestClock as apiAdvanceTestClock,
  deleteTestClock as apiDeleteTestClock,
  purgeTestClock as apiPurgeTestClock,
  getResourceCounts as apiGetResourceCounts,
} from "../lib/api";
import type { TestClock, ResourceCounts } from "../lib/types";

export function useTestClocks(accountId: string) {
  const [testClocks, setTestClocks] = useState<TestClock[]>([]);
  const [resourceCounts, setResourceCounts] = useState<Record<string, ResourceCounts>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clocks, counts] = await Promise.all([
        listTestClocks(accountId),
        apiGetResourceCounts(accountId),
      ]);
      setTestClocks(clocks);
      setResourceCounts(counts);
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

  const purge = useCallback(
    async (testClockId: string) => {
      await apiPurgeTestClock(testClockId);
      await refresh();
    },
    [refresh],
  );

  return { testClocks, resourceCounts, loading, error, refresh, create, advance, remove, purge };
}
