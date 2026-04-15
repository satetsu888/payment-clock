import { useState } from "react";
import { TEST_PAYMENT_METHOD_GROUPS } from "../../../lib/payment-methods";
import { Dialog } from "../../ui/Dialog";

interface CreatePaymentMethodDialogProps {
  onAttach: (paymentMethodId: string) => Promise<void>;
  onClose: () => void;
}

export function CreatePaymentMethodDialog({
  onAttach,
  onClose,
}: CreatePaymentMethodDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAttach = async (pmId: string) => {
    setLoading(true);
    setError(null);
    try {
      await onAttach(pmId);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog onClose={onClose} size="sm">
      <Dialog.Header title="Attach Payment Method" />
      <Dialog.Content>
        {error && (
          <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">
            {error}
          </p>
        )}
        <div className="space-y-3">
          {TEST_PAYMENT_METHOD_GROUPS.map((pmGroup) => (
            <div key={pmGroup.label}>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                {pmGroup.label}
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {pmGroup.methods.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => handleAttach(pm.id)}
                    disabled={loading}
                    className="px-2.5 py-1.5 text-xs border border-gray-300 rounded-md hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-50 transition-colors"
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Dialog.Content>
      <Dialog.Footer>
        <Dialog.CancelButton onClick={onClose} disabled={loading} />
      </Dialog.Footer>
    </Dialog>
  );
}
