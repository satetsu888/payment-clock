import { useState, useMemo } from "react";
import type { Operation, StripeEvent, UnifiedTimelineItem } from "../lib/types";
import { EventItem } from "./EventItem";
import { extractCustomerIdFromEvent, extractCustomerIdFromOperation } from "../lib/resource-grouping";

interface UnifiedTimelineProps {
  operations: Operation[];
  events: StripeEvent[];
  customers: { id: string }[];
  stripeApiVersion: string;
}

const operationLabels: Record<string, string> = {
  create_clock: "Created test clock",
  advance_time: "Advanced time",
  delete_clock: "Deleted test clock",
  create_customer: "Created customer",
  attach_payment_method: "Attached payment method",
  create_subscription: "Created subscription",
};

function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString();
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
          timestamp: ev.stripeCreatedAt,
          event: ev,
        });
      }
    }

    result.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
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
                  detail = `to ${dt.toLocaleString()}`;
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
                  <div className="text-sm text-gray-900">{label}</div>
                  {detail && (
                    <div className="text-xs text-gray-500">{detail}</div>
                  )}
                  <div className="text-xs text-gray-400">
                    {formatTime(op.createdAt)}
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
                  <div className="text-xs text-gray-400 mt-0.5">
                    {formatTime(item.event.stripeCreatedAt)}
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
