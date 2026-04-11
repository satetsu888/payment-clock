import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchTestClockResources,
  createCustomer as apiCreateCustomer,
  attachPaymentMethod as apiAttachPaymentMethod,
  setDefaultPaymentMethod as apiSetDefaultPaymentMethod,
  detachPaymentMethod as apiDetachPaymentMethod,
  createSubscription as apiCreateSubscription,
} from "../lib/api";
import type { TestClockResources, CustomerWithResources, CreateSubscriptionOptions } from "../lib/types";
import { groupResourcesByCustomer } from "../lib/resource-grouping";

export function useTestClockResources(
  accountId: string,
  testClockId: string,
  isDeleted: boolean,
) {
  const [resources, setResources] = useState<TestClockResources | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (isDeleted) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTestClockResources(accountId, testClockId);
      setResources(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [accountId, testClockId, isDeleted]);

  useEffect(() => {
    load();
  }, [load]);

  const customerGroups: CustomerWithResources[] = useMemo(() => {
    if (!resources) return [];
    return groupResourcesByCustomer(resources);
  }, [resources]);

  const createCustomer = useCallback(
    async (name?: string, email?: string) => {
      await apiCreateCustomer(accountId, testClockId, name, email);
      await load();
    },
    [accountId, testClockId, load],
  );

  const attachPaymentMethod = useCallback(
    async (customerId: string, paymentMethodId: string) => {
      await apiAttachPaymentMethod(accountId, testClockId, customerId, paymentMethodId);
      await load();
    },
    [accountId, testClockId, load],
  );

  const setDefaultPaymentMethod = useCallback(
    async (customerId: string, paymentMethodId: string) => {
      await apiSetDefaultPaymentMethod(accountId, testClockId, customerId, paymentMethodId);
      await load();
    },
    [accountId, testClockId, load],
  );

  const detachPaymentMethod = useCallback(
    async (customerId: string, paymentMethodId: string) => {
      await apiDetachPaymentMethod(accountId, testClockId, customerId, paymentMethodId);
      await load();
    },
    [accountId, testClockId, load],
  );

  const createSubscription = useCallback(
    async (customerId: string, priceId: string, options?: CreateSubscriptionOptions) => {
      await apiCreateSubscription(accountId, testClockId, customerId, priceId, options);
      await load();
    },
    [accountId, testClockId, load],
  );

  const clearError = useCallback(() => setError(null), []);

  return {
    resources,
    customerGroups,
    loading,
    error,
    reload: load,
    clearError,
    createCustomer,
    attachPaymentMethod,
    setDefaultPaymentMethod,
    detachPaymentMethod,
    createSubscription,
  };
}
