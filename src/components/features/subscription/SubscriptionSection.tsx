import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { ResourceItem, SubscriptionActions } from "../../../lib/types";
import { formatDateTime } from "../../../lib/format";
import {
  subscriptionCurrentPeriodStart,
  subscriptionCurrentPeriodEnd,
} from "../../../lib/stripe-compat";
import { getStripeDashboardUrl } from "../../../lib/stripe-urls";
import { DropdownMenu } from "../../ui/DropdownMenu";
import { StripeIdLink } from "../../ui/StripeIdLink";
import type { DropdownMenuItem } from "../../ui/DropdownMenu";
import { UpdateSubscriptionItemsDialog } from "./UpdateSubscriptionItemsDialog";
import { UpdateSubscriptionTrialDialog } from "./UpdateSubscriptionTrialDialog";
import { CancelSubscriptionDialog } from "./CancelSubscriptionDialog";
import { UpdateBillingAnchorDialog } from "./UpdateBillingAnchorDialog";
import { PauseSubscriptionDialog } from "./PauseSubscriptionDialog";
import { ApplyDiscountDialog } from "./ApplyDiscountDialog";

interface SubscriptionSectionProps {
  subscriptions: ResourceItem[];
  stripeApiVersion: string;
  onCancel: (subscriptionId: string) => Promise<void>;
  onPause: (subscriptionId: string) => Promise<void>;
  onResume: (subscriptionId: string) => Promise<void>;
  actions: SubscriptionActions;
  accountId: string;
  frozenTime: string;
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

type DialogType = "updateItems" | "updateTrial" | "cancel" | "billingAnchor" | "pause" | "discount";

function formatItemPrice(priceInfo: Record<string, unknown>): string {
  const unitAmount = priceInfo.unit_amount as number | null;
  const currency = String(priceInfo.currency).toUpperCase();
  const recurring = priceInfo.recurring as Record<string, unknown> | null;
  const interval = recurring ? `/${String(recurring.interval)}` : "";
  const isMetered = recurring?.usage_type === "metered";

  if (unitAmount == null) {
    return `Usage-based${interval}`;
  }
  const amount = (unitAmount / 100).toFixed(2);
  if (isMetered) {
    return `${amount} ${currency}/unit${interval}`;
  }
  return `${amount} ${currency}${interval}`;
}

function isMeteredItem(item: Record<string, unknown>): boolean {
  const priceInfo = item.price as Record<string, unknown> | null;
  const recurring = priceInfo?.recurring as Record<string, unknown> | null;
  return recurring?.usage_type === "metered";
}

export function SubscriptionSection({
  subscriptions,
  stripeApiVersion,
  onResume,
  actions,
  accountId,
  frozenTime,
}: SubscriptionSectionProps) {
  const [loadingAction, setLoadingAction] = useState<{ id: string; action: string } | null>(null);
  const [dialog, setDialog] = useState<{ type: DialogType; subscriptionId: string; subscriptionData: Record<string, unknown> } | null>(null);

  const handleAction = async (id: string, action: string, fn: (...args: unknown[]) => Promise<void>, ...args: unknown[]) => {
    setLoadingAction({ id, action });
    try {
      await fn(...args);
    } finally {
      setLoadingAction(null);
    }
  };

  if (subscriptions.length === 0) {
    return <p className="text-xs text-gray-400 py-2">No subscriptions</p>;
  }

  return (
    <div className="space-y-2">
      {subscriptions.map((s) => {
        const status = s.data.status as string;
        const items = s.data.items as Record<string, unknown> | undefined;
        const itemData = (items?.data as Array<Record<string, unknown>>) || [];
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

        const canModify = status === "active" || status === "trialing";
        const canCancel = status === "active" || status === "trialing" || status === "past_due";
        const canPause = status === "active" && !isPaused;
        const canResume = isPaused && status !== "canceled";
        const canUndoCancel = !!cancelAtPeriodEnd && (status === "active" || status === "trialing");

        // Build dropdown menu items
        const menuItems: DropdownMenuItem[] = [];
        const stripeUrl = getStripeDashboardUrl(s.stripeId);
        if (stripeUrl) {
          menuItems.push({
            label: "View in Stripe",
            onClick: () => openUrl(stripeUrl),
          });
        }
        if (canModify) {
          menuItems.push({
            label: "Change Plan",
            onClick: () => setDialog({ type: "updateItems", subscriptionId: s.stripeId, subscriptionData: s.data }),
          });
          menuItems.push({
            label: "Trial Settings",
            onClick: () => setDialog({ type: "updateTrial", subscriptionId: s.stripeId, subscriptionData: s.data }),
          });
        }
        if (status === "active") {
          menuItems.push({
            label: "Billing Anchor",
            onClick: () => setDialog({ type: "billingAnchor", subscriptionId: s.stripeId, subscriptionData: s.data }),
          });
        }
        if (canPause) {
          menuItems.push({
            label: "Pause",
            onClick: () => setDialog({ type: "pause", subscriptionId: s.stripeId, subscriptionData: s.data }),
          });
        }
        if (canCancel) {
          menuItems.push({
            label: "Cancel",
            onClick: () => setDialog({ type: "cancel", subscriptionId: s.stripeId, subscriptionData: s.data }),
            danger: true,
          });
        }
        if (canUndoCancel) {
          menuItems.push({
            label: "Undo Cancel",
            onClick: () => handleAction(s.stripeId, "undoCancel", () => actions.undoCancel(s.stripeId)),
          });
        }
        if (canModify) {
          menuItems.push({
            label: "Apply Discount",
            onClick: () => setDialog({ type: "discount", subscriptionId: s.stripeId, subscriptionData: s.data }),
          });
        }

        const isThisLoading = loadingAction?.id === s.stripeId;
        const disabled = loadingAction !== null;

        return (
          <div
            key={s.stripeId}
            className={`border-l-2 ${borderColor} rounded bg-gray-50 px-3 py-2.5 ${isDimmed ? "opacity-60" : ""}`}
          >
            {/* Row 1: label + status + actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {label && (
                  <span className="text-sm font-medium text-gray-900">
                    {label}
                  </span>
                )}
                <span
                  className={`px-1.5 py-0.5 text-xs rounded ${statusColors[status] || "bg-gray-100 text-gray-600"}`}
                >
                  {status}
                </span>
                {isPaused && (
                  <span className="px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-700">paused</span>
                )}
                {cancelAtPeriodEnd && status === "active" && !isPaused && (
                  <span className="text-xs text-amber-600">cancels at period end</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <StripeIdLink stripeId={s.stripeId} className="text-xs text-gray-400" />
                {menuItems.length > 0 && <DropdownMenu items={menuItems} />}
              </div>
            </div>

            {/* Row 2: all items */}
            <div className="mt-1 space-y-0.5">
              {itemData.map((item) => {
                const priceInfo = item.price as Record<string, unknown> | null;
                const productName = priceInfo?.product
                  ? typeof priceInfo.product === "string"
                    ? priceInfo.product
                    : (priceInfo.product as Record<string, unknown>).name as string
                  : null;
                const metered = isMeteredItem(item);
                return (
                  <div key={String(item.id)} className="flex items-center gap-2 text-xs text-gray-600">
                    {productName && <span className="text-gray-500">{productName}</span>}
                    {priceInfo && <span>{formatItemPrice(priceInfo)}</span>}
                    {metered && (
                      <span className="px-1 py-0.5 text-[10px] rounded bg-emerald-100 text-emerald-700">metered</span>
                    )}
                  </div>
                );
              })}
            </div>

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

            {/* Row 4: Resume button (inline, for paused subscriptions) */}
            {canResume && (
              <div className="flex items-center justify-end gap-1.5 mt-2">
                <button
                  onClick={() => handleAction(s.stripeId, "resume", () => onResume(s.stripeId))}
                  disabled={disabled}
                  className="px-2 py-0.5 text-xs font-medium rounded border border-indigo-300 text-indigo-600 bg-white hover:bg-indigo-50 disabled:opacity-50 transition-colors"
                >
                  {isThisLoading && loadingAction?.action === "resume" ? "Resuming..." : "Resume"}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Dialogs */}
      {dialog?.type === "updateItems" && (
        <UpdateSubscriptionItemsDialog
          subscriptionId={dialog.subscriptionId}
          subscriptionData={dialog.subscriptionData}
          accountId={accountId}
          onSubmit={async (items, prorationBehavior) => {
            await actions.updateItems(dialog.subscriptionId, items, prorationBehavior);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === "updateTrial" && (
        <UpdateSubscriptionTrialDialog
          subscriptionId={dialog.subscriptionId}
          subscriptionData={dialog.subscriptionData}
          frozenTime={frozenTime}
          onSubmit={async (trialEnd, endBehavior) => {
            await actions.updateTrial(dialog.subscriptionId, trialEnd, endBehavior);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === "cancel" && (
        <CancelSubscriptionDialog
          subscriptionId={dialog.subscriptionId}
          frozenTime={frozenTime}
          onCancelAtPeriodEnd={async () => {
            await actions.cancel(dialog.subscriptionId);
            setDialog(null);
          }}
          onCancelImmediately={async (invoiceNow, prorate) => {
            await actions.cancelImmediately(dialog.subscriptionId, { invoiceNow, prorate });
            setDialog(null);
          }}
          onCancelAt={async (cancelAt) => {
            await actions.cancelAt(dialog.subscriptionId, cancelAt);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === "billingAnchor" && (
        <UpdateBillingAnchorDialog
          subscriptionId={dialog.subscriptionId}
          subscriptionData={dialog.subscriptionData}
          frozenTime={frozenTime}
          onSubmit={async (anchor, prorationBehavior) => {
            await actions.updateBillingAnchor(dialog.subscriptionId, anchor, prorationBehavior);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === "pause" && (
        <PauseSubscriptionDialog
          subscriptionId={dialog.subscriptionId}
          frozenTime={frozenTime}
          onSubmit={async (behavior, resumesAt) => {
            await actions.pauseWithOptions(dialog.subscriptionId, { behavior, resumesAt });
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === "discount" && (
        <ApplyDiscountDialog
          subscriptionId={dialog.subscriptionId}
          onSubmit={async (couponId, promotionCodeId) => {
            await actions.applyDiscount(dialog.subscriptionId, couponId, promotionCodeId);
            setDialog(null);
          }}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
