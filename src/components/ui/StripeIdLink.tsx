import { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";

interface StripeIdLinkProps {
  stripeId: string;
  className?: string;
}

export function StripeIdLink({ stripeId, className = "" }: StripeIdLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(stripeId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [stripeId],
  );

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`group/link inline-flex items-center gap-0.5 font-mono hover:text-indigo-600 cursor-pointer ${className}`}
      title="Copy ID"
    >
      {stripeId}
      {copied ? (
        <Check className="w-3 h-3 shrink-0 text-green-500" />
      ) : (
        <Copy className="w-3 h-3 shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
