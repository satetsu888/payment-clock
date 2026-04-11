import { useCallback, useEffect, useState } from "react";
import { listPaymentMethods } from "../lib/api";
import type {
  CustomerWithResources,
  PaymentMethodData,
  CreateSubscriptionOptions,
} from "../lib/types";
import { useAccountContext } from "../contexts/AccountContext";
import { CreateCustomerDialog } from "./CreateCustomerDialog";
import { CreateSubscriptionDialog } from "./CreateSubscriptionDialog";
import { SubscriptionSection } from "./SubscriptionSection";
import { BillingHistory } from "./BillingHistory";
import { ConfirmDialog } from "./ConfirmDialog";
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

// --- Test payment method options ---
const TEST_PAYMENT_METHOD_GROUPS = [
  {
    label: "Success",
    methods: [
      { id: "pm_card_visa", label: "Visa (4242)" },
      { id: "pm_card_mastercard", label: "Mastercard (5555)" },
      { id: "pm_card_amex", label: "Amex (3782)" },
      { id: "pm_card_visa_debit", label: "Visa Debit" },
    ],
  },
  {
    label: "Decline",
    methods: [
      { id: "pm_card_chargeCustomerFail", label: "Charge Fail" },
    ],
  },
];

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

function formatBrand(brand: string): string {
  const brands: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
    diners: "Diners",
    jcb: "JCB",
    unionpay: "UnionPay",
  };
  return brands[brand] || brand;
}

// --- PaymentMethodList ---
function PaymentMethodList({
  customerId,
  paymentMethods,
  defaultPaymentMethodId,
  onSetDefault,
  onDetach,
}: {
  customerId: string;
  paymentMethods: PaymentMethodData[];
  defaultPaymentMethodId: string | null;
  onSetDefault: (customerId: string, pmId: string) => Promise<void>;
  onDetach: (customerId: string, pmId: string) => Promise<void>;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [detachTarget, setDetachTarget] = useState<PaymentMethodData | null>(null);
  const [detachLoading, setDetachLoading] = useState(false);

  const handleSetDefault = async (pmId: string) => {
    setLoading(pmId);
    try {
      await onSetDefault(customerId, pmId);
    } finally {
      setLoading(null);
    }
  };

  const handleDetach = async () => {
    if (!detachTarget) return;
    setDetachLoading(true);
    try {
      await onDetach(customerId, detachTarget.id);
      setDetachTarget(null);
    } finally {
      setDetachLoading(false);
    }
  };

  if (paymentMethods.length === 0) {
    return <p className="text-xs text-gray-400 mt-1">No payment methods</p>;
  }

  return (
    <>
      <div className="mt-1.5 space-y-1">
        {paymentMethods.map((pm) => {
          const isDefault = pm.id === defaultPaymentMethodId;
          return (
            <div
              key={pm.id}
              className="flex items-center justify-between text-xs px-2 py-1 bg-white rounded border border-gray-100"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400">
                  {pm.card ? formatBrand(pm.card.brand) : pm.type}
                </span>
                {pm.card && (
                  <span className="font-mono text-gray-600">
                    ····{pm.card.last4}
                  </span>
                )}
                {isDefault && (
                  <span className="text-xs text-green-600 font-medium">
                    default
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {!isDefault && (
                  <button
                    onClick={() => handleSetDefault(pm.id)}
                    disabled={loading !== null}
                    className="text-indigo-500 hover:text-indigo-700 disabled:opacity-50"
                  >
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => setDetachTarget(pm)}
                  disabled={loading !== null}
                  className="text-red-400 hover:text-red-600 disabled:opacity-50"
                >
                  Detach
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {detachTarget && (
        <ConfirmDialog
          title="Detach Payment Method"
          message={`Detach ${detachTarget.card ? `${formatBrand(detachTarget.card.brand)} ····${detachTarget.card.last4}` : detachTarget.id}?`}
          confirmLabel="Detach"
          onConfirm={handleDetach}
          onCancel={() => setDetachTarget(null)}
          loading={detachLoading}
        />
      )}
    </>
  );
}

// --- Single customer tab content ---
function CustomerTabContent({
  group,
  accountId,
  frozenTime,
  onAttachPaymentMethod,
  onSetDefaultPaymentMethod,
  onDetachPaymentMethod,
  onCreateSubscription,
}: {
  group: CustomerWithResources;
  accountId: string;
  frozenTime: string;
  onAttachPaymentMethod: (customerId: string, paymentMethodId: string) => Promise<void>;
  onSetDefaultPaymentMethod: (customerId: string, paymentMethodId: string) => Promise<void>;
  onDetachPaymentMethod: (customerId: string, paymentMethodId: string) => Promise<void>;
  onCreateSubscription: (customerId: string, priceId: string, options?: CreateSubscriptionOptions) => Promise<void>;
}) {
  const { customer, subscriptions, invoices } = group;
  const [attachingPM, setAttachingPM] = useState(false);
  const [pmLoading, setPmLoading] = useState(false);
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
    setPmLoading(true);
    setError(null);
    try {
      await onAttachPaymentMethod(customer.stripeId, pmId);
      setAttachingPM(false);
      await loadPaymentMethods();
    } catch (e) {
      setError(String(e));
    } finally {
      setPmLoading(false);
    }
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
    priceId: string,
    options?: CreateSubscriptionOptions,
  ) => {
    await onCreateSubscription(customerId, priceId, options);
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
            onClick={() => setAttachingPM(!attachingPM)}
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
        {attachingPM && (
          <div className="mt-2 space-y-1.5">
            {TEST_PAYMENT_METHOD_GROUPS.map((pmGroup) => (
              <div key={pmGroup.label} className="flex items-start gap-2">
                <span className="text-xs text-gray-500 w-16 shrink-0 pt-1">
                  {pmGroup.label}
                </span>
                <div className="flex flex-wrap gap-1">
                  {pmGroup.methods.map((pm) => (
                    <button
                      key={pm.id}
                      onClick={() => handleAttach(pm.id)}
                      disabled={pmLoading}
                      className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-50"
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
          <SubscriptionSection subscriptions={subscriptions} />
        ) : (
          <p className="text-xs text-gray-400 mt-1">No subscriptions</p>
        )}
      </div>

      {/* Billing History */}
      <div>
        <h4 className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
          Billing History
        </h4>
        <BillingHistory invoices={invoices} />
      </div>

      {showCreateSubscription && (
        <CreateSubscriptionDialog
          accountId={accountId}
          customers={[customer]}
          frozenTime={frozenTime}
          onSubmit={handleCreateSubscription}
          onClose={() => setShowCreateSubscription(false)}
        />
      )}
    </div>
  );
}

// --- Main CustomerTabs component ---
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
