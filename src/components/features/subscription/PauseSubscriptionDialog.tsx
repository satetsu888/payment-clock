import { useState } from "react";
import { toDatetimeLocalUTC } from "../../../lib/format";
import { Dialog } from "../../ui/Dialog";

interface PauseSubscriptionDialogProps {
  subscriptionId: string;
  frozenTime: string;
  onSubmit: (behavior: string, resumesAt?: number) => Promise<void>;
  onClose: () => void;
}

export function PauseSubscriptionDialog({
  frozenTime,
  onSubmit,
  onClose,
}: PauseSubscriptionDialogProps) {
  const frozenDate = new Date(frozenTime);

  const [behavior, setBehavior] = useState("void");
  const [hasResumesAt, setHasResumesAt] = useState(false);
  const [resumesAtDate, setResumesAtDate] = useState(
    toDatetimeLocalUTC(new Date(frozenDate.getTime() + 30 * 24 * 60 * 60 * 1000)),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const resumesAt = hasResumesAt
        ? Math.floor(new Date(resumesAtDate + "Z").getTime() / 1000)
        : undefined;
      await onSubmit(behavior, resumesAt);
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  };

  return (
    <Dialog onClose={onClose} size="md">
      <Dialog.Header title="Pause Collection" />
      <Dialog.Content compact>
        {/* Behavior */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Behavior</label>
          <select
            value={behavior}
            onChange={(e) => setBehavior(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="void">Void invoices</option>
            <option value="keep_as_draft">Keep as draft</option>
            <option value="mark_uncollectible">Mark uncollectible</option>
          </select>
        </div>

        {/* Resumes at */}
        <div>
          <label className="flex items-center gap-2 text-xs mb-1">
            <input
              type="checkbox"
              checked={hasResumesAt}
              onChange={(e) => setHasResumesAt(e.target.checked)}
            />
            <span className="font-medium text-gray-600">Auto-resume at specific date</span>
          </label>
          {hasResumesAt && (
            <input
              type="datetime-local"
              value={resumesAtDate}
              onChange={(e) => setResumesAtDate(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 mt-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          )}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </Dialog.Content>
      <Dialog.Footer>
        <Dialog.CancelButton size="compact" onClick={onClose} />
        <Dialog.ActionButton
          size="compact"
          onClick={handleSubmit}
          loading={loading}
          loadingText="Pausing..."
        >
          Pause
        </Dialog.ActionButton>
      </Dialog.Footer>
    </Dialog>
  );
}
