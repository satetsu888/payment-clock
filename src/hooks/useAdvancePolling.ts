import { useCallback, useEffect, useRef, useState } from "react";
import type { TestClock } from "../lib/types";

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 120_000;
const MAX_CONSECUTIVE_ERRORS = 3;

interface UseAdvancePollingOptions {
  refreshFromStripe: () => Promise<TestClock>;
  onReady: () => Promise<void>;
}

export function useAdvancePolling({
  refreshFromStripe,
  onReady,
}: UseAdvancePollingOptions) {
  const [isPolling, setIsPolling] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const startTimeRef = useRef(0);
  // Keep latest callbacks in refs to avoid stale closures in the interval
  const refreshRef = useRef(refreshFromStripe);
  refreshRef.current = refreshFromStripe;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const clearInterval_ = useCallback(() => {
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    clearInterval_();
    setIsPolling(false);
  }, [clearInterval_]);

  const startPolling = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current != null) {
      clearInterval(intervalRef.current);
    }

    setIsPolling(true);
    setElapsedSeconds(0);
    setError(null);
    consecutiveErrorsRef.current = 0;
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(async () => {
      // Timeout check
      const elapsed = Date.now() - startTimeRef.current;
      setElapsedSeconds(Math.floor(elapsed / 1000));

      if (elapsed >= TIMEOUT_MS) {
        stopPolling();
        setError("Advance timed out. Please refresh to check the status.");
        return;
      }

      try {
        const clock = await refreshRef.current();
        consecutiveErrorsRef.current = 0;

        if (clock.status === "ready") {
          clearInterval_();
          await onReadyRef.current();
          setIsPolling(false);
        }
      } catch {
        consecutiveErrorsRef.current += 1;
        if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
          stopPolling();
          setError("Failed to check advance status. Please refresh manually.");
        }
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling]);

  const clearError = useCallback(() => setError(null), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearInterval_();
  }, [clearInterval_]);

  return { isPolling, elapsedSeconds, error, startPolling, stopPolling, clearError };
}
