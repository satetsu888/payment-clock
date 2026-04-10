import { useCallback, useEffect, useState } from "react";
import {
  getTestClockDetail,
  refreshTestClock,
  fetchEvents,
  getTestClockEvents,
} from "../lib/api";
import type {
  TestClockDetail as TestClockDetailType,
  StripeEvent,
} from "../lib/types";
import { useAccountContext } from "../contexts/AccountContext";
import { AdvanceTimeDialog } from "./AdvanceTimeDialog";
import { UnifiedTimeline } from "./UnifiedTimeline";
import { ResourcePanel } from "./ResourcePanel";
import { StripeCliControl } from "./StripeCliControl";
import { ErrorBanner } from "./ErrorBanner";
import { ConfirmDialog } from "./ConfirmDialog";

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
  const [events, setEvents] = useState<StripeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdvance, setShowAdvance] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const loadEvents = useCallback(async () => {
    try {
      const evts = await getTestClockEvents(testClockId);
      setEvents(evts);
    } catch (e) {
      const msg = String(e);
      if (!msg.includes("no rows returned")) {
        setError(msg);
      }
    }
  }, [testClockId]);

  useEffect(() => {
    loadDetail();
    loadEvents();
  }, [loadDetail, loadEvents]);

  const handleFetchEvents = async () => {
    if (!selectedAccount) return;
    try {
      await fetchEvents(selectedAccount.id, testClockId);
      await loadEvents();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleRefresh = async () => {
    if (!selectedAccount) return;
    try {
      await refreshTestClock(selectedAccount.id, testClockId);
      await loadDetail();
      await handleFetchEvents();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleAdvance = async (clockId: string, frozenTime: number) => {
    await onAdvance(clockId, frozenTime);
    await loadDetail();
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
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
          <div className="ml-auto">
            {selectedAccount && (
              <StripeCliControl accountId={selectedAccount.id} />
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <span className="font-mono text-xs">{clock.stripeTestClockId}</span>
            <span className="mx-2">&middot;</span>
            Frozen: {new Date(clock.frozenTime).toLocaleString()}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleFetchEvents}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Fetch Events
            </button>
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
                  onClick={() => setConfirmDelete(true)}
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

      <main className="p-6 max-w-3xl mx-auto space-y-4">
        {error && (
          <ErrorBanner
            message={error}
            onRetry={handleRefresh}
            onDismiss={() => setError(null)}
          />
        )}

        <ResourcePanel testClockId={testClockId} isDeleted={isDeleted} />

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Timeline
          </h2>
          <UnifiedTimeline operations={operations} events={events} stripeApiVersion={selectedAccount?.stripeApiVersion ?? ""} />
        </div>
      </main>

      {showAdvance && (
        <AdvanceTimeDialog
          accountId={selectedAccount!.id}
          clock={clock}
          onSubmit={handleAdvance}
          onClose={() => setShowAdvance(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Test Clock"
          message="Are you sure you want to delete this test clock? This action cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          loading={deleting}
        />
      )}
    </div>
  );
}
