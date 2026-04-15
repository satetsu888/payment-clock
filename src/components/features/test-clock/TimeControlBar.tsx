import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play } from "lucide-react";
import type { Operation, TestClockResources } from "../../../lib/types";
import { formatShortDateTime as fmtShort } from "../../../lib/format";
import {
  buildTimelineLanes,
  getClockCreatedTime,
  getMonthBoundaries,
  formatDateLabel,
  formatMonthShort,
  assignLabelRows,
  isLabelWorthy,
  type TimelineMarker,
} from "../../../lib/timeline-data";

interface TimeControlBarProps {
  frozenTime: string;
  status: string;
  operations: Operation[];
  resources: TestClockResources | null;
  stripeApiVersion: string;
  isDeleted: boolean;
  highlightedInvoiceId?: string | null;
  onHighlightInvoice?: (id: string | null) => void;
  onAdvanceToTime: (frozenTime: number) => void;
}

const MS_PER_DAY = 86400000;
const THREE_MONTHS_DAYS = 90;
const PAST_PADDING_DAYS = 30;
const FUTURE_PADDING_DAYS = 60;
const LABEL_COLUMN_WIDTH = 110;
const TIMELINE_PADDING_PX = 40;
const NOW_CALLOUT_HEIGHT = 20;
const MONTH_AREA_HEIGHT = 24 + NOW_CALLOUT_HEIGHT;
const LANE_HEIGHT = 20;
const LANE_GAP = 8;
const LABEL_ROW_HEIGHT = 14;

// --- Marker rendering ---

function MarkerDot({
  x,
  trackY,
  marker,
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
}: {
  x: number;
  trackY: number;
  marker: TimelineMarker;
  isHighlighted?: boolean;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
}) {
  const hl = isHighlighted;
  switch (marker.type) {
    case "current":
      return (
        <div className="absolute" style={{ left: `${x}px` }}>
          <div
            className="absolute -translate-x-1/2"
            style={{ top: `${trackY - 4}px` }}
          >
            <div className="w-2 h-2 rounded-full bg-indigo-200/50 ring-1 ring-indigo-200" />
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
            style={{ top: `${trackY - (hl ? 5 : 4)}px` }}
          >
            <div className={`rotate-45 transition-all ${hl ? "w-3 h-3 bg-amber-500 ring-2 ring-amber-200" : "w-2 h-2 bg-amber-400"}`} />
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
            style={{ top: `${trackY - (hl ? 5 : 4)}px` }}
          >
            <div className={`rotate-45 transition-all ${hl ? "w-3 h-3 bg-green-600 ring-2 ring-green-200" : "w-2 h-2 bg-green-500"}`} />
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
  highlightedInvoiceId,
  onHighlightInvoice,
  onAdvanceToTime,
}: TimeControlBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    label: string;
  } | null>(null);

  // Hover / pin state for click-to-advance
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [pinned, setPinned] = useState<{ x: number; time: Date } | null>(null);
  const [advanceTargetTime, setAdvanceTargetTime] = useState<Date | null>(null);

  const currentTime = new Date(frozenTime);
  const createdTime = getClockCreatedTime(operations);
  const isAdvancing = status === "advancing";

  // Clear advance target when advancing completes
  useEffect(() => {
    if (!isAdvancing) setAdvanceTargetTime(null);
  }, [isAdvancing]);

  // Build lane data
  const lanes = useMemo(
    () =>
      buildTimelineLanes(operations, resources, stripeApiVersion, currentTime),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [operations, resources, stripeApiVersion, frozenTime],
  );

  // Timeline range
  const currentMinusPast = new Date(
    currentTime.getTime() - PAST_PADDING_DAYS * MS_PER_DAY,
  );
  const baseStart = createdTime ?? currentTime;
  const startTime =
    currentMinusPast.getTime() < baseStart.getTime()
      ? currentMinusPast
      : baseStart;
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

  // Inverse of getX: pixel position → time (truncated to minutes)
  const getTimeFromX = useCallback(
    (x: number): Date => {
      const days = (x - TIMELINE_PADDING_PX) / pxPerDay;
      const ms = startTime.getTime() + days * MS_PER_DAY;
      // Truncate to minutes
      const truncated = Math.floor(ms / 60000) * 60000;
      return new Date(truncated);
    },
    [pxPerDay, startTime],
  );

  const isAdvancingOrPending = isAdvancing || advanceTargetTime != null;
  const canInteract = !isDeleted && !isAdvancingOrPending;

  // Per-lane label computation
  const laneLabels = lanes.map((lane) => {
    const byDay = new Map<string, { date: Date; x: number }>();
    const add = (date: Date) => {
      const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
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

  // Clear pinned state when advance starts or clock becomes deleted
  useEffect(() => {
    if (!canInteract) setPinned(null);
  }, [canInteract]);

  // Escape key to unpin
  useEffect(() => {
    if (!pinned) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPinned(null);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [pinned]);

  const handleTimelineMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!canInteract) return;
      const el = scrollRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left + el.scrollLeft;
      setHoverX(x);
    },
    [canInteract],
  );

  const handleTimelineMouseLeave = useCallback(() => {
    setHoverX(null);
  }, []);

  const handleTimelineClick = useCallback(
    (e: React.MouseEvent) => {
      if (!canInteract) return;
      const el = scrollRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left + el.scrollLeft;
      const nowX = getX(currentTime);
      if (x <= nowX) {
        setPinned(null);
        return;
      }
      const time = getTimeFromX(x);
      setPinned({ x, time });
    },
    [canInteract, getX, getTimeFromX, currentTime],
  );

  const handleAdvanceClick = useCallback(() => {
    if (!pinned) return;
    const unixSeconds = Math.floor(pinned.time.getTime() / 1000);
    setAdvanceTargetTime(pinned.time);
    setPinned(null);
    onAdvanceToTime(unixSeconds);
  }, [pinned, onAdvanceToTime]);

  const formatShortDateTime = (date: Date): string => fmtShort(date);

  const showTooltip = (e: React.MouseEvent, label: string) => {
    const rect = scrollRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      x: e.clientX - rect.left + (scrollRef.current?.scrollLeft ?? 0),
      y: e.clientY - rect.top,
      label,
    });
  };
  const hideTooltip = () => setTooltip(null);

  const nowX = getX(currentTime);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Top row: advance button */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAdvanceClick}
            disabled={!canInteract || !pinned}
            className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 whitespace-nowrap"
          >
            {isAdvancingOrPending ? (
              <>
                <span className="w-3 h-3 border-2 border-indigo-300 border-t-white rounded-full animate-spin shrink-0" />
                Advancing to {formatShortDateTime(advanceTargetTime!)}...
              </>
            ) : (
              <>
                <Play className="w-3 h-3 shrink-0 fill-current" />
                {pinned ? `Advance to ${formatShortDateTime(pinned.time)}` : "Advance"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visual Timeline: fixed label column + scrollable timeline */}
      <div className="flex">
        {/* Fixed label column */}
        <div
          className="shrink-0 relative"
          style={{
            width: `${LABEL_COLUMN_WIDTH}px`,
            height: `${timelineHeight}px`,
          }}
        >
          {lanes.map((lane, laneIndex) => {
            const laneTop = laneYPositions[laneIndex];
            return lane.label ? (
              <div
                key={lane.id}
                className="absolute flex items-center"
                style={{
                  left: "4px",
                  right: "4px",
                  top: `${laneTop}px`,
                  height: `${LANE_HEIGHT}px`,
                }}
              >
                <span className="text-[9px] text-gray-400 truncate block">
                  {lane.label}
                </span>
              </div>
            ) : null;
          })}
        </div>

        {/* Scrollable timeline */}
        <div
          ref={scrollRef}
          className={`overflow-x-auto overflow-y-hidden flex-1 min-w-0${canInteract ? " cursor-crosshair" : ""}`}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={handleTimelineMouseLeave}
          onClick={handleTimelineClick}
        >
          <div
            className="relative"
            style={{
              width: `${timelineWidth}px`,
              height: `${timelineHeight}px`,
            }}
          >
            {/* Month boundary dividers */}
            {monthBoundaries.map((month) => {
              const x = getX(month);
              const showYear = month.getUTCMonth() === 0;
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
                    style={{ top: showYear ? `${NOW_CALLOUT_HEIGHT + 2}px` : `${NOW_CALLOUT_HEIGHT + 8}px` }}
                  >
                    {showYear && (
                      <div className="text-[10px] font-medium text-gray-400 leading-none">
                        {month.getUTCFullYear()}
                      </div>
                    )}
                    <div className="text-[11px] text-gray-400 leading-snug">
                      {formatMonthShort(month)}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Label row: fixed-height area at the top for Now / hover / pinned labels */}
            {/* All labels use the same flex container to vertically center-align */}

            {/* "Now" vertical line + L-shaped callout label */}
            {(() => {
              const calloutDx = 24;
              return (
                <>
                  {/* Vertical line (from middle of label row through all lanes) */}
                  <div
                    className="absolute w-px bg-indigo-300"
                    style={{
                      left: `${nowX}px`,
                      top: `${NOW_CALLOUT_HEIGHT / 2}px`,
                      height: `${lanesBottom - NOW_CALLOUT_HEIGHT / 2}px`,
                    }}
                  />
                  {/* Horizontal line (from vertical line to the left, vertically centered in label row) */}
                  <div
                    className="absolute flex items-center pointer-events-none"
                    style={{
                      left: `${nowX - calloutDx}px`,
                      top: "0px",
                      width: `${calloutDx}px`,
                      height: `${NOW_CALLOUT_HEIGHT}px`,
                    }}
                  >
                    <div className="w-full h-px bg-indigo-300" />
                  </div>
                  {/* Now label (left of horizontal line, vertically centered in label row) */}
                  <div
                    className="absolute flex items-center pointer-events-none"
                    style={{
                      right: `${timelineWidth - nowX + calloutDx + 4}px`,
                      top: "0px",
                      height: `${NOW_CALLOUT_HEIGHT}px`,
                    }}
                  >
                    <span className="whitespace-nowrap text-[10px] font-medium text-indigo-400">
                      Now: {formatShortDateTime(currentTime)}
                    </span>
                  </div>
                </>
              );
            })()}

            {/* Lanes + per-lane date labels */}
            {lanes.map((lane, laneIndex) => {
              const laneTop = laneYPositions[laneIndex];
              const ty = laneTop + LANE_HEIGHT / 2;
              const { labels } = laneLabels[laneIndex];
              const labelsTop = ty + LABEL_OFFSET_FROM_TRACK;
              return (
                <div key={lane.id}>
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
                    const pb = lane.periodBar;
                    const x1 = getX(pb.start);
                    const x2 = getX(pb.end);
                    const barWidth = x2 - x1;

                    // Color based on subscription state
                    let barClass = "bg-indigo-100 border-indigo-200";
                    let dotClass = "bg-indigo-300 ring-indigo-200";
                    let tooltipSuffix = "";
                    if (pb.isPaused) {
                      barClass = "bg-amber-100 border-amber-300 border-dashed";
                      dotClass = "bg-amber-400 ring-amber-200";
                      tooltipSuffix = " (paused)";
                    } else if (pb.cancelAtPeriodEnd) {
                      barClass = "bg-red-50 border-red-200 border-dashed";
                      dotClass = "bg-red-400 ring-red-200";
                      tooltipSuffix = " (cancels at period end)";
                    }

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
                            `Current period: ${formatDateLabel(pb.start)} – ${formatDateLabel(pb.end)}${tooltipSuffix}`,
                          )
                        }
                        onMouseLeave={hideTooltip}
                      >
                        <div className={`w-full h-full rounded-sm border ${barClass}`} />
                        {/* Period end marker */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2">
                          <div className={`w-1.5 h-1.5 rounded-full ring-1 ${dotClass}`} />
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
                      isHighlighted={!!marker.invoiceId && marker.invoiceId === highlightedInvoiceId}
                      onMouseEnter={(e) => {
                        showTooltip(e, marker.tooltip);
                        if (marker.invoiceId) onHighlightInvoice?.(marker.invoiceId);
                      }}
                      onMouseLeave={() => {
                        hideTooltip();
                        if (marker.invoiceId) onHighlightInvoice?.(null);
                      }}
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

            {/* Tooltip – follows mouse position */}
            {tooltip && (
              <div
                className="absolute z-20 pointer-events-none -translate-x-1/2"
                style={{
                  left: `${tooltip.x}px`,
                  top: `${tooltip.y - 32}px`,
                }}
              >
                <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  {tooltip.label}
                </div>
              </div>
            )}

            {/* Hover vertical line (past = gray, future = indigo) */}
            {canInteract && hoverX != null && (() => {
              const isFuture = hoverX > nowX;
              return (
                <>
                  <div
                    className={`absolute w-px pointer-events-none ${isFuture ? "bg-indigo-400/50" : "bg-gray-300/50"}`}
                    style={{
                      left: `${hoverX}px`,
                      top: `${NOW_CALLOUT_HEIGHT / 2}px`,
                      height: `${lanesBottom - NOW_CALLOUT_HEIGHT / 2}px`,
                    }}
                  />
                  {/* Hover time label – vertically centered in label row */}
                  <div
                    className="absolute flex items-center -translate-x-1/2 pointer-events-none"
                    style={{
                      left: `${hoverX}px`,
                      top: "0px",
                      height: `${NOW_CALLOUT_HEIGHT}px`,
                    }}
                  >
                    <span className={`whitespace-nowrap text-white text-[10px] px-1.5 py-0.5 rounded ${isFuture ? "bg-indigo-600" : "bg-gray-400"}`}>
                      {formatShortDateTime(getTimeFromX(hoverX))}
                    </span>
                  </div>
                </>
              );
            })()}

            {/* Pinned vertical line + time badge */}
            {canInteract && pinned && (
              <>
                <div
                  className="absolute w-px bg-indigo-500 pointer-events-none"
                  style={{
                    left: `${pinned.x}px`,
                    top: `${NOW_CALLOUT_HEIGHT / 2}px`,
                    height: `${lanesBottom - NOW_CALLOUT_HEIGHT / 2}px`,
                  }}
                />
                {/* Time badge – vertically centered in label row */}
                <div
                  className="absolute flex items-center -translate-x-1/2 pointer-events-none"
                  style={{
                    left: `${pinned.x}px`,
                    top: "0px",
                    height: `${NOW_CALLOUT_HEIGHT}px`,
                  }}
                >
                  <span className="whitespace-nowrap text-white text-[10px] px-1.5 py-0.5 rounded bg-indigo-600">
                    {formatShortDateTime(pinned.time)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
