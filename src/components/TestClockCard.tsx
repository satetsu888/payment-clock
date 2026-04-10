import type { TestClock } from "../lib/types";

interface TestClockCardProps {
  clock: TestClock;
  onSelect: (clockId: string) => void;
}

function formatFrozenTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}

function statusBadge(status: string, deletedAt: string | null) {
  if (deletedAt) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
        deleted
      </span>
    );
  }
  const colors: Record<string, string> = {
    ready: "bg-green-100 text-green-700",
    advancing: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span
      className={`px-2 py-0.5 text-xs rounded-full ${colors[status] || "bg-gray-100 text-gray-600"}`}
    >
      {status}
    </span>
  );
}

export function TestClockCard({ clock, onSelect }: TestClockCardProps) {
  return (
    <button
      onClick={() => onSelect(clock.id)}
      className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-md hover:border-indigo-300 transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-900">
          {clock.name || clock.stripeTestClockId}
        </span>
        {statusBadge(clock.status, clock.deletedAt)}
      </div>
      <div className="text-xs text-gray-500">
        Frozen: {formatFrozenTime(clock.frozenTime)}
      </div>
      {clock.name && (
        <div className="text-xs text-gray-400 font-mono mt-0.5">
          {clock.stripeTestClockId}
        </div>
      )}
    </button>
  );
}
