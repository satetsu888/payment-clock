interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  const isNetworkError =
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("connection");

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
      <span className="flex-1">
        {isNetworkError
          ? "Network error. Check your connection and try again."
          : message}
      </span>
      <div className="flex gap-1 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
