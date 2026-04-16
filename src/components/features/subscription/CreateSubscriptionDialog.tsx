import { useCallback, useEffect, useState } from "react";
import { listProducts, listPrices, createProduct as apiCreateProduct, createPrice as apiCreatePrice } from "../../../lib/api";
import { formatDateTime, formatPrice, toDatetimeLocalUTC } from "../../../lib/format";
import type {
  ResourceItem,
  StripeProduct,
  StripePrice,
  CreateSubscriptionOptions,
  BillingCycleAnchorConfig,
} from "../../../lib/types";
import { Dialog } from "../../ui/Dialog";
import { CreateProductDialog } from "../product/CreateProductDialog";
import { CreatePriceDialog } from "../product/CreatePriceDialog";

type TrialMode = "days" | "end";
type BillingAnchorMode = "timestamp" | "config";
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
  const [billingAnchorMode, setBillingAnchorMode] = useState<BillingAnchorMode>("timestamp");
  const [billingAnchorDate, setBillingAnchorDate] = useState<string>(
    toDatetimeLocalValue(frozenTime),
  );
  const [configDayOfMonth, setConfigDayOfMonth] = useState<string>("1");
  const [configMonth, setConfigMonth] = useState<string>("");
  const [configHour, setConfigHour] = useState<string>("");
  const [configMinute, setConfigMinute] = useState<string>("");
  const [configSecond, setConfigSecond] = useState<string>("");
  const [showTimeFields, setShowTimeFields] = useState(false);
  const [prorationBehavior, setProrationBehavior] = useState<"create_prorations" | "none">("create_prorations");
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [createPriceTarget, setCreatePriceTarget] = useState<StripeProduct | null>(null);

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
      if (enableBillingAnchor) {
        if (billingAnchorMode === "timestamp" && billingAnchorDate) {
          options.billingCycleAnchor = Math.floor(
            new Date(billingAnchorDate + "Z").getTime() / 1000,
          );
        } else if (billingAnchorMode === "config") {
          const dayOfMonth = parseInt(configDayOfMonth, 10);
          if (isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
            setError("Day of month must be between 1 and 31");
            setLoading(false);
            return;
          }
          const config: BillingCycleAnchorConfig = { day_of_month: dayOfMonth };
          if (configMonth) {
            const m = parseInt(configMonth, 10);
            if (!isNaN(m)) config.month = m;
          }
          if (configHour) {
            const h = parseInt(configHour, 10);
            if (!isNaN(h)) config.hour = h;
          }
          if (configMinute) {
            const min = parseInt(configMinute, 10);
            if (!isNaN(min)) config.minute = min;
          }
          if (configSecond) {
            const s = parseInt(configSecond, 10);
            if (!isNaN(s)) config.second = s;
          }
          options.billingCycleAnchorConfig = config;
        }
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
    <Dialog onClose={onClose} size="md">
      <Dialog.Header title="Create Subscription" />
      <form onSubmit={handleSubmit}>
        <Dialog.Content scrollable>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                  <div key={row.key} className="flex items-start gap-2 p-2 bg-gray-50 rounded-md">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-1">
                        <select
                          value={row.productId}
                          onChange={(e) => updateRow(row.key, "productId", e.target.value)}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                          disabled={loading || products.length === 0}
                        >
                          {products.length === 0 && <option value="">No products</option>}
                          <option value="">Select product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCreateProduct(true)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                        >
                          + New
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <select
                          value={row.priceId}
                          onChange={(e) => updateRow(row.key, "priceId", e.target.value)}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
                          disabled={loading || !row.productId}
                        >
                          <option value="">Select price...</option>
                          {productPrices.map((p) => (
                            <option key={p.id} value={p.id}>
                              {formatPrice(p)}
                            </option>
                          ))}
                        </select>
                        {row.productId && (
                          <button
                            type="button"
                            onClick={() => {
                              const prod = products.find((p) => p.id === row.productId);
                              if (prod) setCreatePriceTarget(prod);
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                          >
                            + New
                          </button>
                        )}
                      </div>
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
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="radio"
                      name="billingAnchorMode"
                      value="timestamp"
                      checked={billingAnchorMode === "timestamp"}
                      onChange={() => setBillingAnchorMode("timestamp")}
                      className="text-indigo-600 focus:ring-indigo-500"
                      disabled={loading}
                    />
                    Specific date
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="radio"
                      name="billingAnchorMode"
                      value="config"
                      checked={billingAnchorMode === "config"}
                      onChange={() => setBillingAnchorMode("config")}
                      className="text-indigo-600 focus:ring-indigo-500"
                      disabled={loading}
                    />
                    Day of month
                  </label>
                </div>

                {billingAnchorMode === "timestamp" ? (
                  <div>
                    <input
                      type="datetime-local"
                      value={billingAnchorDate}
                      min={frozenTimeMin}
                      onChange={(e) => setBillingAnchorDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Set the billing cycle reference date
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Day of month</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={configDayOfMonth}
                        onChange={(e) => setConfigDayOfMonth(e.target.value)}
                        className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        disabled={loading}
                      />
                      <span className="text-xs text-gray-400">(1-31, 31 = last day)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Month</label>
                      <select
                        value={configMonth}
                        onChange={(e) => setConfigMonth(e.target.value)}
                        className="w-40 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        disabled={loading}
                      >
                        <option value="">Not set (monthly)</option>
                        <option value="1">January</option>
                        <option value="2">February</option>
                        <option value="3">March</option>
                        <option value="4">April</option>
                        <option value="5">May</option>
                        <option value="6">June</option>
                        <option value="7">July</option>
                        <option value="8">August</option>
                        <option value="9">September</option>
                        <option value="10">October</option>
                        <option value="11">November</option>
                        <option value="12">December</option>
                      </select>
                      <span className="text-xs text-gray-400">(for yearly)</span>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowTimeFields(!showTimeFields)}
                        className="text-xs text-indigo-600 hover:text-indigo-800"
                      >
                        {showTimeFields ? "- Hide time fields" : "+ Set time (UTC)"}
                      </button>
                      {showTimeFields && (
                        <div className="mt-2 flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="23"
                            placeholder="HH"
                            value={configHour}
                            onChange={(e) => setConfigHour(e.target.value)}
                            className="w-16 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            disabled={loading}
                          />
                          <span className="text-gray-400">:</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            placeholder="MM"
                            value={configMinute}
                            onChange={(e) => setConfigMinute(e.target.value)}
                            className="w-16 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            disabled={loading}
                          />
                          <span className="text-gray-400">:</span>
                          <input
                            type="number"
                            min="0"
                            max="59"
                            placeholder="SS"
                            value={configSecond}
                            onChange={(e) => setConfigSecond(e.target.value)}
                            className="w-16 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            disabled={loading}
                          />
                          <span className="text-xs text-gray-400 ml-1">UTC</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      Only for monthly/yearly subscriptions. Day 31 auto-adjusts for shorter months.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Billing until anchor
                  </label>
                  <select
                    value={prorationBehavior}
                    onChange={(e) => setProrationBehavior(e.target.value as "create_prorations" | "none")}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
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
        </Dialog.Content>
        <Dialog.Footer>
          <Dialog.CancelButton onClick={onClose} disabled={loading} />
          <Dialog.ActionButton
            type="submit"
            disabled={!customerId || validPriceIds.length === 0}
            loading={loading}
            loadingText="Creating..."
          >
            Create
          </Dialog.ActionButton>
        </Dialog.Footer>
      </form>

      {showCreateProduct && (
        <CreateProductDialog
          onSubmit={async (name, description) => {
            const product = await apiCreateProduct(accountId, name, description);
            const [prods, prs] = await Promise.all([
              listProducts(accountId),
              listPrices(accountId),
            ]);
            setProducts(prods);
            setAllPrices(prs);
            setPriceRows((prev) =>
              prev.map((row) =>
                !row.productId ? { ...row, productId: product.id } : row,
              ),
            );
          }}
          onClose={() => setShowCreateProduct(false)}
        />
      )}

      {createPriceTarget && (
        <CreatePriceDialog
          accountId={accountId}
          product={createPriceTarget}
          onSubmit={async (productId, unitAmount, currency, interval, intervalCount, nickname, usageType, meterId) => {
            const price = await apiCreatePrice(
              accountId,
              productId,
              unitAmount,
              currency,
              interval,
              intervalCount,
              nickname,
              usageType,
              meterId,
            );
            const prs = await listPrices(accountId);
            setAllPrices(prs);
            setPriceRows((prev) =>
              prev.map((row) =>
                row.productId === productId && !row.priceId
                  ? { ...row, priceId: price.id }
                  : row,
              ),
            );
          }}
          onClose={() => setCreatePriceTarget(null)}
        />
      )}
    </Dialog>
  );
}
