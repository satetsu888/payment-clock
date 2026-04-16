import type { AccountSummary } from "../../../lib/types";

interface AccountCardProps {
  account: AccountSummary;
  onSelect: (accountId: string) => void;
  onDelete: (accountId: string) => void;
}

export function AccountCard({ account, onSelect, onDelete }: AccountCardProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-md hover:border-indigo-300 transition-colors">
      <button
        onClick={() => onSelect(account.id)}
        className="flex-1 text-left"
      >
        <div className="text-sm font-medium text-gray-900">
          {account.displayName || "Unnamed Account"}
        </div>
        <div className="text-xs text-gray-500">
          <span className="font-mono">{account.stripeAccountId}</span>
        </div>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(account.id);
        }}
        className="ml-3 text-xs text-gray-400 hover:text-red-500 transition-colors"
        title="Remove account"
      >
        Remove
      </button>
    </div>
  );
}
