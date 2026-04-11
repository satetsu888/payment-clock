import { useEffect, useState } from "react";
import type {
  CustomerWithResources,
  CreateSubscriptionOptions,
} from "../lib/types";
import { useAccountContext } from "../contexts/AccountContext";
import { CreateCustomerDialog } from "./CreateCustomerDialog";
import { CustomerTabContent } from "./CustomerTabContent";
import { ErrorBanner } from "./ErrorBanner";

interface CustomerTabsProps {
  customerGroups: CustomerWithResources[];
  customerCount: number;
  loading: boolean;
  error: string | null;
  isDeleted: boolean;
  frozenTime: string;
  onCreateCustomer: (name?: string, email?: string) => Promise<void>;
  onAttachPaymentMethod: (customerId: string, paymentMethodId: string) => Promise<void>;
  onSetDefaultPaymentMethod: (customerId: string, paymentMethodId: string) => Promise<void>;
  onDetachPaymentMethod: (customerId: string, paymentMethodId: string) => Promise<void>;
  onCreateSubscription: (customerId: string, priceId: string, options?: CreateSubscriptionOptions) => Promise<void>;
  onReload: () => void;
  onClearError: () => void;
}

export function CustomerTabs({
  customerGroups,
  customerCount,
  loading,
  error,
  isDeleted,
  frozenTime,
  onCreateCustomer,
  onAttachPaymentMethod,
  onSetDefaultPaymentMethod,
  onDetachPaymentMethod,
  onCreateSubscription,
  onReload,
  onClearError,
}: CustomerTabsProps) {
  const { selectedAccount } = useAccountContext();
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const accountId = selectedAccount!.id;

  // Keep active tab in bounds
  useEffect(() => {
    if (activeTabIndex >= customerGroups.length && customerGroups.length > 0) {
      setActiveTabIndex(customerGroups.length - 1);
    }
  }, [customerGroups.length, activeTabIndex]);

  const handleCreateCustomer = async (name?: string, email?: string) => {
    await onCreateCustomer(name, email);
    setActiveTabIndex(customerGroups.length); // will be the new last index
  };

  if (isDeleted) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-400 text-center">
          Resources unavailable for deleted test clocks
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {customerGroups.map((group, index) => {
          const isActive = index === activeTabIndex;
          const name = String(group.customer.data.name || "Unnamed");
          return (
            <button
              key={group.customer.stripeId}
              onClick={() => setActiveTabIndex(index)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-indigo-600 text-indigo-600 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {name}
            </button>
          );
        })}
        <button
          onClick={() => setShowCreateCustomer(true)}
          className="px-3 py-2 text-sm text-gray-400 hover:text-indigo-600 hover:bg-gray-100 transition-colors border-b-2 border-transparent"
          title="Add Customer"
        >
          +
        </button>
        <div className="ml-auto flex items-center pr-2">
          <button
            onClick={onReload}
            disabled={loading}
            className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Refresh resources"
          >
            {loading ? "..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4">
        {error && (
          <ErrorBanner
            message={error}
            onRetry={onReload}
            onDismiss={onClearError}
          />
        )}

        {loading && customerGroups.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">
            Loading resources...
          </p>
        )}

        {customerGroups.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400 mb-2">No customers yet</p>
            <p className="text-xs text-gray-400">
              Click the + tab to create a customer and start simulating
            </p>
          </div>
        )}

        {customerGroups.length > 0 &&
          activeTabIndex < customerGroups.length && (
            <CustomerTabContent
              key={customerGroups[activeTabIndex].customer.stripeId}
              group={customerGroups[activeTabIndex]}
              accountId={accountId}
              frozenTime={frozenTime}
              totalSubscriptionCount={customerGroups.reduce((sum, g) => sum + g.subscriptions.length, 0)}
              onAttachPaymentMethod={onAttachPaymentMethod}
              onSetDefaultPaymentMethod={onSetDefaultPaymentMethod}
              onDetachPaymentMethod={onDetachPaymentMethod}
              onCreateSubscription={onCreateSubscription}
            />
          )}
      </div>

      {showCreateCustomer && (
        <CreateCustomerDialog
          onSubmit={handleCreateCustomer}
          onClose={() => setShowCreateCustomer(false)}
          customerCount={customerCount}
        />
      )}
    </div>
  );
}
