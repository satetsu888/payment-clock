import { Clock } from "lucide-react";
import type { TestClock } from "../../../lib/types";
import { formatDateTime } from "../../../lib/format";
import { DropdownMenu, type DropdownMenuItem } from "../../ui/DropdownMenu";
import { StripeIdLink } from "../../ui/StripeIdLink";

interface TestClockCardProps {
  clock: TestClock;
  onSelect: (clockId: string) => void;
  onDelete?: (testClockId: string) => void;
  onPurge?: (testClockId: string) => void;
}

function formatFrozenTime(isoString: string): string {
  try {
    return formatDateTime(new Date(isoString));
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

export function TestClockCard({
  clock,
  onSelect,
  onDelete,
  onPurge,
}: TestClockCardProps) {
  const isDeleted = !!clock.deletedAt;

  const menuItems: DropdownMenuItem[] = [];

  if (isDeleted && onPurge) {
    menuItems.push({
      label: "Purge local data",
      onClick: () => onPurge(clock.id),
      danger: true,
    });
  }

  if (!isDeleted && onDelete) {
    menuItems.push({
      label: "Delete",
      onClick: () => onDelete(clock.id),
      danger: true,
    });
  }

  return (
    <button
      onClick={() => onSelect(clock.id)}
      className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-md hover:border-indigo-300 transition-colors relative"
    >
      <div className="flex items-center mb-1">
        <Clock className="w-4 h-4 text-gray-400 mr-1.5 shrink-0" />
        <span className="text-sm font-medium text-gray-900 mr-2">
          {clock.name || clock.stripeTestClockId}
        </span>
        {statusBadge(clock.status, clock.deletedAt)}
        <div className="ml-auto">
          <DropdownMenu items={menuItems} />
        </div>
      </div>
      <div className="text-xs text-gray-500">
        Frozen: {formatFrozenTime(clock.frozenTime)}
      </div>
      {clock.name && (
        <div className="text-xs text-gray-400 mt-0.5">
          <StripeIdLink stripeId={clock.stripeTestClockId} />
        </div>
      )}
    </button>
  );
}
