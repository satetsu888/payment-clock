import { useState } from "react";
import { useAccountContext } from "../contexts/AccountContext";
import { useTestClocks } from "../hooks/useTestClocks";
import { TestClockCard } from "./TestClockCard";
import { CreateTestClockDialog } from "./CreateTestClockDialog";
import { ConfirmDialog } from "./ConfirmDialog";

interface DashboardScreenProps {
  onSelectTestClock: (clockId: string) => void;
}

export function DashboardScreen({ onSelectTestClock }: DashboardScreenProps) {
  const { selectedAccount, setSelectedAccount } = useAccountContext();
  const { testClocks, loading, error, refresh, create, remove, purge } =
    useTestClocks(selectedAccount!.id);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{
    type: "delete" | "purge";
    testClockId: string;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleCreate = async (frozenTime: number, name?: string) => {
    await create(frozenTime, name);
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      if (confirmTarget.type === "delete") {
        await remove(confirmTarget.testClockId);
      } else {
        await purge(confirmTarget.testClockId);
      }
    } finally {
      setConfirmLoading(false);
      setConfirmTarget(null);
    }
  };

  const activeClocks = testClocks.filter((c) => !c.deletedAt);
  const deletedClocks = testClocks.filter((c) => c.deletedAt);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold text-gray-900">
                  {selectedAccount?.displayName || selectedAccount?.stripeAccountId}
                </span>
                {selectedAccount?.stripeApiVersion && (
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    API {selectedAccount.stripeApiVersion}
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {selectedAccount?.stripeAccountId}
              </span>
            </div>
            <button
              onClick={() => setSelectedAccount(null)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 self-center"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Switch
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4.05 11A8 8 0 0118.36 5.64L20 4M19.95 13A8 8 0 015.64 18.36L4 20" />
              </svg>
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              + New Clock
            </button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto">

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
              onDelete={(id) => setConfirmTarget({ type: "delete", testClockId: id })}
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
                  onPurge={(id) => setConfirmTarget({ type: "purge", testClockId: id })}
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

      {confirmTarget && (
        <ConfirmDialog
          title={confirmTarget.type === "delete" ? "Delete Test Clock" : "Purge Local Data"}
          message={
            confirmTarget.type === "delete"
              ? "This test clock will be deleted from Stripe. This action cannot be undone."
              : "All local data (operations, events, snapshots) for this test clock will be permanently removed."
          }
          confirmLabel={confirmTarget.type === "delete" ? "Delete" : "Purge"}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmTarget(null)}
          loading={confirmLoading}
        />
      )}
    </div>
  );
}
