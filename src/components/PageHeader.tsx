import type { ReactNode } from "react";

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  titleExtra?: ReactNode;
  subtitle: ReactNode;
  onBack?: () => void;
  actions?: ReactNode;
}

export function PageHeader({
  icon,
  title,
  titleExtra,
  subtitle,
  onBack,
  actions,
}: PageHeaderProps) {
  return (
    <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              onClick={onBack}
              className="text-xl text-gray-400 hover:text-gray-700 px-1"
              aria-label="Back"
            >
              ←
            </button>
          ) : (
            <div className="text-xl px-1 invisible" aria-hidden="true">←</div>
          )}
          <div>
            <div className="flex items-center gap-2">
              {icon}
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
              {titleExtra}
            </div>
            <div className="text-xs text-gray-500 font-mono">{subtitle}</div>
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
