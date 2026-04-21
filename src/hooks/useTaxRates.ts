import { useCallback, useEffect, useState } from "react";
import {
  listTaxRates,
  createTaxRate as apiCreateTaxRate,
  archiveTaxRate as apiArchiveTaxRate,
} from "../lib/api";
import type { StripeTaxRate } from "../lib/types";

export function useTaxRates(accountId: string) {
  const [taxRates, setTaxRates] = useState<StripeTaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rates = await listTaxRates(accountId);
      setTaxRates(rates);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    load();
  }, [load]);

  const createTaxRate = useCallback(
    async (
      displayName: string,
      percentage: string,
      inclusive: boolean,
      country?: string,
      stateCode?: string,
      jurisdiction?: string,
    ) => {
      const rate = await apiCreateTaxRate(
        accountId,
        displayName,
        percentage,
        inclusive,
        country,
        stateCode,
        jurisdiction,
      );
      await load();
      return rate;
    },
    [accountId, load],
  );

  const archiveTaxRate = useCallback(
    async (taxRateId: string) => {
      await apiArchiveTaxRate(accountId, taxRateId);
      await load();
    },
    [accountId, load],
  );

  return {
    taxRates,
    loading,
    error,
    reload: load,
    createTaxRate,
    archiveTaxRate,
  };
}
