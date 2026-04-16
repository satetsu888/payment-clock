import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { EllipsisVertical } from "lucide-react";

export interface DropdownMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  buttonClassName?: string;
}

const MENU_WIDTH = 160; // w-40
const GAP = 4;

export function DropdownMenu({ items, buttonClassName }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Calculate position based on trigger element
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    const top = rect.bottom + GAP;
    setPosition({ top, left });
  };

  // Adjust position if menu overflows viewport bottom (flip upward)
  useLayoutEffect(() => {
    if (!open || !menuRef.current || !triggerRef.current) return;
    const menuRect = menuRef.current.getBoundingClientRect();
    if (menuRect.bottom > window.innerHeight) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      setPosition((prev) => ({
        ...prev,
        top: triggerRect.top - menuRect.height - GAP,
      }));
    }
  }, [open]);

  // Click-outside detection (check both trigger and menu)
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        menuRef.current && !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on scroll or resize
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          if (!open) updatePosition();
          setOpen(!open);
        }}
        className={
          buttonClassName ??
          "p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
        }
      >
        <EllipsisVertical className="w-4 h-4" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50"
            style={{ top: position.top, left: position.left }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!item.disabled) {
                    item.onClick();
                    setOpen(false);
                  }
                }}
                disabled={item.disabled}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50 ${
                  item.danger ? "text-red-600" : "text-gray-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
