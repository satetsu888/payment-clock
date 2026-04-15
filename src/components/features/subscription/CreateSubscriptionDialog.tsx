import { useCallback, useEffect, useState } from "react";
import { listProducts, listPrices } from "../../../lib/api";
import { formatDateTime, formatPrice, toDatetimeLocalUTC } from "../../../lib/format";
import type {
  ResourceItem,
  StripeProduct,
  StripePrice,
  CreateSubscriptionOptions,
} from "../../../lib/types";

type TrialMode = "days" | "end";
type TrialEndBehavior = "create_invoice" | "cancel" | "pause";

function toDatetimeLocalValue(isoString: string): string {
  return toDatetimeLocalUTC(new Date(isoString));
}

interface PriceRow {
  key: number;
  productId: string;
  priceId: string;
}

interface CreateSubscriptionDialogProps {
  accountId: string;
  customers: ResourceItem[];
  frozenTime: string;
  defaultLabel: string;
  defaultCustomerId?: string;
  onSubmit: (
    customerId: string,
    priceIds: string[],
    options?: CreateSubscriptionOptions,
  ) => Promise<void>;
  onClose: () => void;
}

export function CreateSubscriptionDialog({
  accountId,
  customers,
  frozenTime,
  defaultLabel,
  defaultCustomerId,
  onSubmit,
  onClose,
}: CreateSubscriptionDialogProps) {
  const [customerId, setCustomerId] = useState(
    defaultCustomerId
      ?? (customers.length > 0 ? (customers[0].data.id as string) : ""),
  );
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [allPrices, setAllPrices] = useState<StripePrice[]>([]);
  const [priceRows, setPriceRows] = useState<PriceRow[]>([{ key: 0, productId: "", priceId: "" }]);
  const [nextKey, setNextKey] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frozenTimeMin = toDatetimeLocalValue(frozenTime);
  const defaultTrialEnd = (() => {
    const d = new Date(frozenTime);
    d.setUTCDate(d.getUTCDate() + 1);
    return toDatetimeLocalValue(d.toISOString());
  })();

  const [enableTrial, setEnableTrial] = useState(false);
  const [trialMode, setTrialMode] = useState<TrialMode>("days");
  const [trialDays, setTrialDays] = useState<string>("7");
  const [trialEndDate, setTrialEndDate] = useState<string>(defaultTrialEnd);
  const [trialEndBehavior, setTrialEndBehavior] =
    useState<TrialEndBehavior>("create_invoice");
  const [enableBillingAnchor, setEnableBillingAnchor] = useState(false);
  const [billingAnchorDate, setBillingAnchorDate] = useState<string>(
    toDatetimeLocalValue(frozenTime),
  );
  const [prorationBehavior, setProrationBehavior] = useState<"create_prorations" | "none">("create_prorations");

  const loadData = useCallback(async () => {
    try {
      const [prods, prs] = await Promise.all([
        listProducts(accountId),
        listPrices(accountId),
      ]);
      setProducts(prods);
      setAllPrices(prs);
      if (prods.length > 0) {
        const firstProductPrices = prs.filter((p) => p.product === prods[0].id);
        setPriceRows([{
          key: 0,
          productId: prods[0].id,
          priceId: firstProductPrices.length > 0 ? firstProductPrices[0].id : "",
        }]);
      }
    } catch (e) {
      setError(String(e));
    }
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pricesForProduct = (productId: string) =>
    allPrices.filter((p) => p.product === productId);

  const updateRow = (key: number, field: "productId" | "priceId", value: string) => {
    setPriceRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        if (field === "productId") {
          const productPrices = allPrices.filter((p) => p.product === value);
          return { ...row, productId: value, priceId: productPrices.length > 0 ? productPrices[0].id : "" };
        }
        return { ...row, [field]: value };
      }),
    );
  };

  const addRow = () => {
    setPriceRows((prev) => [...prev, { key: nextKey, productId: "", priceId: "" }]);
    setNextKey((k) => k + 1);
  };

  const removeRow = (key: number) => {
    setPriceRows((prev) => prev.filter((r) => r.key !== key));
  };

  const validPriceIds = priceRows.filter((r) => r.priceId).map((r) => r.priceId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || validPriceIds.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const options: CreateSubscriptionOptions = {
        metadata: { payment_clock_label: defaultLabel },
      };
      if (enableTrial) {
        if (trialMode === "days") {
          const days = parseInt(trialDays, 10);
          if (isNaN(days) || days <= 0) {
            setError("Trial days must be a positive number");
            setLoading(false);
            return;
          }
          options.trialPeriodDays = days;
        } else {
          if (!trialEndDate) {
            setError("Trial end date is required");
            setLoading(false);
            return;
          }
          options.trialEnd = Math.floor(
            new Date(trialEndDate).getTime() / 1000,
          );
        }
        options.trialEndBehavior = trialEndBehavior;
      }
      if (enableBillingAnchor && billingAnchorDate) {
        options.billingCycleAnchor = Math.floor(
          new Date(billingAnchorDate + "Z").getTime() / 1000,
        );
        options.prorationBehavior = prorationBehavior;
      }
      await onSubmit(customerId, validPriceIds, options);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Create Subscription
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading}
            >
              {customers.map((c) => (
                <option key={c.stripeId} value={c.data.id as string}>
                  {(c.data.name as string) ||
                    (c.data.email as string) ||
                    c.stripeId}
                </option>
              ))}
            </select>
          </div>

          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Items
            </label>
            <div className="space-y-2">
              {priceRows.map((row) => {
                const productPrices = pricesForProduct(row.productId);
                return (
                  <div key={row.key} className="flex items-start gap-2 p-2 bg-gray-50 rounded">
                    <div className="flex-1 space-y-1">
                      <select
                        value={row.productId}
                        onChange={(e) => updateRow(row.key, "productId", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                        disabled={loading || products.length === 0}
                      >
                        {products.length === 0 && <option value="">No products</option>}
                        <option value="">Select product...</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <select
                        value={row.priceId}
                        onChange={(e) => updateRow(row.key, "priceId", e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                        disabled={loading || !row.productId}
                      >
                        <option value="">Select price...</option>
                        {productPrices.map((p) => (
                          <option key={p.id} value={p.id}>
                            {formatPrice(p)}
                          </option>
                        ))}
                      </select>
                    </div>
                    {priceRows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        className="text-xs text-red-500 hover:text-red-700 mt-1"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addRow}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                + Add Item
              </button>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={enableTrial}
                onChange={(e) => setEnableTrial(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                disabled={loading}
              />
              Enable Trial
            </label>

            {enableTrial && (
              <div className="mt-3 ml-6 space-y-3">
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="radio"
                      name="trialMode"
                      value="days"
                      checked={trialMode === "days"}
                      onChange={() => setTrialMode("days")}
                      className="text-indigo-600 focus:ring-indigo-500"
                      disabled={loading}
                    />
                    By days
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="radio"
                      name="trialMode"
                      value="end"
                      checked={trialMode === "end"}
                      onChange={() => setTrialMode("end")}
                      className="text-indigo-600 focus:ring-indigo-500"
                      disabled={loading}
                    />
                    By end date
                  </label>
                </div>

                {trialMode === "days" ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={trialDays}
                        onChange={(e) => setTrialDays(e.target.value)}
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        disabled={loading}
                      />
                      <span className="text-sm text-gray-600">days</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      type="datetime-local"
                      value={trialEndDate}
                      min={frozenTimeMin}
                      onChange={(e) => setTrialEndDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Must be after frozen time ({formatDateTime(new Date(frozenTime))})
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Trial end behavior (if no payment method)
                  </label>
                  <select
                    value={trialEndBehavior}
                    onChange={(e) =>
                      setTrialEndBehavior(e.target.value as TrialEndBehavior)
                    }
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={loading}
                  >
                    <option value="create_invoice">
                      Create invoice
                    </option>
                    <option value="cancel">Cancel subscription</option>
                    <option value="pause">Pause subscription</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={enableBillingAnchor}
                onChange={(e) => setEnableBillingAnchor(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                disabled={loading}
              />
              Set Billing Cycle Anchor
            </label>

            {enableBillingAnchor && (
              <div className="mt-3 ml-6 space-y-3">
                <div>
                  <input
                    type="datetime-local"
                    value={billingAnchorDate}
                    min={frozenTimeMin}
                    onChange={(e) => setBillingAnchorDate(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Set the billing cycle reference date (e.g., 1st of each month to align billing)
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Billing until anchor
                  </label>
                  <select
                    value={prorationBehavior}
                    onChange={(e) => setProrationBehavior(e.target.value as "create_prorations" | "none")}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={loading}
                  >
                    <option value="create_prorations">Pro-rate (create_prorations)</option>
                    <option value="none">No charge (none)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !customerId || validPriceIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
