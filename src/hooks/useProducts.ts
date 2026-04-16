import { useCallback, useEffect, useState } from "react";
import {
  listProducts,
  listPrices,
  createProduct as apiCreateProduct,
  archiveProduct as apiArchiveProduct,
  createPrice as apiCreatePrice,
  archivePrice as apiArchivePrice,
} from "../lib/api";
import type { StripeProduct, StripePrice } from "../lib/types";

export function useProducts(accountId: string) {
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [prices, setPrices] = useState<StripePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prods, prs] = await Promise.all([
        listProducts(accountId),
        listPrices(accountId),
      ]);
      setProducts(prods);
      setPrices(prs);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    load();
  }, [load]);

  const createProduct = useCallback(
    async (name: string, description?: string) => {
      const product = await apiCreateProduct(accountId, name, description);
      await load();
      return product;
    },
    [accountId, load],
  );

  const archiveProduct = useCallback(
    async (productId: string) => {
      await apiArchiveProduct(accountId, productId);
      await load();
    },
    [accountId, load],
  );

  const createPrice = useCallback(
    async (
      productId: string,
      unitAmount: number,
      currency: string,
      recurringInterval?: string,
      recurringIntervalCount?: number,
      nickname?: string,
      usageType?: string,
      meterId?: string,
    ) => {
      const price = await apiCreatePrice(
        accountId,
        productId,
        unitAmount,
        currency,
        recurringInterval,
        recurringIntervalCount,
        nickname,
        usageType,
        meterId,
      );
      await load();
      return price;
    },
    [accountId, load],
  );

  const archivePrice = useCallback(
    async (priceId: string) => {
      await apiArchivePrice(accountId, priceId);
      await load();
    },
    [accountId, load],
  );

  return {
    products,
    prices,
    loading,
    error,
    reload: load,
    createProduct,
    archiveProduct,
    createPrice,
    archivePrice,
  };
}
