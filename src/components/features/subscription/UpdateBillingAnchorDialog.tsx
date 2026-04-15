import { useState } from "react";
import { formatDateTime } from "../../../lib/format";

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Reset Billing Cycle Anchor</h3>
        </div>
        <div className="p-4 space-y-4">
          {currentAnchor && (
            <div className="text-xs text-gray-500">
              Current anchor: {formatDateTime(new Date(currentAnchor * 1000))}
            </div>
          )}

          <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
            Billing cycle anchor を現在の frozen time ({formatDateTime(new Date(frozenTime))}) にリセットします。
            これにより現在の請求期間が即座に終了し、新しいサイクルが開始されます。
          </div>

          {/* Proration behavior */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Proration Behavior</label>
            <select
              value={prorationBehavior}
              onChange={(e) => setProrationBehavior(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
            >
              <option value="create_prorations">Create prorations (default)</option>
              <option value="none">None</option>
              <option value="always_invoice">Always invoice</option>
            </select>
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
            {loading ? "Resetting..." : "Reset Anchor"}
          </button>
        </div>
      </div>
    </div>
  );
}
