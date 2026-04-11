import type { ResourceItem } from "../lib/types";
import { formatCurrency } from "../lib/format";

interface BillingHistoryProps {
  invoices: ResourceItem[];
}

interface BillingRow {
  id: string;
  createdAt: Date;
  paidAt: Date | null;
  amount: number;
  currency: string;
  status: string;
  previousStatus: string | null;
  hasChanged: boolean;
}

const statusColors: Record<string, string> = {
  paid: "text-green-700 bg-green-100",
  open: "text-blue-700 bg-blue-100",
  draft: "text-gray-600 bg-gray-100",
  void: "text-gray-500 bg-gray-100",
  uncollectible: "text-red-700 bg-red-100",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function extractPaidAt(data: Record<string, unknown>): Date | null {
  const transitions = data.status_transitions as
    | Record<string, unknown>
    | undefined;
  if (!transitions) return null;
  const paidAt = transitions.paid_at as number | null | undefined;
  if (!paidAt) return null;
  return new Date(paidAt * 1000);
}

export function BillingHistory({ invoices }: BillingHistoryProps) {
  const rows: BillingRow[] = [];

  for (const inv of invoices) {
    const status = inv.data.status as string;
    const created = inv.data.created as number | undefined;
    rows.push({
      id: inv.stripeId,
      createdAt: created ? new Date(created * 1000) : new Date(0),
      paidAt: extractPaidAt(inv.data),
      amount: (inv.data.total as number) ?? 0,
      currency: (inv.data.currency as string) ?? "usd",
      status,
      previousStatus: inv.previousStatus,
      hasChanged: inv.previousStatus != null && inv.previousStatus !== status,
    });
  }

  rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const summary = rows.reduce(
    (acc, row) => {
      acc.totalBilled += row.amount;
      if (row.status === "paid") {
        acc.totalPaid += row.amount;
      }
      return acc;
    },
    { totalBilled: 0, totalPaid: 0 },
  );

  const summaryCurrency = rows.length > 0 ? rows[0].currency : "usd";

  if (rows.length === 0) {
    return (
      <p className="text-xs text-gray-400 py-2">No billing history yet</p>
    );
  }

  return (
    <div>
      <div className="border border-gray-200 rounded-md overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-1.5 text-left font-medium">Billed</th>
              <th className="px-3 py-1.5 text-left font-medium">Paid</th>
              <th className="px-3 py-1.5 text-right font-medium">Amount</th>
              <th className="px-3 py-1.5 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr
                key={row.id}
                className={
                  row.hasChanged ? "bg-yellow-50" : "hover:bg-gray-50"
                }
              >
                <td className="px-3 py-1.5 text-gray-600">
                  {formatDate(row.createdAt)}
                </td>
                <td className="px-3 py-1.5 text-gray-600">
                  {row.paidAt ? formatDate(row.paidAt) : (
                    <span className="text-gray-300">&mdash;</span>
                  )}
                </td>
                <td className="px-3 py-1.5 text-right text-gray-900 font-mono">
                  {formatCurrency(row.amount, row.currency)}
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    {row.hasChanged && row.previousStatus && (
                      <>
                        <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 line-through">
                          {row.previousStatus}
                        </span>
                        <span className="text-gray-400">&rarr;</span>
                      </>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded ${statusColors[row.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {row.status}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span>
          Total billed:{" "}
          <span className="font-mono text-gray-700">
            {formatCurrency(summary.totalBilled, summaryCurrency)}
          </span>
        </span>
        <span>
          Total paid:{" "}
          <span className="font-mono text-gray-700">
            {formatCurrency(summary.totalPaid, summaryCurrency)}
          </span>
        </span>
      </div>
    </div>
  );
}
