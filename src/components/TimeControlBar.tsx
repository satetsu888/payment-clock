import { useEffect, useMemo, useRef, useState } from "react";
import type { Operation, TestClockResources } from "../lib/types";
import {
  buildTimelineLanes,
  getClockCreatedTime,
  getMonthBoundaries,
  formatDateLabel,
  formatMonthShort,
  assignLabelRows,
  isLabelWorthy,
  type TimelineMarker,
} from "../lib/timeline-data";

interface TimeControlBarProps {
  frozenTime: string;
  status: string;
  operations: Operation[];
  resources: TestClockResources | null;
  stripeApiVersion: string;
  isDeleted: boolean;
  advanceElapsedSeconds?: number;
  onAdvance: () => void;
  onRefresh: () => void;
}

const MS_PER_DAY = 86400000;
const THREE_MONTHS_DAYS = 90;
const FUTURE_PADDING_DAYS = 60;
const TIMELINE_PADDING_PX = 110;
const MONTH_AREA_HEIGHT = 24;
const LANE_HEIGHT = 20;
const LANE_GAP = 8;
const LABEL_ROW_HEIGHT = 14;

// --- Marker rendering ---

function MarkerDot({
  x,
  trackY,
  marker,
  onMouseEnter,
  onMouseLeave,
}: {
  x: number;
  trackY: number;
  marker: TimelineMarker;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}) {
  switch (marker.type) {
    case "current":
      return (
        <div className="absolute" style={{ left: `${x}px` }}>
          <div
            className="absolute -translate-x-1/2"
            style={{ top: `${trackY - 6}px` }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-600 ring-2 ring-indigo-200" />
          </div>
        </div>
      );
    case "start":
      return (
        <div
          className="absolute cursor-default"
          style={{ left: `${x}px` }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div
            className="absolute -translate-x-1/2"
            style={{ top: `${trackY - 4}px` }}
          >
            <div className="w-2 h-2 rounded-full bg-gray-400" />
          </div>
        </div>
      );
    case "advance":
      return (
        <div
          className="absolute cursor-default"
          style={{ left: `${x}px` }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div
            className="absolute -translate-x-1/2"
            style={{ top: `${trackY - 4}px` }}
          >
            <div className="w-2 h-2 rounded-full bg-gray-300" />
          </div>
        </div>
      );
    case "billed":
      return (
        <div
          className="absolute cursor-default"
          style={{ left: `${x}px` }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div
            className="absolute -translate-x-1/2"
            style={{ top: `${trackY - 4}px` }}
          >
            <div className="w-2 h-2 rotate-45 bg-amber-400" />
          </div>
        </div>
      );
    case "paid":
      return (
        <div
          className="absolute cursor-default"
          style={{ left: `${x}px` }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          <div
            className="absolute -translate-x-1/2"
            style={{ top: `${trackY - 4}px` }}
          >
            <div className="w-2 h-2 rotate-45 bg-green-500" />
          </div>
        </div>
      );
  }
}

// --- Main component ---

export function TimeControlBar({
  frozenTime,
  status,
  operations,
  resources,
  stripeApiVersion,
  isDeleted,
  advanceElapsedSeconds,
  onAdvance,
  onRefresh,
}: TimeControlBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltip, setTooltip] = useState<{
    x: number;
    label: string;
  } | null>(null);

  const currentTime = new Date(frozenTime);
  const createdTime = getClockCreatedTime(operations);
  const isAdvancing = status === "advancing";

  // Build lane data
  const lanes = useMemo(
    () =>
      buildTimelineLanes(operations, resources, stripeApiVersion, currentTime),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [operations, resources, stripeApiVersion, frozenTime],
  );

  // Timeline range
  const startTime = createdTime ?? currentTime;
  const threeMonthsEnd = new Date(
    startTime.getTime() + THREE_MONTHS_DAYS * MS_PER_DAY,
  );
  const currentPlusFuture = new Date(
    currentTime.getTime() + FUTURE_PADDING_DAYS * MS_PER_DAY,
  );
  const endTime =
    threeMonthsEnd.getTime() > currentPlusFuture.getTime()
      ? threeMonthsEnd
      : currentPlusFuture;

  // Scale: 80% of container = 3 months
  const pxPerDay =
    containerWidth > 0 ? (containerWidth * 0.8) / THREE_MONTHS_DAYS : 8;
  const totalDays =
    (endTime.getTime() - startTime.getTime()) / MS_PER_DAY;
  const timelineWidth =
    Math.max(totalDays * pxPerDay, 200) + TIMELINE_PADDING_PX * 2;

  const getX = (time: Date): number => {
    return (
      TIMELINE_PADDING_PX +
      ((time.getTime() - startTime.getTime()) / MS_PER_DAY) * pxPerDay
    );
  };

  // Per-lane label computation
  const laneLabels = lanes.map((lane) => {
    const byDay = new Map<string, { date: Date; x: number }>();
    const add = (date: Date) => {
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!byDay.has(key)) byDay.set(key, { date, x: getX(date) });
    };
    for (const marker of lane.markers) {
      if (isLabelWorthy(marker)) add(marker.date);
    }
    if (lane.periodBar) add(lane.periodBar.end);
    const labels = assignLabelRows(Array.from(byDay.values()));
    const maxRow = labels.reduce((max, l) => Math.max(max, l.row), -1);
    return { labels, maxRow };
  });

  // Cumulative lane Y positions (each lane + its label area)
  // Labels start at trackCenter + 2px, so label area extends from there
  const LABEL_OFFSET_FROM_TRACK = 2;
  const laneYPositions: number[] = [];
  let cumulativeY = MONTH_AREA_HEIGHT;
  for (let i = 0; i < lanes.length; i++) {
    laneYPositions[i] = cumulativeY;
    const trackCenter = LANE_HEIGHT / 2;
    if (laneLabels[i].maxRow >= 0) {
      cumulativeY += trackCenter + LABEL_OFFSET_FROM_TRACK + (laneLabels[i].maxRow + 1) * LABEL_ROW_HEIGHT;
    } else {
      cumulativeY += LANE_HEIGHT;
    }
    cumulativeY += LANE_GAP;
  }
  const lanesBottom = cumulativeY - (lanes.length > 0 ? LANE_GAP : 0);
  const timelineHeight = lanesBottom + 4;

  // Month boundaries
  const monthBoundaries = getMonthBoundaries(startTime, endTime);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frozenTime, containerWidth]);

  const showTooltip = (e: React.MouseEvent, label: string) => {
    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0),
      label,
    });
  };
  const hideTooltip = () => setTooltip(null);

  // Whether to show "now" vertical line across all lanes (multi-lane only)
  const showNowLine = lanes.length > 1;
  const nowX = getX(currentTime);

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
            disabled={isDeleted || isAdvancing}
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
              {isAdvancing
                ? `Advancing...${advanceElapsedSeconds != null && advanceElapsedSeconds > 0 ? ` (${advanceElapsedSeconds}s)` : ""}`
                : "Advance Time"}
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
            style={{
              width: `${timelineWidth}px`,
              height: `${timelineHeight}px`,
            }}
          >
            {/* Month boundary dividers */}
            {monthBoundaries.map((month) => {
              const x = getX(month);
              const showYear = month.getMonth() === 0;
              return (
                <div
                  key={month.toISOString()}
                  className="absolute"
                  style={{ left: `${x}px` }}
                >
                  <div
                    className="absolute w-px bg-gray-200"
                    style={{ top: "0px", height: `${lanesBottom}px` }}
                  />
                  <div
                    className="absolute left-1.5 whitespace-nowrap"
                    style={{ top: showYear ? "2px" : "8px" }}
                  >
                    {showYear && (
                      <div className="text-[10px] font-medium text-gray-400 leading-none">
                        {month.getFullYear()}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-400 leading-snug">
                      {formatMonthShort(month)}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* "Now" vertical line across all lanes (multi-lane only) */}
            {showNowLine && (
              <div
                className="absolute w-px bg-indigo-300"
                style={{
                  left: `${nowX}px`,
                  top: `${MONTH_AREA_HEIGHT}px`,
                  height: `${lanesBottom - MONTH_AREA_HEIGHT}px`,
                }}
              />
            )}

            {/* Lanes + per-lane date labels */}
            {lanes.map((lane, laneIndex) => {
              const laneTop = laneYPositions[laneIndex];
              const ty = laneTop + LANE_HEIGHT / 2;
              const { labels } = laneLabels[laneIndex];
              const labelsTop = ty + LABEL_OFFSET_FROM_TRACK;
              return (
                <div key={lane.id}>
                  {/* Lane label */}
                  {lane.label && (
                    <div
                      className="absolute flex items-center z-10"
                      style={{
                        left: "4px",
                        top: `${laneTop}px`,
                        height: `${LANE_HEIGHT}px`,
                      }}
                    >
                      <span className="text-[9px] text-gray-400 truncate max-w-[100px] bg-white px-0.5">
                        {lane.label}
                      </span>
                    </div>
                  )}

                  {/* Track line */}
                  <div
                    className="absolute h-px bg-gray-200"
                    style={{
                      top: `${ty}px`,
                      left: `${TIMELINE_PADDING_PX}px`,
                      right: `${TIMELINE_PADDING_PX}px`,
                    }}
                  />

                  {/* Period bar */}
                  {lane.periodBar && (() => {
                    const x1 = getX(lane.periodBar.start);
                    const x2 = getX(lane.periodBar.end);
                    const barWidth = x2 - x1;
                    return (
                      <div
                        className="absolute cursor-default"
                        style={{
                          left: `${x1}px`,
                          width: `${barWidth}px`,
                          top: `${ty - 3}px`,
                          height: "6px",
                        }}
                        onMouseEnter={(e) =>
                          showTooltip(
                            e,
                            `Current period: ${formatDateLabel(lane.periodBar!.start)} – ${formatDateLabel(lane.periodBar!.end)}`,
                          )
                        }
                        onMouseLeave={hideTooltip}
                      >
                        <div className="w-full h-full bg-indigo-100 rounded-sm border border-indigo-200" />
                        {/* Period end marker */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 ring-1 ring-indigo-200" />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Markers */}
                  {lane.markers.map((marker, mi) => (
                    <MarkerDot
                      key={`${lane.id}-m-${mi}`}
                      marker={marker}
                      x={getX(marker.date)}
                      trackY={ty}
                      onMouseEnter={(e) => showTooltip(e, marker.tooltip)}
                      onMouseLeave={hideTooltip}
                    />
                  ))}

                  {/* Date labels for this lane */}
                  {labels.map((label) => (
                    <div
                      key={`label-${lane.id}-${label.date.toISOString()}`}
                      className="absolute"
                      style={{ left: `${label.x}px` }}
                    >
                      <div
                        className="absolute -translate-x-1/2 whitespace-nowrap"
                        style={{ top: `${labelsTop + label.row * LABEL_ROW_HEIGHT}px` }}
                      >
                        <span className="text-[10px] text-gray-500">
                          {formatDateLabel(label.date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

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
          </div>
        </div>
      </div>
    </div>
  );
}
