import { useCallback, useEffect, useState } from "react";
import { listProducts, listPrices } from "../../../lib/api";
import type { SubscriptionItemUpdate, StripeProduct, StripePrice } from "../../../lib/types";
import { formatCurrency } from "../../../lib/format";
import { Dialog } from "../../ui/Dialog";

interface ItemRow {
  key: string; // unique key for React
  existingItemId?: string; // existing subscription item ID (for update/delete)
  productId: string;
  priceId: string;
  deleted: boolean;
}

interface UpdateSubscriptionItemsDialogProps {
  subscriptionId: string;
  subscriptionData: Record<string, unknown>;
  accountId: string;
  onSubmit: (items: SubscriptionItemUpdate[], prorationBehavior: string) => Promise<void>;
  onClose: () => void;
}

export function UpdateSubscriptionItemsDialog({
  subscriptionData,
  accountId,
  onSubmit,
  onClose,
}: UpdateSubscriptionItemsDialogProps) {
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [prices, setPrices] = useState<StripePrice[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [prorationBehavior, setProrationBehavior] = useState("create_prorations");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextKey, setNextKey] = useState(0);

  // Initialize items from current subscription
  useEffect(() => {
    const subItems = subscriptionData.items as Record<string, unknown> | undefined;
    const itemData = (subItems?.data as Array<Record<string, unknown>>) || [];
    let keyCounter = 0;
    const rows: ItemRow[] = itemData.map((item) => {
      const priceInfo = item.price as Record<string, unknown>;
      const productId = typeof priceInfo.product === "string"
        ? priceInfo.product
        : String((priceInfo.product as Record<string, unknown>).id);
      return {
        key: String(keyCounter++),
        existingItemId: String(item.id),
        productId,
        priceId: String(priceInfo.id),
        deleted: false,
      };
    });
    setItems(rows);
    setNextKey(keyCounter);
  }, [subscriptionData]);

  // Load products and prices
  const loadData = useCallback(async () => {
    try {
      const [prods, prs] = await Promise.all([
        listProducts(accountId),
        listPrices(accountId),
      ]);
      setProducts(prods);
      setPrices(prs);
    } catch {
      // ignore load errors
    }
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { key: String(nextKey), productId: "", priceId: "", deleted: false },
    ]);
    setNextKey((k) => k + 1);
  };

  const updateItem = (key: string, field: keyof ItemRow, value: string | boolean) => {
    setItems((prev) =>
      prev.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeItem = (key: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.key === key);
      if (!item) return prev;
      if (item.existingItemId) {
        // Mark existing item as deleted
        return prev.map((i) => (i.key === key ? { ...i, deleted: true } : i));
      }
      // Remove new item entirely
      return prev.filter((i) => i.key !== key);
    });
  };

  const activeItems = items.filter((i) => !i.deleted);
  const canSubmit = activeItems.length > 0 && activeItems.every((i) => i.priceId);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const updates: SubscriptionItemUpdate[] = items
        .filter((i) => i.deleted || i.priceId) // include deleted and changed items
        .map((i) => {
          if (i.deleted && i.existingItemId) {
            return { id: i.existingItemId, deleted: true };
          }
          if (i.existingItemId) {
            return { id: i.existingItemId, price: i.priceId };
          }
          return { price: i.priceId };
        });
      await onSubmit(updates, prorationBehavior);
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  };

  const pricesForProduct = (productId: string) =>
    prices.filter((p) => p.product === productId);

  return (
    <Dialog onClose={onClose} size="lg">
      <Dialog.Header title="Change Plan" />
      <Dialog.Content scrollable compact>
        {/* Items list */}
        <div className="space-y-3">
          <label className="block text-xs font-medium text-gray-600">Items</label>
          {items.map((item) => {
            if (item.deleted) return null;
            const productPrices = pricesForProduct(item.productId);
            return (
              <div key={item.key} className="flex items-start gap-2 p-2 bg-gray-50 rounded-md">
                <div className="flex-1 space-y-1">
                  <select
                    value={item.productId}
                    onChange={(e) => {
                      updateItem(item.key, "productId", e.target.value);
                      updateItem(item.key, "priceId", "");
                    }}
                    className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <select
                    value={item.priceId}
                    onChange={(e) => updateItem(item.key, "priceId", e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    disabled={!item.productId}
                  >
                    <option value="">Select price...</option>
                    {productPrices.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.unit_amount ? formatCurrency(p.unit_amount, p.currency) : "Usage-based"}
                        {p.recurring ? `/${p.recurring.interval}` : ""}
                        {p.nickname ? ` (${p.nickname})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {activeItems.length > 1 && (
                  <button
                    onClick={() => removeItem(item.key)}
                    className="text-xs text-red-500 hover:text-red-700 mt-1"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
          <button
            onClick={addItem}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            + Add Item
          </button>
        </div>

        {/* Proration behavior */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Proration Behavior</label>
          <select
            value={prorationBehavior}
            onChange={(e) => setProrationBehavior(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="create_prorations">Create prorations (default)</option>
            <option value="none">None</option>
            <option value="always_invoice">Always invoice</option>
          </select>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </Dialog.Content>
      <Dialog.Footer>
        <Dialog.CancelButton size="compact" onClick={onClose} />
        <Dialog.ActionButton
          size="compact"
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={loading}
          loadingText="Updating..."
        >
          Update
        </Dialog.ActionButton>
      </Dialog.Footer>
    </Dialog>
  );
}
