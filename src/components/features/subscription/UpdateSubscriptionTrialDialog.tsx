import { useState } from "react";
import { formatDateTime, toDatetimeLocalUTC } from "../../../lib/format";
import { Dialog } from "../../ui/Dialog";

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
    <Dialog onClose={onClose} size="md">
      <Dialog.Header title="Trial Settings" />
      <Dialog.Content compact>
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
                className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Missing Payment Method Behavior
              </label>
              <select
                value={endBehavior}
                onChange={(e) => setEndBehavior(e.target.value as TrialEndBehavior)}
                className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="create_invoice">Create invoice</option>
                <option value="cancel">Cancel subscription</option>
                <option value="pause">Pause subscription</option>
              </select>
            </div>
          </>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}
      </Dialog.Content>
      <Dialog.Footer>
        <Dialog.CancelButton size="compact" onClick={onClose} />
        <Dialog.ActionButton
          size="compact"
          onClick={handleSubmit}
          loading={loading}
          loadingText="Updating..."
        >
          Update
        </Dialog.ActionButton>
      </Dialog.Footer>
    </Dialog>
  );
}
