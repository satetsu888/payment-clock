import { useState, useMemo } from "react";
import type { Operation, StripeEvent, UnifiedTimelineItem } from "../../../lib/types";
import { EventItem } from "../timeline/EventItem";
import { extractCustomerIdFromEvent, extractCustomerIdFromOperation } from "../../../lib/resource-grouping";
import { formatDateTime, formatDateTimeWithSeconds } from "../../../lib/format";

interface UnifiedTimelineProps {
  operations: Operation[];
  events: StripeEvent[];
  customers: { id: string; name: string | null }[];
  stripeApiVersion: string;
}

const operationLabels: Record<string, string> = {
  create_clock: "Create test clock",
  advance_time: "Advance time",
  delete_clock: "Delete test clock",
  create_customer: "Create customer",
  attach_payment_method: "Attach payment method",
  set_default_payment_method: "Set default payment method",
  detach_payment_method: "Detach payment method",
  create_subscription: "Create subscription",
  cancel_subscription: "Cancel subscription",
  pause_subscription: "Pause subscription",
  resume_subscription: "Resume subscription",
  update_subscription_items: "Update subscription items",
  update_subscription_trial: "Update subscription trial",
  cancel_subscription_immediately: "Cancel subscription immediately",
  update_subscription_cancel_at: "Update subscription cancel_at",
  undo_cancel_subscription: "Undo cancel subscription",
  update_subscription_billing_anchor: "Update billing anchor",
  pause_subscription_with_options: "Pause subscription",
  apply_subscription_discount: "Apply subscription discount",
  create_meter: "Create meter",
  create_meter_event: "Report usage",
};

function formatRealTime(isoString: string): string {
  try {
    return formatDateTimeWithSeconds(new Date(isoString));
  } catch {
    return isoString;
  }
}

type FilterType = "all" | "operations" | "events";

export function UnifiedTimeline({
  operations,
  events,
  customers,
  stripeApiVersion,
}: UnifiedTimelineProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("");
  const [customerFilter, setCustomerFilter] = useState<string>("");

  const eventTypes = useMemo(() => {
    const types = new Set(events.map((e) => e.eventType));
    return Array.from(types).sort();
  }, [events]);

  const items = useMemo(() => {
    const result: UnifiedTimelineItem[] = [];

    if (filter !== "events") {
      for (const op of operations) {
        if (customerFilter) {
          const cid = extractCustomerIdFromOperation(op);
          // customer無関係のoperation(create_clock, advance_time等)は常に表示
          if (cid !== null && cid !== customerFilter) continue;
        }
        result.push({
          type: "operation",
          timestamp: op.createdAt,
          operation: op,
        });
      }
    }

    if (filter !== "operations") {
      for (const ev of events) {
        if (eventTypeFilter && ev.eventType !== eventTypeFilter) continue;
        if (customerFilter) {
          const cid = extractCustomerIdFromEvent(ev);
          if (cid !== customerFilter) continue;
        }
        result.push({
          type: "event",
          timestamp: ev.receivedAt,
          event: ev,
        });
      }
    }

    result.sort((a, b) => {
      const primary =
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      if (primary !== 0) return primary;
      // 同一実時間内はシミュレーション時間で副次ソート（降順）
      const aSimTime = a.event?.stripeCreatedAt ?? a.timestamp;
      const bSimTime = b.event?.stripeCreatedAt ?? b.timestamp;
      return (
        new Date(bSimTime).getTime() - new Date(aSimTime).getTime()
      );
    });
    return result;
  }, [operations, events, filter, eventTypeFilter, customerFilter]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex gap-1">
          {(["all", "operations", "events"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded ${
                filter === f
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f === "all" ? "All" : f === "operations" ? "Operations" : "Events"}
            </button>
          ))}
        </div>
        {filter !== "operations" && eventTypes.length > 0 && (
          <select
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded"
          >
            <option value="">All event types</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
        {customers.length > 1 && (
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="px-2 py-1 text-xs border border-gray-300 rounded"
          >
            <option value="">All customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id}
              </option>
            ))}
          </select>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {items.length} items
        </span>
      </div>

      {items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          No items to display
        </p>
      )}

      <div className="space-y-0.5">
        {items.map((item) => {
          if (item.type === "operation" && item.operation) {
            const op = item.operation;
            const label =
              operationLabels[op.operationType] || op.operationType;

            let detail: string | null = null;
            if (op.requestParams) {
              try {
                const params = JSON.parse(op.requestParams);
                if (params.frozen_time) {
                  const dt = new Date(params.frozen_time * 1000);
                  detail = `to ${formatDateTime(dt)}`;
                } else if (op.operationType === "create_meter_event") {
                  const parts: string[] = [];
                  if (params.customer_id) {
                    const cust = customers.find((c) => c.id === params.customer_id);
                    parts.push(cust?.name || params.customer_id);
                  }
                  if (params.event_name) parts.push(params.event_name);
                  if (params.value) parts.push(`value: ${params.value}`);
                  if (parts.length > 0) detail = parts.join(" · ");
                }
              } catch {
                // ignore
              }
            }

            return (
              <div key={`op-${op.id}`} className="flex gap-3 py-1.5">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5" />
                  <div className="w-px flex-1 bg-gray-200" />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      <div className="text-sm text-gray-900">{label}</div>
                      {detail && (
                        <div className="text-xs text-gray-500">{detail}</div>
                      )}
                    </div>
                    <div className="text-xs text-gray-300 shrink-0">
                      {formatRealTime(op.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (item.type === "event" && item.event) {
            return (
              <div key={`ev-${item.event.id}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 bg-amber-400 rounded-full mt-2" />
                  <div className="w-px flex-1 bg-gray-200" />
                </div>
                <div className="flex-1">
                  <EventItem event={item.event} stripeApiVersion={stripeApiVersion} />
                  <div className="text-xs text-gray-300 text-right mt-0.5">
                    {formatRealTime(item.event.stripeCreatedAt)}
                  </div>
                </div>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
