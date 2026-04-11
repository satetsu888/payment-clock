import { useCallback, useEffect, useState } from "react";
import { fetchEvents as apiFetchEvents, getTestClockEvents } from "../lib/api";
import type { StripeEvent } from "../lib/types";

export function useTestClockEvents(accountId: string, testClockId: string) {
  const [events, setEvents] = useState<StripeEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const evts = await getTestClockEvents(testClockId);
      setEvents(evts);
    } catch (e) {
      const msg = String(e);
      if (!msg.includes("no rows returned")) {
        setError(msg);
      }
    }
  }, [testClockId]);

  useEffect(() => {
    load();
  }, [load]);

  const fetchFromStripe = useCallback(async () => {
    await apiFetchEvents(accountId, testClockId);
    await load();
  }, [accountId, testClockId, load]);

  const clearError = useCallback(() => setError(null), []);

  return { events, error, reload: load, fetchFromStripe, clearError };
}
