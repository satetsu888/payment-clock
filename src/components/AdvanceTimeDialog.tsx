import { useState } from "react";
import type { TestClock } from "../lib/types";

interface AdvanceTimeDialogProps {
  clock: TestClock;
  onSubmit: (testClockId: string, frozenTime: number) => Promise<void>;
  onClose: () => void;
}

export function AdvanceTimeDialog({
  clock,
  onSubmit,
  onClose,
}: AdvanceTimeDialogProps) {
  const [dateTime, setDateTime] = useState(() => {
    const current = new Date(clock.frozenTime);
    current.setDate(current.getDate() + 1);
    return current.toISOString().slice(0, 16);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentFrozenTime = new Date(clock.frozenTime);
  const minDateTime = currentFrozenTime.toISOString().slice(0, 16);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTime = Math.floor(new Date(dateTime).getTime() / 1000);
    const currentTime = Math.floor(currentFrozenTime.getTime() / 1000);
    if (newTime <= currentTime) {
      setError("New time must be after the current frozen time");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(clock.id, newTime);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Advance Time
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Current: {currentFrozenTime.toLocaleString()}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Advance To
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              min={minDateTime}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
              required
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Advancing..." : "Advance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
