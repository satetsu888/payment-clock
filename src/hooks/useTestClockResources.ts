import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchTestClockResources,
  createCustomer as apiCreateCustomer,
  attachPaymentMethod as apiAttachPaymentMethod,
  setDefaultPaymentMethod as apiSetDefaultPaymentMethod,
  detachPaymentMethod as apiDetachPaymentMethod,
  createSubscription as apiCreateSubscription,
  cancelSubscription as apiCancelSubscription,
  pauseSubscription as apiPauseSubscription,
  resumeSubscription as apiResumeSubscription,
  updateSubscriptionItems as apiUpdateSubscriptionItems,
  updateSubscriptionTrial as apiUpdateSubscriptionTrial,
  cancelSubscriptionImmediately as apiCancelSubscriptionImmediately,
  updateSubscriptionCancelAt as apiUpdateSubscriptionCancelAt,
  undoCancelSubscription as apiUndoCancelSubscription,
  updateSubscriptionBillingAnchor as apiUpdateSubscriptionBillingAnchor,
  pauseSubscriptionWithOptions as apiPauseSubscriptionWithOptions,
  applySubscriptionDiscount as apiApplySubscriptionDiscount,
} from "../lib/api";
import type { TestClockResources, CustomerWithResources, CreateSubscriptionOptions, CustomerAddress, SubscriptionActions, SubscriptionItemUpdate, SubscriptionItemInput } from "../lib/types";
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
    async (
      name?: string,
      email?: string,
      address?: CustomerAddress,
      metadata?: Record<string, string>,
    ) => {
      await apiCreateCustomer(accountId, testClockId, name, email, address, metadata);
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
    async (customerId: string, items: SubscriptionItemInput[], options?: CreateSubscriptionOptions) => {
      await apiCreateSubscription(accountId, testClockId, customerId, items, options);
      await load();
    },
    [accountId, testClockId, load],
  );

  const cancelSubscription = useCallback(
    async (subscriptionId: string) => {
      await apiCancelSubscription(accountId, testClockId, subscriptionId);
      await load();
    },
    [accountId, testClockId, load],
  );

  const pauseSubscription = useCallback(
    async (subscriptionId: string) => {
      await apiPauseSubscription(accountId, testClockId, subscriptionId);
      await load();
    },
    [accountId, testClockId, load],
  );

  const resumeSubscription = useCallback(
    async (subscriptionId: string) => {
      await apiResumeSubscription(accountId, testClockId, subscriptionId);
      await load();
    },
    [accountId, testClockId, load],
  );

  const updateSubscriptionItems = useCallback(
    async (subscriptionId: string, items: SubscriptionItemUpdate[], prorationBehavior: string) => {
      const apiItems = items.map((item) => {
        const m: Record<string, string> = {};
        if (item.id) m.id = item.id;
        if (item.price) m.price = item.price;
        if (item.deleted) m.deleted = "true";
        return m;
      });
      await apiUpdateSubscriptionItems(accountId, testClockId, subscriptionId, apiItems, prorationBehavior);
      await load();
    },
    [accountId, testClockId, load],
  );

  const updateSubscriptionTrial = useCallback(
    async (subscriptionId: string, trialEnd: number | "now", endBehavior?: string) => {
      const trialEndStr = trialEnd === "now" ? "now" : String(trialEnd);
      await apiUpdateSubscriptionTrial(accountId, testClockId, subscriptionId, trialEndStr, endBehavior);
      await load();
    },
    [accountId, testClockId, load],
  );

  const cancelSubscriptionImmediately = useCallback(
    async (subscriptionId: string, opts: { invoiceNow: boolean; prorate: boolean }) => {
      await apiCancelSubscriptionImmediately(accountId, testClockId, subscriptionId, opts.invoiceNow, opts.prorate);
      await load();
    },
    [accountId, testClockId, load],
  );

  const updateSubscriptionCancelAt = useCallback(
    async (subscriptionId: string, cancelAt: number) => {
      await apiUpdateSubscriptionCancelAt(accountId, testClockId, subscriptionId, cancelAt);
      await load();
    },
    [accountId, testClockId, load],
  );

  const undoCancelSubscription = useCallback(
    async (subscriptionId: string) => {
      await apiUndoCancelSubscription(accountId, testClockId, subscriptionId);
      await load();
    },
    [accountId, testClockId, load],
  );

  const updateSubscriptionBillingAnchor = useCallback(
    async (subscriptionId: string, anchor: number | "now" | "unchanged", prorationBehavior: string) => {
      const anchorStr = typeof anchor === "string" ? anchor : String(anchor);
      await apiUpdateSubscriptionBillingAnchor(accountId, testClockId, subscriptionId, anchorStr, prorationBehavior);
      await load();
    },
    [accountId, testClockId, load],
  );

  const pauseSubscriptionWithOptions = useCallback(
    async (subscriptionId: string, opts: { behavior: string; resumesAt?: number }) => {
      await apiPauseSubscriptionWithOptions(accountId, testClockId, subscriptionId, opts.behavior, opts.resumesAt);
      await load();
    },
    [accountId, testClockId, load],
  );

  const applySubscriptionDiscount = useCallback(
    async (subscriptionId: string, couponId?: string, promotionCodeId?: string) => {
      await apiApplySubscriptionDiscount(accountId, testClockId, subscriptionId, couponId, promotionCodeId);
      await load();
    },
    [accountId, testClockId, load],
  );

  const subscriptionActions: SubscriptionActions = useMemo(() => ({
    cancel: cancelSubscription,
    cancelImmediately: cancelSubscriptionImmediately,
    cancelAt: updateSubscriptionCancelAt,
    undoCancel: undoCancelSubscription,
    pause: pauseSubscription,
    pauseWithOptions: pauseSubscriptionWithOptions,
    resume: resumeSubscription,
    updateItems: updateSubscriptionItems,
    updateTrial: updateSubscriptionTrial,
    updateBillingAnchor: updateSubscriptionBillingAnchor,
    applyDiscount: applySubscriptionDiscount,
  }), [
    cancelSubscription,
    cancelSubscriptionImmediately,
    updateSubscriptionCancelAt,
    undoCancelSubscription,
    pauseSubscription,
    pauseSubscriptionWithOptions,
    resumeSubscription,
    updateSubscriptionItems,
    updateSubscriptionTrial,
    updateSubscriptionBillingAnchor,
    applySubscriptionDiscount,
  ]);

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
    cancelSubscription,
    pauseSubscription,
    resumeSubscription,
    subscriptionActions,
  };
}
