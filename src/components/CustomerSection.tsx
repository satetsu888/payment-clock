import { useState } from "react";
import type { ResourceItem } from "../lib/types";

interface CustomerSectionProps {
  customers: ResourceItem[];
  onAttachPaymentMethod: (
    customerId: string,
    paymentMethodId: string,
  ) => Promise<void>;
}

const TEST_PAYMENT_METHODS = [
  { id: "pm_card_visa", label: "Visa (4242)" },
  { id: "pm_card_mastercard", label: "Mastercard (5555)" },
  { id: "pm_card_amex", label: "Amex (3782)" },
  { id: "pm_card_visa_debit", label: "Visa Debit" },
  { id: "pm_card_chargeDeclined", label: "Declined Card" },
];

function hasDefaultPaymentMethod(data: Record<string, unknown>): boolean {
  const invoiceSettings = data.invoice_settings as
    | Record<string, unknown>
    | undefined;
  return !!invoiceSettings?.default_payment_method;
}

export function CustomerSection({
  customers,
  onAttachPaymentMethod,
}: CustomerSectionProps) {
  const [attachingFor, setAttachingFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAttach = async (customerId: string, pmId: string) => {
    setLoading(true);
    setError(null);
    try {
      await onAttachPaymentMethod(customerId, pmId);
      setAttachingFor(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  if (customers.length === 0) {
    return <p className="text-xs text-gray-400 py-2">No customers</p>;
  }

  return (
    <div className="space-y-1.5">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
          {error}
        </p>
      )}
      {customers.map((c) => {
        const hasPM = hasDefaultPaymentMethod(c.data);
        return (
          <div key={c.stripeId} className="px-3 py-2 bg-gray-50 rounded text-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900">
                  {String(c.data.name || "Unnamed")}
                </span>
                {c.data.email ? (
                  <span className="text-gray-500 ml-2 text-xs">
                    {String(c.data.email)}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {hasPM ? (
                  <span className="text-xs text-green-600">Payment method set</span>
                ) : (
                  <button
                    onClick={() =>
                      setAttachingFor(
                        attachingFor === c.stripeId ? null : c.stripeId,
                      )
                    }
                    className="text-xs text-indigo-600 hover:text-indigo-800"
                  >
                    + Payment Method
                  </button>
                )}
                <span className="text-xs text-gray-400 font-mono">
                  {c.stripeId}
                </span>
              </div>
            </div>
            {attachingFor === c.stripeId && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TEST_PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => handleAttach(c.stripeId, pm.id)}
                    disabled={loading}
                    className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-50"
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
