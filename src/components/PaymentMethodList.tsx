import { useState } from "react";
import type { PaymentMethodData } from "../lib/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { DropdownMenu, type DropdownMenuItem } from "./DropdownMenu";
import { formatBrand } from "../lib/format";

export function PaymentMethodList({
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
          const menuItems: DropdownMenuItem[] = [];
          if (!isDefault) {
            menuItems.push({
              label: "Set as default",
              onClick: () => handleSetDefault(pm.id),
              disabled: loading !== null,
            });
          }
          menuItems.push({
            label: "Detach",
            onClick: () => setDetachTarget(pm),
            danger: true,
            disabled: loading !== null,
          });

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
                  <span className="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700">
                    default
                  </span>
                )}
              </div>
              <DropdownMenu items={menuItems} />
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
