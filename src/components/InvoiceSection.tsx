import type { ResourceItem } from "../lib/types";

interface InvoiceSectionProps {
  invoices: ResourceItem[];
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  open: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  void: "bg-gray-100 text-gray-500",
  uncollectible: "bg-red-100 text-red-700",
};

export function InvoiceSection({ invoices }: InvoiceSectionProps) {
  if (invoices.length === 0) {
    return <p className="text-xs text-gray-400 py-2">No invoices</p>;
  }

  return (
    <div className="space-y-1.5">
      {invoices.map((inv) => {
        const status = inv.data.status as string;
        const hasChanged = inv.previousStatus != null && inv.previousStatus !== status;
        const total = inv.data.total as number;
        const currency = inv.data.currency as string;

        return (
          <div
            key={inv.stripeId}
            className={`flex items-center justify-between px-3 py-2 rounded text-sm ${hasChanged ? "bg-yellow-50 ring-1 ring-yellow-300" : "bg-gray-50"}`}
          >
            <div className="flex items-center gap-2">
              {hasChanged && (
                <span className="px-1.5 py-0.5 text-xs rounded bg-gray-200 text-gray-500 line-through">
                  {inv.previousStatus}
                </span>
              )}
              {hasChanged && <span className="text-xs text-gray-400">&rarr;</span>}
              <span
                className={`px-1.5 py-0.5 text-xs rounded ${statusColors[status] || "bg-gray-100 text-gray-600"}`}
              >
                {status}
              </span>
              <span className="text-gray-700">
                {(total / 100).toFixed(2)} {currency?.toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-gray-400 font-mono">
              {inv.stripeId}
            </span>
          </div>
        );
      })}
    </div>
  );
}
