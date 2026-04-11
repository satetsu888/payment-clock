/**
 * Stripe API version compatibility helpers.
 *
 * In API version 2025-03-31.basil, `current_period_start` and `current_period_end`
 * were removed from the top-level Subscription object and moved to each
 * SubscriptionItem (`items.data[]`).
 */

const SUBSCRIPTION_PERIOD_MOVED_VERSION = "2025-03-31.basil";

function hasItemLevelPeriod(apiVersion: string): boolean {
  return apiVersion >= SUBSCRIPTION_PERIOD_MOVED_VERSION;
}

export function subscriptionCurrentPeriodStart(
  subscription: Record<string, unknown>,
  apiVersion: string,
): number | null {
  if (hasItemLevelPeriod(apiVersion)) {
    const items = subscription.items as Record<string, unknown> | undefined;
    const data = (items?.data as Array<Record<string, unknown>>) || [];
    return data.length > 0 ? (data[0].current_period_start as number) ?? null : null;
  }
  return (subscription.current_period_start as number) ?? null;
}

export function subscriptionCurrentPeriodEnd(
  subscription: Record<string, unknown>,
  apiVersion: string,
): number | null {
  if (hasItemLevelPeriod(apiVersion)) {
    const items = subscription.items as Record<string, unknown> | undefined;
    const data = (items?.data as Array<Record<string, unknown>>) || [];
    return data.length > 0 ? (data[0].current_period_end as number) ?? null : null;
  }
  return (subscription.current_period_end as number) ?? null;
}
