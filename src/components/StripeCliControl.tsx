import { useCallback, useEffect, useState } from "react";
import {
  startStripeCli,
  stopStripeCli,
  getStripeCliStatus,
} from "../lib/api";

interface StripeCliControlProps {
  accountId: string;
}

export function StripeCliControl({ accountId }: StripeCliControlProps) {
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const status = await getStripeCliStatus();
      setRunning(status);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleToggle = async () => {
    setLoading(true);
    setError(null);
    try {
      if (running) {
        await stopStripeCli();
        setRunning(false);
      } else {
        await startStripeCli(accountId);
        setRunning(true);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${running ? "bg-green-500" : "bg-gray-300"}`}
        />
        <span className="text-xs text-gray-500">
          CLI {running ? "listening" : "stopped"}
        </span>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`px-2 py-1 text-xs rounded ${
          running
            ? "text-red-600 border border-red-300 hover:bg-red-50"
            : "text-green-600 border border-green-300 hover:bg-green-50"
        } disabled:opacity-50`}
      >
        {loading ? "..." : running ? "Stop" : "Start CLI"}
      </button>
      {error && (
        <span className="text-xs text-red-500 max-w-48 truncate" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}
