import { useMemo, useState } from "react";
import { useAccountContext } from "../contexts/AccountContext";
import { useTestClockDetail as useDetail } from "../hooks/useTestClockDetail";
import { useTestClockEvents } from "../hooks/useTestClockEvents";
import { useTestClockResources } from "../hooks/useTestClockResources";
import { AdvanceTimeDialog } from "./AdvanceTimeDialog";
import { UnifiedTimeline } from "./UnifiedTimeline";
import { CustomerTabs } from "./CustomerTabs";
import { TimeControlBar } from "./TimeControlBar";
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
  const accountId = selectedAccount!.id;

  // --- Hooks for test clock data ---
  const {
    detail,
    loading: detailLoading,
    error: detailError,
    reload: reloadDetail,
    refreshFromStripe,
    clearError: clearDetailError,
  } = useDetail(accountId, testClockId);

  const {
    events,
    error: eventsError,
    fetchFromStripe: fetchEventsFromStripe,
    clearError: clearEventsError,
  } = useTestClockEvents(accountId, testClockId);

  const clock = detail?.testClock ?? null;
  const operations = detail?.operations ?? [];
  const isDeleted = !!clock?.deletedAt;

  const {
    resources,
    customerGroups,
    loading: resourcesLoading,
    error: resourcesError,
    reload: reloadResources,
    clearError: clearResourcesError,
    createCustomer,
    attachPaymentMethod,
    setDefaultPaymentMethod,
    detachPaymentMethod,
    createSubscription,
  } = useTestClockResources(accountId, testClockId, isDeleted);

  // --- Local UI state ---
  const [showAdvance, setShowAdvance] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // --- Aggregate error ---
  const error = detailError || eventsError || resourcesError;
  const clearError = () => {
    clearDetailError();
    clearEventsError();
    clearResourcesError();
  };

  // --- Customer IDs for timeline filtering ---
  const customers = useMemo(
    () => (resources?.customers ?? []).map((c) => ({ id: c.stripeId })),
    [resources],
  );

  // --- Actions ---
  const handleRefresh = async () => {
    try {
      await refreshFromStripe();
      await fetchEventsFromStripe();
      await reloadResources();
    } catch (e) {
      // errors are captured by individual hooks
    }
  };

  const handleAdvance = async (clockId: string, frozenTime: number) => {
    await onAdvance(clockId, frozenTime);
    await reloadDetail();
    await reloadResources();
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    setDeleting(true);
    try {
      await onDelete(testClockId);
      onBack();
    } catch {
      setDeleting(false);
    }
  };

  // --- Loading / error states ---
  if (detailLoading && !detail) {
    return (
      <div className="p-6 text-center text-sm text-gray-500">Loading...</div>
    );
  }

  if (error && !detail) {
    return (
      <div className="p-6 text-center text-sm text-red-600">{error}</div>
    );
  }

  if (!clock) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
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
            <span className="font-mono text-xs text-gray-400">
              {clock.stripeTestClockId}
            </span>
          </div>
          {!isDeleted && (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={deleting}
              className="px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </header>

      {/* Time Control Bar */}
      <TimeControlBar
        frozenTime={clock.frozenTime}
        status={clock.status}
        operations={operations}
        resources={resources}
        isDeleted={isDeleted}
        onAdvance={() => setShowAdvance(true)}
        onRefresh={handleRefresh}
      />

      {/* Main content */}
      <main className="p-6 max-w-4xl mx-auto space-y-4">
        {error && (
          <ErrorBanner
            message={error}
            onRetry={handleRefresh}
            onDismiss={clearError}
          />
        )}

        {/* Customer Tabs */}
        <CustomerTabs
          customerGroups={customerGroups}
          customerCount={resources?.customers.length ?? 0}
          loading={resourcesLoading}
          error={resourcesError}
          isDeleted={isDeleted}
          frozenTime={clock.frozenTime}
          onCreateCustomer={createCustomer}
          onAttachPaymentMethod={attachPaymentMethod}
          onSetDefaultPaymentMethod={setDefaultPaymentMethod}
          onDetachPaymentMethod={detachPaymentMethod}
          onCreateSubscription={createSubscription}
          onReload={reloadResources}
          onClearError={clearResourcesError}
        />

        {/* Event Log */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">
            Event Log
          </h2>
          <UnifiedTimeline
            operations={operations}
            events={events}
            customers={customers}
            stripeApiVersion={selectedAccount?.stripeApiVersion ?? ""}
          />
        </div>
      </main>

      {showAdvance && (
        <AdvanceTimeDialog
          accountId={accountId}
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
