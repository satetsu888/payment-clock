import { useState } from "react";
import { formatDateTime } from "../../../lib/format";
import { Dialog } from "../../ui/Dialog";

interface UpdateBillingAnchorDialogProps {
  subscriptionId: string;
  subscriptionData: Record<string, unknown>;
  frozenTime: string;
  onSubmit: (anchor: "now", prorationBehavior: string) => Promise<void>;
  onClose: () => void;
}

export function UpdateBillingAnchorDialog({
  subscriptionData,
  frozenTime,
  onSubmit,
  onClose,
}: UpdateBillingAnchorDialogProps) {
  const currentAnchor = subscriptionData.billing_cycle_anchor as number | undefined;

  const [prorationBehavior, setProrationBehavior] = useState("create_prorations");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSubmit("now", prorationBehavior);
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  };

  return (
    <Dialog onClose={onClose} size="md">
      <Dialog.Header title="Reset Billing Cycle Anchor" />
      <Dialog.Content compact>
        {currentAnchor && (
          <div className="text-xs text-gray-500">
            Current anchor: {formatDateTime(new Date(currentAnchor * 1000))}
          </div>
        )}

        <div className="text-xs text-gray-600 bg-gray-50 rounded-md p-2">
          Resets the billing cycle anchor to the current frozen time ({formatDateTime(new Date(frozenTime))}).
          This will immediately end the current billing period and start a new cycle.
        </div>

        {/* Proration behavior */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Proration Behavior</label>
          <select
            value={prorationBehavior}
            onChange={(e) => setProrationBehavior(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="create_prorations">Create prorations (default)</option>
            <option value="none">None</option>
            <option value="always_invoice">Always invoice</option>
          </select>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </Dialog.Content>
      <Dialog.Footer>
        <Dialog.CancelButton size="compact" onClick={onClose} />
        <Dialog.ActionButton
          size="compact"
          onClick={handleSubmit}
          loading={loading}
          loadingText="Resetting..."
        >
          Reset Anchor
        </Dialog.ActionButton>
      </Dialog.Footer>
    </Dialog>
  );
}
