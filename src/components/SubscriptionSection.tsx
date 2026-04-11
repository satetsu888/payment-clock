import type { ResourceItem } from "../lib/types";

interface SubscriptionSectionProps {
  subscriptions: ResourceItem[];
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  past_due: "bg-red-100 text-red-700",
  canceled: "bg-gray-100 text-gray-500",
  incomplete: "bg-yellow-100 text-yellow-700",
  trialing: "bg-blue-100 text-blue-700",
  unpaid: "bg-red-100 text-red-700",
  incomplete_expired: "bg-gray-100 text-gray-500",
  paused: "bg-gray-100 text-gray-600",
};

export function SubscriptionSection({
  subscriptions,
}: SubscriptionSectionProps) {
  if (subscriptions.length === 0) {
    return <p className="text-xs text-gray-400 py-2">No subscriptions</p>;
  }

  return (
    <div className="space-y-1.5">
      {subscriptions.map((s) => {
        const status = s.data.status as string;
        const items = s.data.items as Record<string, unknown> | undefined;
        const itemData = (items?.data as Array<Record<string, unknown>>) || [];
        const priceInfo = itemData.length > 0
          ? (itemData[0].price as Record<string, unknown>)
          : null;
        const metadata = s.data.metadata as Record<string, string> | undefined;
        const label = metadata?.payment_clock_label;

        return (
          <div
            key={s.stripeId}
            className="px-3 py-2 rounded text-sm bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {label && (
                  <span className="text-xs font-medium text-gray-700">
                    {label}
                  </span>
                )}
                <span
                  className={`px-1.5 py-0.5 text-xs rounded ${statusColors[status] || "bg-gray-100 text-gray-600"}`}
                >
                  {status}
                </span>
                {priceInfo && (
                  <span className="text-gray-600 text-xs">
                    {((priceInfo.unit_amount as number) / 100).toFixed(2)}{" "}
                    {String(priceInfo.currency).toUpperCase()}
                    {priceInfo.recurring
                      ? `/${String((priceInfo.recurring as Record<string, unknown>).interval)}`
                      : ""}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {s.stripeId}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
