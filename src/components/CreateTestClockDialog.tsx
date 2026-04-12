import { useState } from "react";
import { PM_VISA, PM_CHARGE_FAIL } from "../lib/payment-methods";
import { toDatetimeLocalUTC } from "../lib/format";

interface CreateTestClockDialogProps {
  onSubmit: (frozenTime: number, name?: string, options?: { createCustomer: boolean; paymentMethodIds: string[] }) => Promise<void>;
  onClose: () => void;
}

export function CreateTestClockDialog({
  onSubmit,
  onClose,
}: CreateTestClockDialogProps) {
  const [name, setName] = useState("");
  const [dateTime, setDateTime] = useState(() => toDatetimeLocalUTC(new Date()));
  const [createCustomer, setCreateCustomer] = useState(true);
  const [attachSuccess, setAttachSuccess] = useState(true);
  const [attachDecline, setAttachDecline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const frozenTime = Math.floor(new Date(dateTime).getTime() / 1000);
      const paymentMethodIds: string[] = [];
      if (createCustomer) {
        if (attachSuccess) paymentMethodIds.push(PM_VISA.id);
        if (attachDecline) paymentMethodIds.push(PM_CHARGE_FAIL.id);
      }
      await onSubmit(frozenTime, name || undefined, {
        createCustomer,
        paymentMethodIds,
      });
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Create Test Clock
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My test clock"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Frozen Time
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
              required
            />
          </div>
          <div className="border-t border-gray-200 pt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={createCustomer}
                onChange={(e) => {
                  setCreateCustomer(e.target.checked);
                  if (!e.target.checked) {
                    setAttachSuccess(false);
                    setAttachDecline(false);
                  }
                }}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                disabled={loading}
              />
              Create a customer
            </label>
            <label className={`flex items-center gap-2 text-sm font-medium cursor-pointer ml-6 ${
              createCustomer ? "text-gray-700" : "text-gray-400"
            }`}>
              <input
                type="checkbox"
                checked={attachSuccess}
                onChange={(e) => setAttachSuccess(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                disabled={loading || !createCustomer}
              />
              Attach a payment method ({PM_VISA.label})
            </label>
            <label className={`flex items-center gap-2 text-sm font-medium cursor-pointer ml-6 ${
              createCustomer ? "text-gray-700" : "text-gray-400"
            }`}>
              <input
                type="checkbox"
                checked={attachDecline}
                onChange={(e) => setAttachDecline(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                disabled={loading || !createCustomer}
              />
              Attach a declining card ({PM_CHARGE_FAIL.label})
            </label>
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
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
