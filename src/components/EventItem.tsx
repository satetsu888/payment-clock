import { useState } from "react";
import type { StripeEvent } from "../lib/types";
import { subscriptionCurrentPeriodEnd } from "../lib/stripe-compat";
import { formatDateTime } from "../lib/format";

interface EventItemProps {
  event: StripeEvent;
  stripeApiVersion: string;
}

const eventTypeColors: Record<string, string> = {
  "customer.": "bg-blue-100 text-blue-700",
  "invoice.": "bg-purple-100 text-purple-700",
  "payment_intent.": "bg-green-100 text-green-700",
  "customer.subscription.": "bg-orange-100 text-orange-700",
  "charge.": "bg-emerald-100 text-emerald-700",
  "test_helpers.": "bg-gray-100 text-gray-600",
};

function getEventColor(eventType: string): string {
  for (const [prefix, color] of Object.entries(eventTypeColors)) {
    if (eventType.startsWith(prefix)) return color;
  }
  return "bg-gray-100 text-gray-600";
}

function ResourceSummary({ data, stripeApiVersion }: { data: Record<string, unknown>; stripeApiVersion: string }) {
  const objectType = data.object as string | undefined;
  const obj = data as Record<string, unknown>;

  switch (objectType) {
    case "customer":
      return (
        <div className="text-xs text-gray-600 space-y-0.5">
          {obj.name ? <div>Name: {String(obj.name)}</div> : null}
          {obj.email ? <div>Email: {String(obj.email)}</div> : null}
        </div>
      );
    case "subscription": {
      const periodEnd = subscriptionCurrentPeriodEnd(obj, stripeApiVersion);
      return (
        <div className="text-xs text-gray-600 space-y-0.5">
          <div>Status: <span className="font-medium">{String(obj.status)}</span></div>
          {periodEnd ? (
            <div>Period end: {formatDateTime(new Date(periodEnd * 1000))}</div>
          ) : null}
        </div>
      );
    }
    case "invoice":
      return (
        <div className="text-xs text-gray-600 space-y-0.5">
          <div>Status: <span className="font-medium">{String(obj.status)}</span></div>
          {obj.total != null && (
            <div>Total: {((obj.total as number) / 100).toFixed(2)} {String(obj.currency).toUpperCase()}</div>
          )}
        </div>
      );
    case "payment_intent":
      return (
        <div className="text-xs text-gray-600 space-y-0.5">
          <div>Status: <span className="font-medium">{String(obj.status)}</span></div>
          {obj.amount != null && (
            <div>Amount: {((obj.amount as number) / 100).toFixed(2)} {String(obj.currency).toUpperCase()}</div>
          )}
        </div>
      );
    case "charge":
      return (
        <div className="text-xs text-gray-600 space-y-0.5">
          <div>Status: <span className="font-medium">{String(obj.status)}</span></div>
          {obj.amount != null && (
            <div>Amount: {((obj.amount as number) / 100).toFixed(2)} {String(obj.currency).toUpperCase()}</div>
          )}
        </div>
      );
    default:
      return null;
  }
}

export function EventItem({ event, stripeApiVersion }: EventItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(event.dataSnapshot);
  } catch {
    // ignore
  }

  const dataObject = parsed?.data
    ? (parsed.data as Record<string, unknown>).object as Record<string, unknown>
    : null;

  return (
    <div className="py-1.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-center gap-2"
      >
        <span
          className={`px-1.5 py-0.5 text-xs rounded shrink-0 ${getEventColor(event.eventType)}`}
        >
          {event.eventType}
        </span>
        {event.resourceId && (
          <span className="text-xs text-gray-400 font-mono truncate">
            {event.resourceId}
          </span>
        )}
        <span className="text-xs text-gray-300 ml-auto shrink-0">
          {event.source === "cli" ? "CLI" : "API"}
        </span>
      </button>
      {expanded && (
        <div className="mt-1.5 pl-2 border-l-2 border-gray-200">
          {dataObject && <ResourceSummary data={dataObject} stripeApiVersion={stripeApiVersion} />}
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs text-indigo-500 hover:text-indigo-700 mt-1"
          >
            {showRaw ? "Hide raw JSON" : "Show raw JSON"}
          </button>
          {showRaw && parsed && (
            <pre className="mt-1 p-2 bg-gray-50 rounded text-xs text-gray-600 overflow-x-auto max-h-48">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
