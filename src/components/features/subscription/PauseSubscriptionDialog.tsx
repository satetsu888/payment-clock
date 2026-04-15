import { useState } from "react";
import { toDatetimeLocalUTC } from "../../../lib/format";

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Pause Collection</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Behavior */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Behavior</label>
            <select
              value={behavior}
              onChange={(e) => setBehavior(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
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
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 mt-1"
              />
            )}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-3 py-1.5 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Pausing..." : "Pause"}
          </button>
        </div>
      </div>
    </div>
  );
}
