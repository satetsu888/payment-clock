import type { ReactNode, ButtonHTMLAttributes } from "react";

type DialogSize = "sm" | "md" | "lg";

const sizeClasses: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

interface DialogRootProps {
  children: ReactNode;
  onClose?: () => void;
  size?: DialogSize;
}

function DialogRoot({ children, onClose, size = "sm" }: DialogRootProps) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-dialog-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`bg-white rounded-xl shadow-xl ring-1 ring-black/5 w-full ${sizeClasses[size]} animate-dialog-content`}
      >
        {children}
      </div>
    </div>
  );
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

function Header({ title, subtitle, children }: HeaderProps) {
  return (
    <div className="px-5 py-4 border-b border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

interface ContentProps {
  children: ReactNode;
  scrollable?: boolean;
  compact?: boolean;
}

function Content({ children, scrollable = false, compact = false }: ContentProps) {
  return (
    <div
      className={`px-5 py-4 ${compact ? "space-y-3" : "space-y-4"} ${scrollable ? "max-h-[60vh] overflow-y-auto" : ""}`}
    >
      {children}
    </div>
  );
}

interface FooterProps {
  children: ReactNode;
}

function Footer({ children }: FooterProps) {
  return (
    <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 rounded-b-xl flex justify-end gap-2">
      {children}
    </div>
  );
}

type ButtonVariant = "primary" | "danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm",
  danger:
    "text-white bg-red-600 hover:bg-red-700 shadow-sm",
};

type ButtonSize = "default" | "compact";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingText?: string;
  size?: ButtonSize;
}

const buttonSizeClasses: Record<ButtonSize, string> = {
  default: "px-4 py-2 text-sm",
  compact: "px-3 py-1.5 text-xs",
};

function ActionButton({
  variant = "primary",
  loading = false,
  loadingText,
  size = "default",
  children,
  disabled,
  ...props
}: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`${buttonSizeClasses[size]} font-medium rounded-lg disabled:opacity-50 transition-colors ${variantClasses[variant]}`}
      {...props}
    >
      {loading && loadingText ? loadingText : children}
    </button>
  );
}

interface CancelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
}

function CancelButton({ size = "default", ...props }: CancelButtonProps) {
  return (
    <button
      type="button"
      className={`${buttonSizeClasses[size]} text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors`}
      {...props}
    >
      {props.children ?? "Cancel"}
    </button>
  );
}

export const Dialog = Object.assign(DialogRoot, {
  Header,
  Content,
  Footer,
  ActionButton,
  CancelButton,
});
