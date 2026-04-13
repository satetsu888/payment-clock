import { useState } from "react";
import { ArrowLeftRight, RefreshCw } from "lucide-react";
import { useAccountContext } from "../contexts/AccountContext";
import { useTestClocks } from "../hooks/useTestClocks";
import { createCustomer as apiCreateCustomer, attachPaymentMethod } from "../lib/api";
import type { TestClock } from "../lib/types";
import { TestClockCard } from "./TestClockCard";
import { CreateTestClockDialog } from "./CreateTestClockDialog";
import { ConfirmDialog } from "./ConfirmDialog";

interface DashboardScreenProps {
  onSelectTestClock: (clock: TestClock) => void;
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

  const handleCreate = async (
    frozenTime: number,
    name?: string,
    options?: { createCustomer: boolean; customerName?: string; paymentMethodIds: string[] },
  ) => {
    const clock = await create(frozenTime, name);

    if (options?.createCustomer) {
      const customerName = options.customerName;
      const metadata = customerName ? { payment_clock_label: customerName } : undefined;
      const customer = await apiCreateCustomer(selectedAccount!.id, clock.id, customerName, undefined, metadata);
      const customerId = (customer as { id: string }).id;

      for (const pmId of options.paymentMethodIds) {
        await attachPaymentMethod(
          selectedAccount!.id,
          clock.id,
          customerId,
          pmId,
        );
      }
    }

    onSelectTestClock(clock);
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
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 pl-4 pr-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold text-gray-900">
                {selectedAccount?.displayName || selectedAccount?.stripeAccountId}
              </span>
              <button
                onClick={() => setSelectedAccount(null)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600"
              >
                <ArrowLeftRight className="w-3 h-3" />
                Switch Account
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
              <span>{selectedAccount?.stripeAccountId}</span>
              {selectedAccount?.stripeApiVersion && (
                <>
                  <span className="text-gray-300">·</span>
                  <span>API {selectedAccount.stripeApiVersion}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
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

      <main className="p-6 max-w-4xl mx-auto">

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
              onSelect={() => { onSelectTestClock(clock); }}
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
                  onSelect={() => { onSelectTestClock(clock); }}
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
