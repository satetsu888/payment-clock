import { useState } from "react";
import { formatDateTime, toDatetimeLocalUTC } from "../../../lib/format";

interface UpdateSubscriptionTrialDialogProps {
  subscriptionId: string;
  subscriptionData: Record<string, unknown>;
  frozenTime: string;
  onSubmit: (trialEnd: number | "now", endBehavior?: string) => Promise<void>;
  onClose: () => void;
}

type TrialAction = "set" | "end_now";
type TrialEndBehavior = "create_invoice" | "cancel" | "pause";

export function UpdateSubscriptionTrialDialog({
  subscriptionData,
  frozenTime,
  onSubmit,
  onClose,
}: UpdateSubscriptionTrialDialogProps) {
  const currentTrialEnd = subscriptionData.trial_end as number | null | undefined;
  const frozenDate = new Date(frozenTime);

  const [action, setAction] = useState<TrialAction>(currentTrialEnd ? "set" : "set");
  const [trialEndDate, setTrialEndDate] = useState(
    currentTrialEnd
      ? toDatetimeLocalUTC(new Date(currentTrialEnd * 1000))
      : toDatetimeLocalUTC(new Date(frozenDate.getTime() + 30 * 24 * 60 * 60 * 1000)),
  );
  const [endBehavior, setEndBehavior] = useState<TrialEndBehavior>("create_invoice");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (action === "end_now") {
        await onSubmit("now");
      } else {
        const ts = Math.floor(new Date(trialEndDate + "Z").getTime() / 1000);
        await onSubmit(ts, endBehavior);
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
          <h3 className="text-sm font-semibold text-gray-900">Trial Settings</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Current state */}
          <div className="text-xs text-gray-500">
            {currentTrialEnd
              ? `Current trial ends: ${formatDateTime(new Date(currentTrialEnd * 1000))}`
              : "No active trial"}
          </div>

          {/* Action selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name="trialAction"
                checked={action === "set"}
                onChange={() => setAction("set")}
              />
              <span>Set / Extend trial end</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name="trialAction"
                checked={action === "end_now"}
                onChange={() => setAction("end_now")}
              />
              <span>End trial immediately</span>
            </label>
          </div>

          {action === "set" && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Trial End (UTC)</label>
                <input
                  type="datetime-local"
                  value={trialEndDate}
                  onChange={(e) => setTrialEndDate(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Missing Payment Method Behavior
                </label>
                <select
                  value={endBehavior}
                  onChange={(e) => setEndBehavior(e.target.value as TrialEndBehavior)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                >
                  <option value="create_invoice">Create invoice</option>
                  <option value="cancel">Cancel subscription</option>
                  <option value="pause">Pause subscription</option>
                </select>
              </div>
            </>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-3 py-1.5 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
