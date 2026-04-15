import { useState } from "react";
import { toDatetimeLocalUTC } from "../../../lib/format";

interface CancelSubscriptionDialogProps {
  subscriptionId: string;
  frozenTime: string;
  onCancelAtPeriodEnd: () => Promise<void>;
  onCancelImmediately: (invoiceNow: boolean, prorate: boolean) => Promise<void>;
  onCancelAt: (cancelAt: number) => Promise<void>;
  onClose: () => void;
}

type CancelMode = "period_end" | "immediately" | "at_date";

export function CancelSubscriptionDialog({
  frozenTime,
  onCancelAtPeriodEnd,
  onCancelImmediately,
  onCancelAt,
  onClose,
}: CancelSubscriptionDialogProps) {
  const frozenDate = new Date(frozenTime);

  const [mode, setMode] = useState<CancelMode>("period_end");
  const [invoiceNow, setInvoiceNow] = useState(false);
  const [prorate, setProrate] = useState(true);
  const [cancelAtDate, setCancelAtDate] = useState(
    toDatetimeLocalUTC(new Date(frozenDate.getTime() + 30 * 24 * 60 * 60 * 1000)),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      switch (mode) {
        case "period_end":
          await onCancelAtPeriodEnd();
          break;
        case "immediately":
          await onCancelImmediately(invoiceNow, prorate);
          break;
        case "at_date": {
          const ts = Math.floor(new Date(cancelAtDate + "Z").getTime() / 1000);
          await onCancelAt(ts);
          break;
        }
      }
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Cancel Subscription</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Mode selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name="cancelMode"
                checked={mode === "period_end"}
                onChange={() => setMode("period_end")}
              />
              <span>Cancel at period end</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name="cancelMode"
                checked={mode === "immediately"}
                onChange={() => setMode("immediately")}
              />
              <span>Cancel immediately</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name="cancelMode"
                checked={mode === "at_date"}
                onChange={() => setMode("at_date")}
              />
              <span>Cancel at specific date</span>
            </label>
          </div>

          {/* Immediately options */}
          {mode === "immediately" && (
            <div className="pl-4 space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={invoiceNow}
                  onChange={(e) => setInvoiceNow(e.target.checked)}
                />
                <span>Generate final invoice now</span>
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={prorate}
                  onChange={(e) => setProrate(e.target.checked)}
                />
                <span>Prorate unused time</span>
              </label>
            </div>
          )}

          {/* At date options */}
          {mode === "at_date" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cancel At (UTC)</label>
              <input
                type="datetime-local"
                value={cancelAtDate}
                onChange={(e) => setCancelAtDate(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
              />
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Back</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-3 py-1.5 text-xs text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Canceling..." : "Cancel Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
}
