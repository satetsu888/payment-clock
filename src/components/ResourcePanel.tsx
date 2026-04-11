import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchTestClockResources,
  createCustomer,
  attachPaymentMethod,
  setDefaultPaymentMethod,
  detachPaymentMethod,
  createSubscription,
} from "../lib/api";
import type { TestClockResources, CreateSubscriptionOptions } from "../lib/types";
import { useAccountContext } from "../contexts/AccountContext";
import { CustomerResourceCard } from "./CustomerResourceCard";
import { CreateCustomerDialog } from "./CreateCustomerDialog";
import { CreateSubscriptionDialog } from "./CreateSubscriptionDialog";
import { ErrorBanner } from "./ErrorBanner";
import { groupResourcesByCustomer } from "../lib/resource-grouping";

export interface CustomerInfo {
  id: string;
}

interface ResourcePanelProps {
  testClockId: string;
  isDeleted: boolean;
  frozenTime: string;
  onCustomersLoaded?: (customers: CustomerInfo[]) => void;
}

export function ResourcePanel({ testClockId, isDeleted, frozenTime, onCustomersLoaded }: ResourcePanelProps) {
  const { selectedAccount } = useAccountContext();
  const [resources, setResources] = useState<TestClockResources | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [showCreateSubscription, setShowCreateSubscription] = useState(false);

  const accountId = selectedAccount!.id;

  const loadResources = useCallback(async () => {
    if (isDeleted) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTestClockResources(accountId, testClockId);
      setResources(result);
      onCustomersLoaded?.(result.customers.map((c) => ({
        id: c.stripeId,
      })));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [accountId, testClockId, isDeleted]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const handleCreateCustomer = async (name?: string, email?: string) => {
    await createCustomer(accountId, testClockId, name, email);
    await loadResources();
  };

  const handleAttachPaymentMethod = async (
    customerId: string,
    paymentMethodId: string,
  ) => {
    await attachPaymentMethod(accountId, testClockId, customerId, paymentMethodId);
    await loadResources();
  };

  const handleSetDefaultPaymentMethod = async (
    customerId: string,
    paymentMethodId: string,
  ) => {
    await setDefaultPaymentMethod(accountId, testClockId, customerId, paymentMethodId);
    await loadResources();
  };

  const handleDetachPaymentMethod = async (
    customerId: string,
    paymentMethodId: string,
  ) => {
    await detachPaymentMethod(accountId, testClockId, customerId, paymentMethodId);
    await loadResources();
  };

  const handleCreateSubscription = async (
    customerId: string,
    priceId: string,
    options?: CreateSubscriptionOptions,
  ) => {
    await createSubscription(accountId, testClockId, customerId, priceId, options);
    await loadResources();
  };

  const customerGroups = useMemo(() => {
    if (!resources) return [];
    return groupResourcesByCustomer(resources);
  }, [resources]);

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
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-700">Resources</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateCustomer(true)}
            className="px-2 py-1 text-xs text-indigo-600 border border-indigo-300 rounded hover:bg-indigo-50"
          >
            + Customer
          </button>
          {resources && resources.customers.length > 0 && (
            <button
              onClick={() => setShowCreateSubscription(true)}
              className="px-2 py-1 text-xs text-indigo-600 border border-indigo-300 rounded hover:bg-indigo-50"
            >
              + Subscription
            </button>
          )}
          <button
            onClick={loadResources}
            className="px-2 py-1 text-xs text-gray-500 border border-gray-300 rounded hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading && (
        <p className="text-xs text-gray-500 text-center py-2">
          Loading resources...
        </p>
      )}
      {error && (
        <ErrorBanner
          message={error}
          onRetry={loadResources}
          onDismiss={() => setError(null)}
        />
      )}

      {resources && customerGroups.length === 0 && (
        <p className="text-xs text-gray-400 py-2">No customers</p>
      )}

      {customerGroups.map((group) => (
        <CustomerResourceCard
          key={group.customer.stripeId}
          group={group}
          accountId={accountId}
          defaultExpanded={customerGroups.length === 1}
          onAttachPaymentMethod={handleAttachPaymentMethod}
          onSetDefaultPaymentMethod={handleSetDefaultPaymentMethod}
          onDetachPaymentMethod={handleDetachPaymentMethod}
        />
      ))}

      {showCreateCustomer && (
        <CreateCustomerDialog
          onSubmit={handleCreateCustomer}
          onClose={() => setShowCreateCustomer(false)}
          customerCount={resources?.customers.length ?? 0}
        />
      )}
      {showCreateSubscription && resources && (
        <CreateSubscriptionDialog
          accountId={accountId}
          customers={resources.customers}
          frozenTime={frozenTime}
          onSubmit={handleCreateSubscription}
          onClose={() => setShowCreateSubscription(false)}
        />
      )}
    </div>
  );
}
