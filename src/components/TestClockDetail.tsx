import { useCallback, useEffect, useState } from "react";
import { getTestClockDetail, refreshTestClock } from "../lib/api";
import type { TestClockDetail as TestClockDetailType } from "../lib/types";
import { useAccountContext } from "../contexts/AccountContext";
import { AdvanceTimeDialog } from "./AdvanceTimeDialog";
import { OperationTimeline } from "./OperationTimeline";

interface TestClockDetailProps {
  testClockId: string;
  onBack: () => void;
  onAdvance: (testClockId: string, frozenTime: number) => Promise<void>;
  onDelete: (testClockId: string) => Promise<void>;
}

export function TestClockDetail({
  testClockId,
  onBack,
  onAdvance,
  onDelete,
}: TestClockDetailProps) {
  const { selectedAccount } = useAccountContext();
  const [detail, setDetail] = useState<TestClockDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdvance, setShowAdvance] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getTestClockDetail(testClockId);
      setDetail(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [testClockId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handleRefresh = async () => {
    if (!selectedAccount) return;
    try {
      await refreshTestClock(selectedAccount.id, testClockId);
      await loadDetail();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleAdvance = async (clockId: string, frozenTime: number) => {
    await onAdvance(clockId, frozenTime);
    await loadDetail();
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this test clock?")) return;
    setDeleting(true);
    try {
      await onDelete(testClockId);
      onBack();
    } catch (e) {
      setError(String(e));
      setDeleting(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">Loading...</div>
    );
  }

  if (error && !detail) {
    return (
      <div className="p-6 text-center text-sm text-red-600">{error}</div>
    );
  }

  if (!detail) return null;

  const { testClock: clock, operations } = detail;
  const isDeleted = !!clock.deletedAt;
  const isAdvancing = clock.status === "advancing";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={onBack}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {clock.name || clock.stripeTestClockId}
          </h1>
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${
              isDeleted
                ? "bg-gray-100 text-gray-500"
                : clock.status === "ready"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {isDeleted ? "deleted" : clock.status}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <span className="font-mono text-xs">{clock.stripeTestClockId}</span>
            <span className="mx-2">&middot;</span>
            Frozen: {new Date(clock.frozenTime).toLocaleString()}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Refresh
            </button>
            {!isDeleted && (
              <>
                <button
                  onClick={() => setShowAdvance(true)}
                  disabled={isAdvancing}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  Advance Time
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="p-6 max-w-3xl mx-auto">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md mb-4">
            {error}
          </p>
        )}

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Operation History
          </h2>
          <OperationTimeline operations={operations} />
        </div>
      </main>

      {showAdvance && (
        <AdvanceTimeDialog
          clock={clock}
          onSubmit={handleAdvance}
          onClose={() => setShowAdvance(false)}
        />
      )}
    </div>
  );
}
