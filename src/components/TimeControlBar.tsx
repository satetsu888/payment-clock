import { useEffect, useRef, useState } from "react";
import type { Operation, TestClockResources } from "../lib/types";

interface TimeControlBarProps {
  frozenTime: string;
  status: string;
  operations: Operation[];
  resources: TestClockResources | null;
  isDeleted: boolean;
  onAdvance: () => void;
  onRefresh: () => void;
}

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

function getClockCreatedTime(operations: Operation[]): Date | null {
  for (const op of operations) {
    if (op.operationType === "create_clock") {
      return new Date(op.createdAt);
    }
  }
  return null;
}

interface BillingEvent {
  date: Date;
  type: "billed" | "paid";
}

function extractBillingEvents(resources: TestClockResources | null): BillingEvent[] {
  if (!resources) return [];
  const events: BillingEvent[] = [];
  for (const inv of resources.invoices) {
    const created = inv.data.created as number | undefined;
    if (created) {
      events.push({ date: new Date(created * 1000), type: "billed" });
    }
    const transitions = inv.data.status_transitions as Record<string, unknown> | undefined;
    const paidAt = transitions?.paid_at as number | null | undefined;
    if (paidAt) {
      events.push({ date: new Date(paidAt * 1000), type: "paid" });
    }
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}

/** Get the first day of each month between start (exclusive) and end (inclusive) */
function getMonthBoundaries(start: Date, end: Date): Date[] {
  const boundaries: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  while (cursor.getTime() <= end.getTime()) {
    boundaries.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return boundaries;
}

function formatDateLabel(date: Date): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}/${m}/${d}`;
}

const MS_PER_DAY = 86400000;
const THREE_MONTHS_DAYS = 90;
const FUTURE_PADDING_DAYS = 60;
const TIMELINE_PADDING_PX = 40;

export function TimeControlBar({
  frozenTime,
  status,
  operations,
  resources,
  isDeleted,
  onAdvance,
  onRefresh,
}: TimeControlBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; label: string } | null>(null);

  const currentTime = new Date(frozenTime);
  const advanceTimestamps = parseAdvanceTimestamps(operations);
  const createdTime = getClockCreatedTime(operations);
  const billingEvents = extractBillingEvents(resources);
  const isAdvancing = status === "advancing";

  // Timeline range: ensure at least start+3months and now+2months
  const startTime = createdTime ?? currentTime;
  const threeMonthsEnd = new Date(startTime.getTime() + THREE_MONTHS_DAYS * MS_PER_DAY);
  const currentPlusFuture = new Date(currentTime.getTime() + FUTURE_PADDING_DAYS * MS_PER_DAY);
  const endTime = threeMonthsEnd.getTime() > currentPlusFuture.getTime() ? threeMonthsEnd : currentPlusFuture;

  // Scale: 80% of container = 3 months
  const pxPerDay = containerWidth > 0 ? (containerWidth * 0.8) / THREE_MONTHS_DAYS : 8;
  const totalDays = (endTime.getTime() - startTime.getTime()) / MS_PER_DAY;
  const timelineWidth = Math.max(totalDays * pxPerDay, 200) + TIMELINE_PADDING_PX * 2;

  const getX = (time: Date): number => {
    return TIMELINE_PADDING_PX + ((time.getTime() - startTime.getTime()) / MS_PER_DAY) * pxPerDay;
  };

  const monthBoundaries = getMonthBoundaries(startTime, endTime);
  const advancePoints = advanceTimestamps.filter(
    (t) => !createdTime || t.getTime() !== createdTime.getTime(),
  );

  // Deduplicate billing events that fall on the same day
  const billingEventsByDay = new Map<string, BillingEvent[]>();
  for (const ev of billingEvents) {
    const key = `${ev.date.getFullYear()}-${ev.date.getMonth()}-${ev.date.getDate()}`;
    const existing = billingEventsByDay.get(key);
    if (existing) {
      if (!existing.some((e) => e.type === ev.type)) {
        existing.push(ev);
      }
    } else {
      billingEventsByDay.set(key, [ev]);
    }
  }
  const uniqueBillingDays = Array.from(billingEventsByDay.values()).map((evs) => ({
    date: evs[0].date,
    types: evs.map((e) => e.type),
  }));

  // Unified date labels: collect all dates, deduplicate by day, render one label per position
  const labelsByDay = new Map<string, { date: Date; x: number }>();
  const addLabel = (date: Date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (!labelsByDay.has(key)) {
      labelsByDay.set(key, { date, x: getX(date) });
    }
  };
  if (createdTime) addLabel(createdTime);
  for (const month of monthBoundaries) addLabel(month);
  for (const day of uniqueBillingDays) addLabel(day.date);
  addLabel(currentTime);
  const unifiedLabels = Array.from(labelsByDay.values());

  // Measure container
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    setContainerWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  // Auto-scroll to current time
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || containerWidth === 0) return;
    const currentX = getX(currentTime);
    const visibleWidth = el.clientWidth;
    el.scrollLeft = currentX - visibleWidth * 0.6;
  }, [frozenTime, containerWidth]);

  const showTooltip = (e: React.MouseEvent, label: string) => {
    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ x: e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0), label });
  };

  const hideTooltip = () => setTooltip(null);

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 pb-4 pt-3 shadow-sm">
      {/* Top row: current time + buttons */}
      <div className="flex items-center justify-between mb-4 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 uppercase tracking-wide">
            Current Time
          </span>
          <span className="text-lg font-semibold text-gray-900 font-mono">
            {currentTime.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isDeleted}
            className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Refresh
          </button>
          {!isDeleted && (
            <button
              onClick={onAdvance}
              disabled={isAdvancing}
              className="px-4 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isAdvancing ? "Advancing..." : "Advance Time"}
              {!isAdvancing && <span aria-hidden="true">&rarr;</span>}
            </button>
          )}
        </div>
      </div>

      {/* Visual Timeline */}
      <div className="flex justify-center">
        <div
          ref={scrollRef}
          className="overflow-x-auto w-full max-w-4xl"
        >
          <div
            className="relative mx-auto"
            style={{ width: `${timelineWidth}px`, height: "64px" }}
          >
            {/* Track line */}
            <div
              className="absolute top-5 h-px bg-gray-200"
              style={{ left: `${TIMELINE_PADDING_PX}px`, right: `${TIMELINE_PADDING_PX}px` }}
            />

            {/* Tooltip */}
            {tooltip && (
              <div
                className="absolute z-20 pointer-events-none"
                style={{ left: `${tooltip.x}px`, top: "0px" }}
              >
                <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap -translate-x-1/2">
                  {tooltip.label}
                </div>
              </div>
            )}

            {/* Start marker */}
            {createdTime && (
              <div
                className="absolute cursor-default"
                style={{ left: `${getX(createdTime)}px` }}
                onMouseEnter={(e) => showTooltip(e, `Start: ${formatDateLabel(createdTime)}`)}
                onMouseLeave={hideTooltip}
              >
                <div className="absolute top-4 -translate-x-1/2">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                </div>
              </div>
            )}

            {/* Month boundary tick marks */}
            {monthBoundaries.map((month) => {
              const x = getX(month);
              return (
                <div
                  key={month.toISOString()}
                  className="absolute"
                  style={{ left: `${x}px` }}
                >
                  <div className="absolute top-3.5 w-px h-3 bg-gray-300" />
                </div>
              );
            })}

            {/* Billing event markers */}
            {uniqueBillingDays.map((day, i) => {
              const x = getX(day.date);
              const hasBilled = day.types.includes("billed");
              const hasPaid = day.types.includes("paid");
              const label = [
                hasBilled ? "Billed" : null,
                hasPaid ? "Paid" : null,
              ].filter(Boolean).join(" / ");
              return (
                <div
                  key={`billing-${i}`}
                  className="absolute cursor-default"
                  style={{ left: `${x}px` }}
                  onMouseEnter={(e) => showTooltip(e, `${label}: ${formatDateLabel(day.date)}`)}
                  onMouseLeave={hideTooltip}
                >
                  <div className="absolute top-6 -translate-x-1/2">
                    <div
                      className={`w-2 h-2 rotate-45 ${
                        hasPaid ? "bg-green-500" : "bg-amber-400"
                      }`}
                    />
                  </div>
                </div>
              );
            })}

            {/* Advance points */}
            {advancePoints.map((point, i) => {
              const x = getX(point);
              return (
                <div
                  key={`adv-${i}`}
                  className="absolute cursor-default"
                  style={{ left: `${x}px` }}
                  onMouseEnter={(e) => showTooltip(e, `Advanced to: ${formatDateLabel(point)}`)}
                  onMouseLeave={hideTooltip}
                >
                  <div className="absolute top-4 -translate-x-1/2">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  </div>
                </div>
              );
            })}

            {/* Current time marker */}
            <div
              className="absolute"
              style={{ left: `${getX(currentTime)}px` }}
            >
              <div className="absolute top-3.5 -translate-x-1/2">
                <div className="w-4 h-4 rounded-full bg-white border-2 border-indigo-600 ring-2 ring-indigo-200" />
              </div>
            </div>

            {/* Unified date labels (one per day, no duplicates) */}
            {unifiedLabels.map((label) => (
              <div
                key={`label-${label.date.toISOString()}`}
                className="absolute"
                style={{ left: `${label.x}px` }}
              >
                <div className="absolute top-9 -translate-x-1/2 whitespace-nowrap">
                  <span className="text-[10px] text-gray-500">
                    {formatDateLabel(label.date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
