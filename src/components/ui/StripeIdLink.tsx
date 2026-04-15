import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink } from "lucide-react";
import { getStripeDashboardUrl } from "../../lib/stripe-urls";

interface StripeIdLinkProps {
  stripeId: string;
  className?: string;
}

export function StripeIdLink({ stripeId, className = "" }: StripeIdLinkProps) {
  const url = getStripeDashboardUrl(stripeId);

  if (!url) {
    return <span className={`font-mono ${className}`}>{stripeId}</span>;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openUrl(url);
      }}
      className={`group/link inline-flex items-center gap-0.5 font-mono hover:text-indigo-600 hover:underline cursor-pointer ${className}`}
      title="Open in Stripe Dashboard"
    >
      {stripeId}
      <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
    </button>
  );
}
