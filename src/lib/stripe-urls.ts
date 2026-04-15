const RESOURCE_PATH_MAP: Record<string, string> = {
  clock_: "test/billing/subscriptions/test-clocks",
  cus_: "test/customers",
  sub_: "test/subscriptions",
  in_: "test/invoices",
  pi_: "test/payments",
  prod_: "test/products",
  price_: "test/prices",
};

const PREFIXES = Object.keys(RESOURCE_PATH_MAP);

export function getStripeDashboardUrl(stripeId: string): string | null {
  const prefix = PREFIXES.find((p) => stripeId.startsWith(p));
  if (!prefix) return null;

  const path = RESOURCE_PATH_MAP[prefix];
  return `https://dashboard.stripe.com/${path}/${stripeId}`;
}
