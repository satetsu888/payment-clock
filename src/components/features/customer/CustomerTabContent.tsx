import { useCallback, useEffect, useState } from "react";
import { listPaymentMethods } from "../../../lib/api";
import type {
  CustomerWithResources,
  PaymentMethodData,
  CreateSubscriptionOptions,
  SubscriptionActions,
} from "../../../lib/types";
import { CreateSubscriptionDialog } from "../subscription/CreateSubscriptionDialog";
import { CreatePaymentMethodDialog } from "./CreatePaymentMethodDialog";
import { SubscriptionSection } from "../subscription/SubscriptionSection";
import { BillingHistory } from "./BillingHistory";
import { PaymentMethodList } from "./PaymentMethodList";

function getDefaultPaymentMethodId(
  data: Record<string, unknown>,
): string | null {
  const invoiceSettings = data.invoice_settings as
    | Record<string, unknown>
    | undefined;
  if (!invoiceSettings?.default_payment_method) return null;
  const dpm = invoiceSettings.default_payment_method;
  if (typeof dpm === "string") return dpm;
  if (
    typeof dpm === "object" &&
    dpm !== null &&
    "id" in (dpm as Record<string, unknown>)
  ) {
    return String((dpm as Record<string, unknown>).id);
  }
  return null;
}

export function CustomerTabContent({
  group,
  accountId,
  frozenTime,
  totalSubscriptionCount,
  onAttachPaymentMethod,
  onSetDefaultPaymentMethod,
  onDetachPaymentMethod,
  onCreateSubscription,
  onCancelSubscription,
  onPauseSubscription,
  onResumeSubscription,
  subscriptionActions,
  stripeApiVersion,
  highlightedInvoiceId,
  onHighlightInvoice,
}: {
  group: CustomerWithResources;
  accountId: string;
  frozenTime: string;
  totalSubscriptionCount: number;
  onAttachPaymentMethod: (customerId: string, paymentMethodId: string) => Promise<void>;
  onSetDefaultPaymentMethod: (customerId: string, paymentMethodId: string) => Promise<void>;
  onDetachPaymentMethod: (customerId: string, paymentMethodId: string) => Promise<void>;
  onCreateSubscription: (customerId: string, priceIds: string[], options?: CreateSubscriptionOptions) => Promise<void>;
  onCancelSubscription: (subscriptionId: string) => Promise<void>;
  onPauseSubscription: (subscriptionId: string) => Promise<void>;
  onResumeSubscription: (subscriptionId: string) => Promise<void>;
  subscriptionActions: SubscriptionActions;
  stripeApiVersion: string;
  highlightedInvoiceId: string | null;
  onHighlightInvoice: (id: string | null) => void;
}) {
  const { customer, subscriptions, invoices } = group;
  const [showAttachPM, setShowAttachPM] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);
  const [showCreateSubscription, setShowCreateSubscription] = useState(false);

  const loadPaymentMethods = useCallback(async () => {
    try {
      const pms = await listPaymentMethods(accountId, customer.stripeId);
      setPaymentMethods(pms);
    } catch {
      setPaymentMethods([]);
    }
  }, [accountId, customer.stripeId]);

  useEffect(() => {
    loadPaymentMethods();
  }, [loadPaymentMethods]);

  const handleAttach = async (pmId: string) => {
    await onAttachPaymentMethod(customer.stripeId, pmId);
    await loadPaymentMethods();
  };

  const handleSetDefault = async (customerId: string, pmId: string) => {
    setError(null);
    try {
      await onSetDefaultPaymentMethod(customerId, pmId);
      await loadPaymentMethods();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDetach = async (customerId: string, pmId: string) => {
    setError(null);
    try {
      await onDetachPaymentMethod(customerId, pmId);
      await loadPaymentMethods();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleCreateSubscription = async (
    customerId: string,
    priceIds: string[],
    options?: CreateSubscriptionOptions,
  ) => {
    await onCreateSubscription(customerId, priceIds, options);
    setShowCreateSubscription(false);
  };

  const defaultPMId = getDefaultPaymentMethodId(customer.data);

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
          {error}
        </p>
      )}

      {/* Customer info */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="font-mono">{customer.stripeId}</span>
        {customer.data.email ? (
          <>
            <span>&middot;</span>
            <span>{String(customer.data.email)}</span>
          </>
        ) : null}
      </div>

      {/* Payment Methods */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Payment Methods ({paymentMethods.length})
          </h4>
          <button
            onClick={() => setShowAttachPM(true)}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            + Payment Method
          </button>
        </div>
        <PaymentMethodList
          customerId={customer.stripeId}
          paymentMethods={paymentMethods}
          defaultPaymentMethodId={defaultPMId}
          onSetDefault={handleSetDefault}
          onDetach={handleDetach}
        />
      </div>

      {/* Subscriptions */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Subscriptions ({subscriptions.length})
          </h4>
          <button
            onClick={() => setShowCreateSubscription(true)}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            + Subscription
          </button>
        </div>
        {subscriptions.length > 0 ? (
          <SubscriptionSection
            subscriptions={subscriptions}
            stripeApiVersion={stripeApiVersion}
            onCancel={onCancelSubscription}
            onPause={onPauseSubscription}
            onResume={onResumeSubscription}
            actions={subscriptionActions}
            accountId={accountId}
            frozenTime={frozenTime}
          />
        ) : (
          <p className="text-xs text-gray-400 mt-1">No subscriptions</p>
        )}
      </div>

      {/* Billing History */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
          Billing History
        </h4>
        <BillingHistory
          invoices={invoices}
          subscriptions={subscriptions}
          highlightedInvoiceId={highlightedInvoiceId}
          onHighlightInvoice={onHighlightInvoice}
        />
      </div>

      {showAttachPM && (
        <CreatePaymentMethodDialog
          onAttach={handleAttach}
          onClose={() => setShowAttachPM(false)}
        />
      )}

      {showCreateSubscription && (
        <CreateSubscriptionDialog
          accountId={accountId}
          customers={[customer]}
          frozenTime={frozenTime}
          defaultLabel={`Subscription ${totalSubscriptionCount + 1}`}
          onSubmit={handleCreateSubscription}
          onClose={() => setShowCreateSubscription(false)}
        />
      )}
    </div>
  );
}
