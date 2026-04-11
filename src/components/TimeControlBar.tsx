import type { Operation } from "../lib/types";

interface TimeControlBarProps {
  frozenTime: string;
  status: string;
  operations: Operation[];
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

function formatTimeShort(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${m}/${d}`;
}

export function TimeControlBar({
  frozenTime,
  status,
  operations,
  isDeleted,
  onAdvance,
  onRefresh,
}: TimeControlBarProps) {
  const currentTime = new Date(frozenTime);
  const advanceTimestamps = parseAdvanceTimestamps(operations);
  const createdTime = getClockCreatedTime(operations);

  const isAdvancing = status === "advancing";

  // Build timeline points: created time + all advance target times
  const timelinePoints: Date[] = [];
  if (createdTime) {
    timelinePoints.push(createdTime);
  }
  timelinePoints.push(...advanceTimestamps);

  // Determine range for timeline
  const allTimes = [...timelinePoints, currentTime];
  const minTime = Math.min(...allTimes.map((t) => t.getTime()));
  const maxTime = Math.max(...allTimes.map((t) => t.getTime()));
  const range = maxTime - minTime;

  const getPosition = (time: Date): number => {
    if (range === 0) return 50;
    return ((time.getTime() - minTime) / range) * 100;
  };

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
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
        {timelinePoints.length > 0 && (
          <div className="relative h-8 mt-1">
            {/* Track line */}
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-gray-200 -translate-y-1/2" />

            {/* Past advance points */}
            {timelinePoints.map((point, i) => {
              const pos = getPosition(point);
              const isFirst = i === 0;
              return (
                <div
                  key={i}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
                  style={{ left: `calc(16px + ${pos}% * (100% - 32px) / 100)` }}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full border-2 ${
                      isFirst
                        ? "bg-gray-400 border-gray-400"
                        : "bg-indigo-500 border-indigo-500"
                    }`}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block">
                    <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {isFirst ? "Start: " : ""}
                      {formatTimeShort(point)}
                    </div>
                  </div>
                  {/* Label below for first and last visible points */}
                  {(isFirst || i === timelinePoints.length - 1) && timelinePoints.length > 1 && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5">
                      <span className="text-[10px] text-gray-400 whitespace-nowrap">
                        {formatTimeShort(point)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Current time marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{
                left: `calc(16px + ${getPosition(currentTime)}% * (100% - 32px) / 100)`,
              }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white border-3 border-indigo-600 ring-2 ring-indigo-200" />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5">
                <span className="text-[10px] font-medium text-indigo-600 whitespace-nowrap">
                  now
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
