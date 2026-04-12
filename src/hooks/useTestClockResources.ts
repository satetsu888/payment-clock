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

/** Stripe APIは作成日降順（新しい順）で返すので、reverseして昇順（古い順）にする */
function toChronologicalOrder(raw: TestClockResources): TestClockResources {
  return {
    customers: [...raw.customers].reverse(),
    subscriptions: [...raw.subscriptions].reverse(),
    invoices: [...raw.invoices].reverse(),
    paymentIntents: [...raw.paymentIntents].reverse(),
  };
}

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
      setResources(toChronologicalOrder(result));
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
    async (name?: string, email?: string, metadata?: Record<string, string>) => {
      await apiCreateCustomer(accountId, testClockId, name, email, metadata);
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
