import type { StripePrice } from "./types";

export function formatCurrency(amount: number, currency: string): string {
  const formatted = (amount / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency.toUpperCase()}`;
}

export function formatPrice(price: StripePrice): string {
  const amount = price.unit_amount
    ? formatCurrency(price.unit_amount, price.currency)
    : "Usage-based";
  const interval = price.recurring
    ? `/${price.recurring.interval}`
    : " (one-time)";
  const label = price.nickname ? `${price.nickname} - ` : "";
  return `${label}${amount}${interval}`;
}

export function formatBrand(brand: string): string {
  const brands: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    amex: "Amex",
    discover: "Discover",
    diners: "Diners",
    jcb: "JCB",
    unionpay: "UnionPay",
  };
  return brands[brand] || brand;
}
