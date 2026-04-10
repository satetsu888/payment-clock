import { useEffect, useState } from "react";
import { previewAdvance } from "../lib/api";
import type { TestClock, AdvancePreview } from "../lib/types";

interface AdvanceTimeDialogProps {
  accountId: string;
  clock: TestClock;
  onSubmit: (testClockId: string, frozenTime: number) => Promise<void>;
  onClose: () => void;
}

export function AdvanceTimeDialog({
  accountId,
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
  const [preview, setPreview] = useState<AdvancePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const currentFrozenTime = new Date(clock.frozenTime);
  const minDateTime = currentFrozenTime.toISOString().slice(0, 16);

  // Load preview when dateTime changes
  useEffect(() => {
    const newTime = Math.floor(new Date(dateTime).getTime() / 1000);
    const currentTime = Math.floor(new Date(clock.frozenTime).getTime() / 1000);
    if (newTime <= currentTime) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    setPreviewLoading(true);
    previewAdvance(accountId, clock.id, newTime)
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .catch((e) => {
        if (!cancelled) {
          setPreview(null);
          console.error("Preview error:", e);
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dateTime, accountId, clock.id, clock.frozenTime]);

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

  const totalAffected =
    (preview?.affectedSubscriptions.length || 0) +
    (preview?.affectedInvoices.length || 0);

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

          {previewLoading && (
            <p className="text-xs text-gray-500">Loading preview...</p>
          )}

          {preview && totalAffected > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
              <p className="font-medium text-blue-800 mb-2">
                Impact preview:
              </p>
              {preview.affectedSubscriptions.length > 0 && (
                <div className="mb-1">
                  <p className="text-xs font-medium text-blue-700">
                    Subscriptions
                  </p>
                  {preview.affectedSubscriptions.map((s) => (
                    <p key={s.stripeId} className="text-xs text-blue-600 ml-2">
                      <span className="font-mono">{s.stripeId}</span>{" "}
                      &mdash; {s.description}
                    </p>
                  ))}
                </div>
              )}
              {preview.affectedInvoices.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-blue-700">
                    Invoices
                  </p>
                  {preview.affectedInvoices.map((i) => (
                    <p key={i.stripeId} className="text-xs text-blue-600 ml-2">
                      <span className="font-mono">{i.stripeId}</span>{" "}
                      &mdash; {i.description}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {preview && totalAffected === 0 && !previewLoading && (
            <p className="text-xs text-gray-400">
              No tracked resources found. Open the detail page and load resources first.
            </p>
          )}

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
