import type { ResourceItem } from "../lib/types";
import { formatDateTime } from "../lib/format";
import {
  subscriptionCurrentPeriodStart,
  subscriptionCurrentPeriodEnd,
} from "../lib/stripe-compat";
import { DropdownMenu, type DropdownMenuItem } from "./DropdownMenu";

interface SubscriptionSectionProps {
  subscriptions: ResourceItem[];
  stripeApiVersion: string;
  onCancel: (subscriptionId: string) => Promise<void>;
  onPause: (subscriptionId: string) => Promise<void>;
  onResume: (subscriptionId: string) => Promise<void>;
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

const borderColors: Record<string, string> = {
  active: "border-l-indigo-400",
  trialing: "border-l-blue-400",
  canceled: "border-l-gray-300",
  incomplete_expired: "border-l-gray-300",
  paused: "border-l-gray-400",
  past_due: "border-l-red-400",
};

function formatUnix(ts: number | null): string {
  if (!ts) return "";
  return formatDateTime(new Date(ts * 1000));
}

export function SubscriptionSection({
  subscriptions,
  stripeApiVersion,
  onCancel,
  onPause,
  onResume,
}: SubscriptionSectionProps) {
  if (subscriptions.length === 0) {
    return <p className="text-xs text-gray-400 py-2">No subscriptions</p>;
  }

  return (
    <div className="space-y-2">
      {subscriptions.map((s) => {
        const status = s.data.status as string;
        const items = s.data.items as Record<string, unknown> | undefined;
        const itemData = (items?.data as Array<Record<string, unknown>>) || [];
        const priceInfo = itemData.length > 0
          ? (itemData[0].price as Record<string, unknown>)
          : null;
        const metadata = s.data.metadata as Record<string, string> | undefined;
        const label = metadata?.payment_clock_label;

        const periodStart = subscriptionCurrentPeriodStart(s.data, stripeApiVersion);
        const periodEnd = subscriptionCurrentPeriodEnd(s.data, stripeApiVersion);
        const trialEnd = s.data.trial_end as number | null | undefined;
        const cancelAtPeriodEnd = s.data.cancel_at_period_end as boolean | undefined;

        const pauseCollection = s.data.pause_collection as Record<string, unknown> | null | undefined;
        const isPaused = !!pauseCollection;
        const isDimmed = status === "canceled" || status === "incomplete_expired";
        const borderColor = isPaused ? "border-l-amber-400" : (borderColors[status] || "border-l-gray-300");

        const menuItems: DropdownMenuItem[] = [];
        if (status === "active" || status === "trialing" || status === "past_due") {
          menuItems.push({
            label: "Cancel",
            onClick: () => onCancel(s.stripeId),
            danger: true,
          });
        }
        if (status === "active" && !isPaused) {
          menuItems.push({
            label: "Pause",
            onClick: () => onPause(s.stripeId),
          });
        }
        if (isPaused && status !== "canceled") {
          menuItems.push({
            label: "Resume",
            onClick: () => onResume(s.stripeId),
          });
        }

        return (
          <div
            key={s.stripeId}
            className={`border-l-2 ${borderColor} rounded bg-gray-50 px-3 py-2.5 ${isDimmed ? "opacity-60" : ""}`}
          >
            {/* Row 1: status + amount + menu */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`px-1.5 py-0.5 text-xs rounded ${statusColors[status] || "bg-gray-100 text-gray-600"}`}
                >
                  {status}
                </span>
                {priceInfo && (
                  <span className="text-sm font-medium text-gray-900">
                    {((priceInfo.unit_amount as number) / 100).toFixed(2)}{" "}
                    {String(priceInfo.currency).toUpperCase()}
                    {priceInfo.recurring
                      ? `/${String((priceInfo.recurring as Record<string, unknown>).interval)}`
                      : ""}
                  </span>
                )}
                {isPaused && (
                  <span className="px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-700">paused</span>
                )}
                {cancelAtPeriodEnd && status === "active" && !isPaused && (
                  <span className="text-xs text-amber-600">cancels at period end</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">
                  {s.stripeId}
                </span>
                <DropdownMenu items={menuItems} />
              </div>
            </div>

            {/* Row 2: label */}
            {label && (
              <div className="text-xs text-gray-600 mt-1">
                {label}
              </div>
            )}

            {/* Row 3: period info (conditional) */}
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              {(status === "active" || status === "trialing" || status === "past_due") &&
                periodStart && periodEnd && (
                  <span>
                    Period: {formatUnix(periodStart)} – {formatUnix(periodEnd)}
                  </span>
                )}
              {status === "trialing" && trialEnd && (
                <span>
                  Trial ends: {formatUnix(trialEnd)}
                </span>
              )}
              {isPaused && (
                <span className="text-amber-600 italic">
                  Collection paused ({String((pauseCollection as Record<string, unknown>).behavior)})
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
