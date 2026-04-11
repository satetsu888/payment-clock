import { useCallback, useEffect, useState } from "react";
import type { CustomerWithResources, PaymentMethodData } from "../lib/types";
import { listPaymentMethods } from "../lib/api";
import { SubscriptionSection } from "./SubscriptionSection";
import { InvoiceSection } from "./InvoiceSection";
import { PaymentIntentSection } from "./PaymentIntentSection";
import { ConfirmDialog } from "./ConfirmDialog";
import { TEST_PAYMENT_METHOD_GROUPS } from "../lib/payment-methods";

interface CustomerResourceCardProps {
  group: CustomerWithResources;
  accountId: string;
  defaultExpanded: boolean;
  onAttachPaymentMethod: (
    customerId: string,
    paymentMethodId: string,
  ) => Promise<void>;
  onSetDefaultPaymentMethod: (
    customerId: string,
    paymentMethodId: string,
  ) => Promise<void>;
  onDetachPaymentMethod: (
    customerId: string,
    paymentMethodId: string,
  ) => Promise<void>;
}



function getDefaultPaymentMethodId(data: Record<string, unknown>): string | null {
  const invoiceSettings = data.invoice_settings as
    | Record<string, unknown>
    | undefined;
  if (!invoiceSettings?.default_payment_method) return null;
  const dpm = invoiceSettings.default_payment_method;
  if (typeof dpm === "string") return dpm;
  if (typeof dpm === "object" && dpm !== null && "id" in (dpm as Record<string, unknown>)) {
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

export function CustomerResourceCard({
  group,
  accountId,
  defaultExpanded,
  onAttachPaymentMethod,
  onSetDefaultPaymentMethod,
  onDetachPaymentMethod,
}: CustomerResourceCardProps) {
  const { customer, subscriptions, invoices, paymentIntents } = group;
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [attachingPM, setAttachingPM] = useState(false);
  const [pmLoading, setPmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodData[]>([]);

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

  const defaultPMId = getDefaultPaymentMethodId(customer.data);
  const resourceCount = subscriptions.length + invoices.length + paymentIntents.length;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{expanded ? "▼" : "▶"}</span>
          <span className="font-medium text-sm text-gray-900">
            {String(customer.data.name || "Unnamed")}
          </span>
          {customer.data.email ? (
            <span className="text-xs text-gray-500">
              {String(customer.data.email)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {resourceCount} resources
          </span>
          <span className="text-xs text-gray-400 font-mono">
            {customer.stripeId}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-3 py-3 space-y-3">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              {error}
            </p>
          )}

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

          {subscriptions.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                Subscriptions ({subscriptions.length})
              </h4>
              <SubscriptionSection subscriptions={subscriptions} />
            </div>
          )}

          {invoices.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                Invoices ({invoices.length})
              </h4>
              <InvoiceSection invoices={invoices} />
            </div>
          )}

          {paymentIntents.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">
                Payment Intents ({paymentIntents.length})
              </h4>
              <PaymentIntentSection paymentIntents={paymentIntents} />
            </div>
          )}

          {resourceCount === 0 && (
            <p className="text-xs text-gray-400 py-1">No resources yet</p>
          )}
        </div>
      )}
    </div>
  );
}
