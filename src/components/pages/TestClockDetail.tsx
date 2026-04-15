import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clock, RefreshCw } from "lucide-react";
import { useAccountContext } from "../../contexts/AccountContext";
import { useTestClockDetail as useDetail } from "../../hooks/useTestClockDetail";
import { useTestClockEvents } from "../../hooks/useTestClockEvents";
import { useTestClockResources } from "../../hooks/useTestClockResources";
import { useAdvancePolling } from "../../hooks/useAdvancePolling";
import { PageHeader } from "../ui/PageHeader";
import { StripeIdLink } from "../ui/StripeIdLink";
import { UnifiedTimeline } from "../features/test-clock/UnifiedTimeline";
import { CustomerTabs } from "../features/customer/CustomerTabs";
import { TimeControlBar } from "../features/test-clock/TimeControlBar";
import { ErrorBanner } from "../ui/ErrorBanner";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { DropdownMenu } from "../ui/DropdownMenu";
import { CreateSubscriptionDialog } from "../features/subscription/CreateSubscriptionDialog";

interface TestClockDetailProps {
  initialClock: import("../../lib/types").TestClock;
  onBack: () => void;
  onAdvance: (testClockId: string, frozenTime: number) => Promise<void>;
  onDelete: (testClockId: string) => Promise<void>;
}

export function TestClockDetail({
  initialClock,
  onBack,
  onAdvance,
  onDelete,
}: TestClockDetailProps) {
  const testClockId = initialClock.id;
  const { selectedAccount } = useAccountContext();
  const accountId = selectedAccount!.id;

  // --- Hooks for test clock data ---
  const {
    detail,
    error: detailError,
    reload: reloadDetail,
    refreshFromStripe,
    clearError: clearDetailError,
  } = useDetail(accountId, testClockId);

  const {
    events,
    loading: eventsLoading,
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
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    subscriptionActions,
  } = useTestClockResources(accountId, testClockId, isDeleted);

  // --- Advance polling ---
  const onAdvanceReady = useCallback(async () => {
    await reloadDetail();
    await fetchEventsFromStripe();
    await reloadResources();
  }, [reloadDetail, fetchEventsFromStripe, reloadResources]);

  const {
    isPolling: isAdvancePolling,
    error: advanceError,
    startPolling: startAdvancePolling,
    clearError: clearAdvanceError,
  } = useAdvancePolling({ refreshFromStripe, onReady: onAdvanceReady });

  // Auto-start polling if we load a clock that is already advancing
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (clock?.status === "advancing" && !isAdvancePolling && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      startAdvancePolling();
    }
    if (clock?.status !== "advancing") {
      hasAutoStartedRef.current = false;
    }
  }, [clock?.status, isAdvancePolling, startAdvancePolling]);

  // --- Local UI state ---
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [highlightedInvoiceId, setHighlightedInvoiceId] = useState<string | null>(null);
  const [showCreateSubscription, setShowCreateSubscription] = useState(false);
  const [activeCustomerTabIndex, setActiveCustomerTabIndex] = useState(0);

  // --- Aggregate error ---
  const error = detailError || eventsError || resourcesError || advanceError;
  const clearError = () => {
    clearDetailError();
    clearEventsError();
    clearResourcesError();
    clearAdvanceError();
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

  const handleAdvanceToTime = async (frozenTime: number) => {
    await onAdvance(testClockId, frozenTime);
    await reloadDetail();
    startAdvancePolling();
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

  const initialLoading =
    !detail ||
    (resourcesLoading && !resources) ||
    (eventsLoading && events.length === 0);

  // Use fetched clock data when available, fall back to initial clock from list
  const displayClock = clock ?? initialClock;
  const displayIsDeleted = !!displayClock.deletedAt;

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        icon={<Clock className="w-5 h-5 text-gray-400 shrink-0" />}
        title={displayClock.name || displayClock.stripeTestClockId}
        titleExtra={
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${
              displayIsDeleted
                ? "bg-gray-100 text-gray-500"
                : displayClock.status === "ready"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {displayIsDeleted ? "deleted" : displayClock.status}
          </span>
        }
        subtitle={<StripeIdLink stripeId={displayClock.stripeTestClockId} className="text-gray-500" />}
        onBack={onBack}
        actions={
          <>
            <button
              onClick={handleRefresh}
              disabled={displayIsDeleted || displayClock.status === "advancing"}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reload all data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {!displayIsDeleted && (
              <DropdownMenu
                items={[
                  {
                    label: deleting ? "Deleting..." : "Delete test clock",
                    onClick: () => setConfirmDelete(true),
                    danger: true,
                    disabled: deleting,
                  },
                ]}
                buttonClassName="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
              />
            )}
          </>
        }
      />

      {/* Main content */}
      <main className="p-6 max-w-4xl mx-auto space-y-4">
        {initialLoading ? (
          error ? (
            <p className="text-sm text-red-600 text-center py-8">{error}</p>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Loading...</span>
            </div>
          )
        ) : (
          <>
            {error && (
              <ErrorBanner
                message={error}
                onRetry={handleRefresh}
                onDismiss={clearError}
              />
            )}

            {/* Time Control Bar */}
            <TimeControlBar
              frozenTime={clock!.frozenTime}
              status={clock!.status}
              operations={operations}
              resources={resources}
              stripeApiVersion={selectedAccount?.stripeApiVersion ?? ""}
              isDeleted={isDeleted}
              highlightedInvoiceId={highlightedInvoiceId}
              onHighlightInvoice={setHighlightedInvoiceId}
              onAdvanceToTime={handleAdvanceToTime}
              onAddSubscription={
                (resources?.customers.length ?? 0) > 0
                  ? () => setShowCreateSubscription(true)
                  : undefined
              }
            />

            {/* Customer Tabs */}
            <CustomerTabs
              customerGroups={customerGroups}
              customerCount={resources?.customers.length ?? 0}
              loading={resourcesLoading}
              error={resourcesError}
              isDeleted={isDeleted}
              frozenTime={clock!.frozenTime}
              activeTabIndex={activeCustomerTabIndex}
              onActiveTabChange={setActiveCustomerTabIndex}
              onCreateCustomer={createCustomer}
              onAttachPaymentMethod={attachPaymentMethod}
              onSetDefaultPaymentMethod={setDefaultPaymentMethod}
              onDetachPaymentMethod={detachPaymentMethod}
              onCreateSubscription={createSubscription}
              onCancelSubscription={cancelSubscription}
              onPauseSubscription={pauseSubscription}
              onResumeSubscription={resumeSubscription}
              subscriptionActions={subscriptionActions}
              stripeApiVersion={selectedAccount?.stripeApiVersion ?? ""}
              highlightedInvoiceId={highlightedInvoiceId}
              onHighlightInvoice={setHighlightedInvoiceId}
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
          </>
        )}
      </main>

      {showCreateSubscription && resources && (
        <CreateSubscriptionDialog
          accountId={accountId}
          customers={resources.customers}
          frozenTime={clock!.frozenTime}
          defaultLabel={`Sub ${(resources.subscriptions.length ?? 0) + 1}`}
          defaultCustomerId={customerGroups[activeCustomerTabIndex]?.customer.stripeId}
          onSubmit={createSubscription}
          onClose={() => setShowCreateSubscription(false)}
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
