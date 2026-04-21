import { useState } from "react";
import { ChevronRight, Package } from "lucide-react";
import { useProducts } from "../../../hooks/useProducts";
import { formatPrice } from "../../../lib/format";
import type { StripeProduct, StripePrice } from "../../../lib/types";
import { DropdownMenu } from "../../ui/DropdownMenu";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { CreateProductDialog } from "./CreateProductDialog";
import { CreatePriceDialog } from "./CreatePriceDialog";

interface ProductPriceSectionProps {
  accountId: string;
}

export function ProductPriceSection({ accountId }: ProductPriceSectionProps) {
  const {
    products,
    prices,
    loading,
    error,
    reload,
    createProduct,
    archiveProduct,
    createPrice,
    archivePrice,
  } = useProducts(accountId);

  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [createPriceTarget, setCreatePriceTarget] = useState<StripeProduct | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{
    type: "product" | "price";
    id: string;
    name: string;
  } | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const toggleExpand = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const pricesForProduct = (productId: string): StripePrice[] =>
    prices.filter((p) => p.product === productId);

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiveLoading(true);
    try {
      if (archiveTarget.type === "product") {
        await archiveProduct(archiveTarget.id);
      } else {
        await archivePrice(archiveTarget.id);
      }
    } finally {
      setArchiveLoading(false);
      setArchiveTarget(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Products & Prices</h2>
          {!loading && (
            <span className="text-xs text-gray-400">({products.length})</span>
          )}
        </div>
        <button
          onClick={() => setShowCreateProduct(true)}
          className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md"
        >
          + New Product
        </button>
      </div>

      {loading && (
        <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md mb-3">
          {error}
          <button onClick={reload} className="ml-2 underline">Retry</button>
        </p>
      )}

      {!loading && products.length === 0 && !error && (
        <p className="text-sm text-gray-400 text-center py-4">
          No products yet.
        </p>
      )}

      <div className="space-y-1">
        {products.map((product) => {
          const productPrices = pricesForProduct(product.id);
          const expanded = expandedProducts.has(product.id);

          return (
            <div key={product.id} className="border border-gray-200 rounded-md">
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleExpand(product.id)}
              >
                <ChevronRight
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                    expanded ? "rotate-90" : ""
                  }`}
                />
                <span className="text-sm font-medium text-gray-800 flex-1">
                  {product.name}
                </span>
                <span className="text-xs text-gray-400">
                  {productPrices.length} price{productPrices.length !== 1 ? "s" : ""}
                </span>
                <DropdownMenu
                  items={[
                    {
                      label: "Add Price",
                      onClick: () => setCreatePriceTarget(product),
                    },
                    {
                      label: "Archive",
                      onClick: () =>
                        setArchiveTarget({
                          type: "product",
                          id: product.id,
                          name: product.name,
                        }),
                      danger: true,
                    },
                  ]}
                />
              </div>

              {expanded && (
                <div className="border-t border-gray-100 px-3 py-2 bg-gray-50/50">
                  {product.description && (
                    <p className="text-xs text-gray-500 mb-2">{product.description}</p>
                  )}
                  {productPrices.length === 0 ? (
                    <p className="text-xs text-gray-400 py-1">No prices.</p>
                  ) : (
                    <div className="space-y-1">
                      {productPrices.map((price) => (
                        <div
                          key={price.id}
                          className="flex items-center justify-between py-1"
                        >
                          <span className="text-xs text-gray-700">
                            {formatPrice(price)}
                          </span>
                          <DropdownMenu
                            items={[
                              {
                                label: "Archive",
                                onClick: () =>
                                  setArchiveTarget({
                                    type: "price",
                                    id: price.id,
                                    name: formatPrice(price),
                                  }),
                                danger: true,
                              },
                            ]}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setCreatePriceTarget(product)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 mt-1"
                  >
                    + Add Price
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showCreateProduct && (
        <CreateProductDialog
          onSubmit={async (name, description) => {
            await createProduct(name, description);
          }}
          onClose={() => setShowCreateProduct(false)}
        />
      )}

      {createPriceTarget && (
        <CreatePriceDialog
          accountId={accountId}
          product={createPriceTarget}
          onSubmit={async (productId, unitAmount, currency, interval, intervalCount, nickname, usageType, meterId, taxBehavior) => {
            await createPrice(productId, unitAmount, currency, interval, intervalCount, nickname, usageType, meterId, taxBehavior);
          }}
          onClose={() => setCreatePriceTarget(null)}
        />
      )}

      {archiveTarget && (
        <ConfirmDialog
          title={`Archive ${archiveTarget.type === "product" ? "Product" : "Price"}`}
          message={`"${archiveTarget.name}" will be archived and no longer available for new subscriptions.`}
          confirmLabel="Archive"
          onConfirm={handleArchive}
          onCancel={() => setArchiveTarget(null)}
          loading={archiveLoading}
        />
      )}
    </div>
  );
}
