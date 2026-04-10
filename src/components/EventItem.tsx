import { useState } from "react";
import type { StripeEvent } from "../lib/types";

interface EventItemProps {
  event: StripeEvent;
}

const eventTypeColors: Record<string, string> = {
  "customer.": "bg-blue-100 text-blue-700",
  "invoice.": "bg-purple-100 text-purple-700",
  "payment_intent.": "bg-green-100 text-green-700",
  "subscription.": "bg-orange-100 text-orange-700",
  "charge.": "bg-emerald-100 text-emerald-700",
  "test_helpers.": "bg-gray-100 text-gray-600",
};

function getEventColor(eventType: string): string {
  for (const [prefix, color] of Object.entries(eventTypeColors)) {
    if (eventType.startsWith(prefix)) return color;
  }
  return "bg-gray-100 text-gray-600";
}

export function EventItem({ event }: EventItemProps) {
  const [expanded, setExpanded] = useState(false);

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
        <pre className="mt-1 p-2 bg-gray-50 rounded text-xs text-gray-600 overflow-x-auto max-h-48">
          {JSON.stringify(JSON.parse(event.dataSnapshot), null, 2)}
        </pre>
      )}
    </div>
  );
}
