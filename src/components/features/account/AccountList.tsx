import type { AccountSummary } from "../../../lib/types";
import { AccountCard } from "./AccountCard";

interface AccountListProps {
  accounts: AccountSummary[];
  onSelect: (accountId: string) => void;
  onDelete: (accountId: string) => void;
}

export function AccountList({ accounts, onSelect, onDelete }: AccountListProps) {
  if (accounts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-900">Saved Accounts</h2>
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
