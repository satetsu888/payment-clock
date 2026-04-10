import { useState } from "react";
import { useAccountContext } from "../contexts/AccountContext";
import { useTestClocks } from "../hooks/useTestClocks";
import { TestClockCard } from "./TestClockCard";
import { CreateTestClockDialog } from "./CreateTestClockDialog";

interface DashboardScreenProps {
  onSelectTestClock: (clockId: string) => void;
}

export function DashboardScreen({ onSelectTestClock }: DashboardScreenProps) {
  const { selectedAccount, setSelectedAccount } = useAccountContext();
  const { testClocks, loading, error, refresh, create } = useTestClocks(
    selectedAccount!.id,
  );
  const [showCreate, setShowCreate] = useState(false);

  const handleCreate = async (frozenTime: number, name?: string) => {
    await create(frozenTime, name);
  };

  const activeClocks = testClocks.filter((c) => !c.deletedAt);
  const deletedClocks = testClocks.filter((c) => c.deletedAt);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Payment Clock
          </h1>
          <p className="text-xs text-gray-500">
            <span className="font-mono">{selectedAccount?.displayName || selectedAccount?.stripeAccountId}</span>
            {selectedAccount?.stripeApiVersion && (
              <span className="ml-2 text-gray-400">API {selectedAccount.stripeApiVersion}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={() => setSelectedAccount(null)}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700"
          >
            Switch Account
          </button>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-700">Test Clocks</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            + Create Test Clock
          </button>
        </div>

        {loading && (
          <p className="text-sm text-gray-500 text-center py-8">Loading...</p>
        )}
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md mb-4">
            {error}
          </p>
        )}

        {!loading && activeClocks.length === 0 && !error && (
          <p className="text-sm text-gray-400 text-center py-8">
            No test clocks yet. Create one to get started.
          </p>
        )}

        <div className="space-y-2">
          {activeClocks.map((clock) => (
            <TestClockCard
              key={clock.id}
              clock={clock}
              onSelect={onSelectTestClock}
            />
          ))}
        </div>

        {deletedClocks.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xs font-medium text-gray-400 mb-2 uppercase tracking-wide">
              Deleted
            </h3>
            <div className="space-y-2 opacity-60">
              {deletedClocks.map((clock) => (
                <TestClockCard
                  key={clock.id}
                  clock={clock}
                  onSelect={onSelectTestClock}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {showCreate && (
        <CreateTestClockDialog
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
