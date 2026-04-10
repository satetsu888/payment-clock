import { useAccountContext } from "../contexts/AccountContext";

export function DashboardShell() {
  const { selectedAccount, setSelectedAccount } = useAccountContext();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Payment Clock
          </h1>
          <p className="text-xs text-gray-500 font-mono">
            {selectedAccount?.displayName || selectedAccount?.stripeAccountId}
          </p>
        </div>
        <button
          onClick={() => setSelectedAccount(null)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Switch Account
        </button>
      </header>
      <main className="p-6">
        <div className="text-center py-16">
          <p className="text-gray-400 text-sm">
            Test Clock management coming in Phase 2
          </p>
        </div>
      </main>
    </div>
  );
}
