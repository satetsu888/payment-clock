import { useState } from "react";
import { toDatetimeLocalUTC } from "../../../lib/format";
import { Dialog } from "../../ui/Dialog";

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
    <Dialog onClose={onClose} size="md">
      <Dialog.Header title="Cancel Subscription" />
      <Dialog.Content compact>
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
              className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </Dialog.Content>
      <Dialog.Footer>
        <Dialog.CancelButton size="compact" onClick={onClose}>Back</Dialog.CancelButton>
        <Dialog.ActionButton
          size="compact"
          variant="danger"
          onClick={handleSubmit}
          loading={loading}
          loadingText="Canceling..."
        >
          Cancel Subscription
        </Dialog.ActionButton>
      </Dialog.Footer>
    </Dialog>
  );
}
