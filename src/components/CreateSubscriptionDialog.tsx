import { useCallback, useEffect, useState } from "react";
import { listProducts, listPrices } from "../lib/api";
import type { ResourceItem, StripeProduct, StripePrice } from "../lib/types";

interface CreateSubscriptionDialogProps {
  accountId: string;
  customers: ResourceItem[];
  onSubmit: (customerId: string, priceId: string) => Promise<void>;
  onClose: () => void;
}

export function CreateSubscriptionDialog({
  accountId,
  customers,
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
      await onSubmit(customerId, selectedPriceId);
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
                  {(c.data.name as string) || (c.data.email as string) || c.stripeId}
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
