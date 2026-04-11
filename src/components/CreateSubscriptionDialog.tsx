import { useCallback, useEffect, useState } from "react";
import { listProducts, listPrices } from "../lib/api";
import type {
  ResourceItem,
  StripeProduct,
  StripePrice,
  CreateSubscriptionOptions,
} from "../lib/types";

type TrialMode = "days" | "end";
type TrialEndBehavior = "create_invoice" | "cancel" | "pause";

function toDatetimeLocalValue(isoString: string): string {
  const date = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

interface CreateSubscriptionDialogProps {
  accountId: string;
  customers: ResourceItem[];
  frozenTime: string;
  onSubmit: (
    customerId: string,
    priceId: string,
    options?: CreateSubscriptionOptions,
  ) => Promise<void>;
  onClose: () => void;
}

export function CreateSubscriptionDialog({
  accountId,
  customers,
  frozenTime,
  onSubmit,
  onClose,
}: CreateSubscriptionDialogProps) {
  const [customerId, setCustomerId] = useState(
    customers.length > 0 ? (customers[0].data.id as string) : "",
  );
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [prices, setPrices] = useState<StripePrice[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedPriceId, setSelectedPriceId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const frozenTimeMin = toDatetimeLocalValue(frozenTime);
  const defaultTrialEnd = (() => {
    const d = new Date(frozenTime);
    d.setDate(d.getDate() + 1);
    return toDatetimeLocalValue(d.toISOString());
  })();

  const [enableTrial, setEnableTrial] = useState(false);
  const [trialMode, setTrialMode] = useState<TrialMode>("days");
  const [trialDays, setTrialDays] = useState<string>("7");
  const [trialEndDate, setTrialEndDate] = useState<string>(defaultTrialEnd);
  const [trialEndBehavior, setTrialEndBehavior] =
    useState<TrialEndBehavior>("create_invoice");

  const loadProducts = useCallback(async () => {
    try {
      const prods = await listProducts(accountId);
      setProducts(prods);
      if (prods.length > 0) {
        setSelectedProductId(prods[0].id);
      }
    } catch (e) {
      setError(String(e));
    }
  }, [accountId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (!selectedProductId) return;
    setLoadingPrices(true);
    listPrices(accountId, selectedProductId)
      .then((p) => {
        setPrices(p);
        if (p.length > 0) {
          setSelectedPriceId(p[0].id);
        } else {
          setSelectedPriceId("");
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoadingPrices(false));
  }, [accountId, selectedProductId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !selectedPriceId) return;
    setLoading(true);
    setError(null);
    try {
      let options: CreateSubscriptionOptions | undefined;
      if (enableTrial) {
        options = {};
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
      await onSubmit(customerId, selectedPriceId, options);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: StripePrice) => {
    const amount = price.unit_amount
      ? `${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`
      : "Usage-based";
    const interval = price.recurring
      ? `/${price.recurring.interval}`
      : " (one-time)";
    const label = price.nickname ? `${price.nickname} - ` : "";
    return `${label}${amount}${interval}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading || products.length === 0}
            >
              {products.length === 0 && (
                <option value="">No products available</option>
              )}
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price
            </label>
            <select
              value={selectedPriceId}
              onChange={(e) => setSelectedPriceId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={loading || loadingPrices || prices.length === 0}
            >
              {loadingPrices && <option value="">Loading prices...</option>}
              {!loadingPrices && prices.length === 0 && (
                <option value="">No prices for this product</option>
              )}
              {prices.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatPrice(p)}
                </option>
              ))}
            </select>
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
              Trial を設定する
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
                    日数指定
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
                    終了日時指定
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
                      <span className="text-sm text-gray-600">日間</span>
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
                      Frozen time ({new Date(frozenTime).toLocaleString()}) より未来の日時を指定
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Trial 終了時の挙動 (payment method 未設定の場合)
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
                      Create invoice (請求書を作成)
                    </option>
                    <option value="cancel">Cancel (サブスクリプションをキャンセル)</option>
                    <option value="pause">Pause (一時停止)</option>
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
              disabled={loading || !customerId || !selectedPriceId}
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
