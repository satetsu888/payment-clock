import { useAccounts } from "../hooks/useAccounts";
import { selectAccount } from "../lib/api";
import { useAccountContext } from "../contexts/AccountContext";
import { ApiKeyInput } from "./ApiKeyInput";
import { AccountList } from "./AccountList";

export function AccountSelectScreen() {
  const { accounts, loading, error, addAccount, removeAccount } =
    useAccounts();
  const { setSelectedAccount } = useAccountContext();

  const handleSelect = async (accountId: string) => {
    const account = await selectAccount(accountId);
    setSelectedAccount(account);
  };

  const handleAddAccount = async (apiKey: string) => {
    const account = await addAccount(apiKey);
    setSelectedAccount(account);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Payment Clock</h1>
          <p className="mt-1 text-sm text-gray-500">
            Stripe Test Clock Manager
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 space-y-6">
          {loading && (
            <p className="text-sm text-gray-500 text-center">Loading...</p>
          )}
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          {!loading && (
            <>
              <AccountList
                accounts={accounts}
                onSelect={handleSelect}
                onDelete={removeAccount}
              />

              {accounts.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-500 mb-3">
                    Or add another account
                  </p>
                </div>
              )}

              <ApiKeyInput onSubmit={handleAddAccount} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
