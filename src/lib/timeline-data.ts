import type { Operation, TestClockResources } from "./types";
import {
  subscriptionCurrentPeriodStart,
  subscriptionCurrentPeriodEnd,
} from "./stripe-compat";

// --- Types ---

export interface TimelineMarker {
  date: Date;
  type: "start" | "advance" | "current" | "billed" | "paid";
  tooltip: string;
}

export interface TimelinePeriodBar {
  start: Date;
  end: Date;
  status: string;
}

export interface TimelineLane {
  id: string;
  label: string;
  periodBar: TimelinePeriodBar | null;
  markers: TimelineMarker[];
}

/** Marker types that should show a date label (not just tooltip). */
export function isLabelWorthy(marker: TimelineMarker): boolean {
  return marker.type !== "start" && marker.type !== "advance";
}

interface BillingEvent {
  date: Date;
  type: "billed" | "paid";
  subscriptionId: string | null;
}

interface SubscriptionPeriod {
  subscriptionId: string;
  start: Date;
  end: Date;
  status: string;
}

// --- Data extraction ---

function parseAdvanceTimestamps(operations: Operation[]): Date[] {
  const timestamps: Date[] = [];
  for (const op of operations) {
    if (op.operationType === "advance_time" && op.requestParams) {
      try {
        const params = JSON.parse(op.requestParams);
        if (params.frozen_time) {
          timestamps.push(new Date(params.frozen_time * 1000));
        }
      } catch {
        // ignore
      }
    }
  }
  timestamps.sort((a, b) => a.getTime() - b.getTime());
  return timestamps;
}

export function getClockCreatedTime(operations: Operation[]): Date | null {
  for (const op of operations) {
    if (op.operationType === "create_clock") {
      return new Date(op.createdAt);
    }
  }
  return null;
}

/** Extract subscription ID from invoice data.
 *  - Legacy API: `invoice.subscription` (string)
 *  - API v2025-03-31.basil+: `invoice.parent.subscription_details.subscription` */
function getInvoiceSubscriptionId(
  data: Record<string, unknown>,
): string | null {
  // Legacy: top-level subscription field
  const sub = data.subscription;
  if (typeof sub === "string") return sub;
  if (
    typeof sub === "object" &&
    sub !== null &&
    "id" in (sub as Record<string, unknown>)
  ) {
    return String((sub as Record<string, unknown>).id);
  }
  // v2025-03-31.basil+: parent.subscription_details.subscription
  const parent = data.parent as Record<string, unknown> | undefined;
  const subDetails = parent?.subscription_details as
    | Record<string, unknown>
    | undefined;
  const parentSub = subDetails?.subscription;
  if (typeof parentSub === "string") return parentSub;
  return null;
}

function extractBillingEvents(
  resources: TestClockResources | null,
): BillingEvent[] {
  if (!resources) return [];
  const events: BillingEvent[] = [];
  for (const inv of resources.invoices) {
    const subscriptionId = getInvoiceSubscriptionId(inv.data);
    const created = inv.data.created as number | undefined;
    if (created) {
      events.push({
        date: new Date(created * 1000),
        type: "billed",
        subscriptionId,
      });
    }
    const transitions = inv.data.status_transitions as
      | Record<string, unknown>
      | undefined;
    const paidAt = transitions?.paid_at as number | null | undefined;
    if (paidAt) {
      events.push({
        date: new Date(paidAt * 1000),
        type: "paid",
        subscriptionId,
      });
    }
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}

function extractSubscriptionPeriods(
  resources: TestClockResources | null,
  apiVersion: string,
): SubscriptionPeriod[] {
  if (!resources) return [];
  const periods: SubscriptionPeriod[] = [];
  for (const sub of resources.subscriptions) {
    const status = sub.data.status as string;
    if (status === "canceled" || status === "incomplete_expired") continue;
    const start = subscriptionCurrentPeriodStart(sub.data, apiVersion);
    const end = subscriptionCurrentPeriodEnd(sub.data, apiVersion);
    if (start && end) {
      periods.push({
        subscriptionId: sub.stripeId,
        start: new Date(start * 1000),
        end: new Date(end * 1000),
        status,
      });
    }
  }
  return periods;
}

// --- Lane building ---

function getSubscriptionLabel(
  subscriptionId: string,
  resources: TestClockResources,
): string {
  const sub = resources.subscriptions.find(
    (s) => s.stripeId === subscriptionId,
  );
  if (sub) {
    const metadata = sub.data.metadata as Record<string, string> | undefined;
    if (metadata?.payment_clock_label) return metadata.payment_clock_label;
  }
  return subscriptionId;
}

function billingMarkersForSubscription(
  billingEvents: BillingEvent[],
  subscriptionId: string | null,
): TimelineMarker[] {
  return billingEvents
    .filter((ev) => ev.subscriptionId === subscriptionId)
    .map((ev) => ({
      date: ev.date,
      type: ev.type as "billed" | "paid",
      tooltip: `${ev.type === "billed" ? "Billed" : "Paid"}: ${formatDateLabel(ev.date)}`,
    }));
}

export function buildTimelineLanes(
  operations: Operation[],
  resources: TestClockResources | null,
  apiVersion: string,
  currentTime: Date,
): TimelineLane[] {
  const advanceTimestamps = parseAdvanceTimestamps(operations);
  const createdTime = getClockCreatedTime(operations);
  const billingEvents = extractBillingEvents(resources);
  const subscriptionPeriods = extractSubscriptionPeriods(resources, apiVersion);

  // Advance points (exclude the one matching creation time)
  const advancePoints = advanceTimestamps.filter(
    (t) => !createdTime || t.getTime() !== createdTime.getTime(),
  );

  // Time-related markers: start, advances, current
  const timeMarkers: TimelineMarker[] = [];
  if (createdTime) {
    timeMarkers.push({
      date: createdTime,
      type: "start",
      tooltip: `Start: ${formatDateLabel(createdTime)}`,
    });
  }
  for (const point of advancePoints) {
    timeMarkers.push({
      date: point,
      type: "advance",
      tooltip: `Advanced to: ${formatDateLabel(point)}`,
    });
  }
  const currentMarker: TimelineMarker = {
    date: currentTime,
    type: "current",
    tooltip: `Now: ${formatDateLabel(currentTime)}`,
  };

  // Billing events not tied to any subscription
  const unlinkedBilling = billingMarkersForSubscription(billingEvents, null);

  // 0 subscriptions → single time lane
  if (subscriptionPeriods.length === 0) {
    return [
      {
        id: "time",
        label: "",
        periodBar: null,
        markers: [...timeMarkers, currentMarker, ...unlinkedBilling],
      },
    ];
  }

  // 1+ subscriptions → time lane + subscription lanes
  const lanes: TimelineLane[] = [];

  lanes.push({
    id: "time",
    label: "",
    periodBar: null,
    markers: [...timeMarkers, currentMarker, ...unlinkedBilling],
  });

  for (const period of subscriptionPeriods) {
    const subBilling = billingMarkersForSubscription(
      billingEvents,
      period.subscriptionId,
    );
    lanes.push({
      id: period.subscriptionId,
      label: resources
        ? getSubscriptionLabel(period.subscriptionId, resources)
        : "",
      periodBar: {
        start: period.start,
        end: period.end,
        status: period.status,
      },
      markers: subBilling,
    });
  }

  return lanes;
}

// --- Shared utilities ---

export function getMonthBoundaries(start: Date, end: Date): Date[] {
  const boundaries: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  while (cursor.getTime() <= end.getTime()) {
    boundaries.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return boundaries;
}

export function formatDateLabel(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatMonthShort(date: Date): string {
  return MONTH_ABBR[date.getMonth()];
}

/** Assign vertical rows to labels so nearby ones don't overlap.
 *  Earlier dates get row 0 (closest to track), later ones shift down. */
export function assignLabelRows(
  labels: { date: Date; x: number }[],
): { date: Date; x: number; row: number }[] {
  const sorted = [...labels].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const rowExtents: number[] = [];
  return sorted.map((label) => {
    const halfWidth = formatDateLabel(label.date).length * 3;
    let row = 0;
    while (row < rowExtents.length) {
      if (label.x - halfWidth >= rowExtents[row]) break;
      row++;
    }
    rowExtents[row] = label.x + halfWidth;
    return { ...label, row };
  });
}
