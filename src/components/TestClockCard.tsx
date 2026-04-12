import { useState, useRef, useEffect } from "react";
import type { TestClock } from "../lib/types";
import { formatDateTime } from "../lib/format";

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

function DropdownMenu({
  items,
  onClose,
}: {
  items: { label: string; onClick: () => void; danger?: boolean }[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-10"
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
            item.danger ? "text-red-600" : "text-gray-700"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function TestClockCard({
  clock,
  onSelect,
  onDelete,
  onPurge,
}: TestClockCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isDeleted = !!clock.deletedAt;

  const menuItems: { label: string; onClick: () => void; danger?: boolean }[] =
    [];

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
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-900">
          {clock.name || clock.stripeTestClockId}
        </span>
        <div className="flex items-center gap-2">
          {statusBadge(clock.status, clock.deletedAt)}
          {menuItems.length > 0 && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="10" cy="4" r="1.5" />
                  <circle cx="10" cy="10" r="1.5" />
                  <circle cx="10" cy="16" r="1.5" />
                </svg>
              </button>
              {menuOpen && (
                <DropdownMenu
                  items={menuItems}
                  onClose={() => setMenuOpen(false)}
                />
              )}
            </div>
          )}
        </div>
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
