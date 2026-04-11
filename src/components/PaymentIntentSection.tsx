import type { ResourceItem } from "../lib/types";
import { formatCurrency } from "../lib/format";

interface PaymentIntentSectionProps {
  paymentIntents: ResourceItem[];
}

const statusColors: Record<string, string> = {
  succeeded: "bg-green-100 text-green-700",
  processing: "bg-yellow-100 text-yellow-700",
  requires_payment_method: "bg-red-100 text-red-700",
  requires_confirmation: "bg-yellow-100 text-yellow-700",
  requires_action: "bg-yellow-100 text-yellow-700",
  canceled: "bg-gray-100 text-gray-500",
  requires_capture: "bg-blue-100 text-blue-700",
};

export function PaymentIntentSection({
  paymentIntents,
}: PaymentIntentSectionProps) {
  if (paymentIntents.length === 0) {
    return <p className="text-xs text-gray-400 py-2">No payment intents</p>;
  }

  return (
    <div className="space-y-1.5">
      {paymentIntents.map((pi) => {
        const status = pi.data.status as string;
        const hasChanged = pi.previousStatus != null && pi.previousStatus !== status;
        const amount = pi.data.amount as number;
        const currency = pi.data.currency as string;

        return (
          <div
            key={pi.stripeId}
            className={`flex items-center justify-between px-3 py-2 rounded text-sm ${hasChanged ? "bg-yellow-50 ring-1 ring-yellow-300" : "bg-gray-50"}`}
          >
            <div className="flex items-center gap-2">
              {hasChanged && (
                <span className="px-1.5 py-0.5 text-xs rounded bg-gray-200 text-gray-500 line-through">
                  {pi.previousStatus}
                </span>
              )}
              {hasChanged && <span className="text-xs text-gray-400">&rarr;</span>}
              <span
                className={`px-1.5 py-0.5 text-xs rounded ${statusColors[status] || "bg-gray-100 text-gray-600"}`}
              >
                {status}
              </span>
              <span className="text-gray-700">
                {formatCurrency(amount, currency)}
              </span>
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {pi.stripeId}
            </span>
          </div>
        );
      })}
    </div>
  );
}
