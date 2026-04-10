import { useCallback, useEffect, useState } from "react";
import {
  fetchTestClockResources,
  createCustomer,
  attachPaymentMethod,
  setDefaultPaymentMethod,
  detachPaymentMethod,
  createSubscription,
} from "../lib/api";
import type { TestClockResources } from "../lib/types";
import { useAccountContext } from "../contexts/AccountContext";
import { CustomerSection } from "./CustomerSection";
import { SubscriptionSection } from "./SubscriptionSection";
import { InvoiceSection } from "./InvoiceSection";
import { PaymentIntentSection } from "./PaymentIntentSection";
import { CreateCustomerDialog } from "./CreateCustomerDialog";
import { CreateSubscriptionDialog } from "./CreateSubscriptionDialog";
import { ErrorBanner } from "./ErrorBanner";

interface ResourcePanelProps {
  testClockId: string;
  isDeleted: boolean;
}

export function ResourcePanel({ testClockId, isDeleted }: ResourcePanelProps) {
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
  ) => {
    await createSubscription(accountId, testClockId, customerId, priceId);
    await loadResources();
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

      {resources && (
        <>
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Customers ({resources.customers.length})
            </h3>
            <CustomerSection
              accountId={accountId}
              customers={resources.customers}
              onAttachPaymentMethod={handleAttachPaymentMethod}
              onSetDefaultPaymentMethod={handleSetDefaultPaymentMethod}
              onDetachPaymentMethod={handleDetachPaymentMethod}
            />
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Subscriptions ({resources.subscriptions.length})
            </h3>
            <SubscriptionSection subscriptions={resources.subscriptions} />
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Invoices ({resources.invoices.length})
            </h3>
            <InvoiceSection invoices={resources.invoices} />
          </div>
          <div>
            <h3 className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
              Payment Intents ({resources.paymentIntents.length})
            </h3>
            <PaymentIntentSection paymentIntents={resources.paymentIntents} />
          </div>
        </>
      )}

      {showCreateCustomer && (
        <CreateCustomerDialog
          onSubmit={handleCreateCustomer}
          onClose={() => setShowCreateCustomer(false)}
        />
      )}
      {showCreateSubscription && resources && (
        <CreateSubscriptionDialog
          accountId={accountId}
          customers={resources.customers}
          onSubmit={handleCreateSubscription}
          onClose={() => setShowCreateSubscription(false)}
        />
      )}
    </div>
  );
}
