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

const pad2 = (n: number) => n.toString().padStart(2, "0");

/** "2026-04-12 09:00 UTC" */
export function formatDateTime(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())} UTC`;
}

/** "4/12 09:00" (UTC) */
export function formatShortDateTime(date: Date): string {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
}

/** "4/12" (UTC) */
export function formatDateLabel(date: Date): string {
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

/** datetime-local input用 "2026-04-12T09:00" (UTC) */
export function toDatetimeLocalUTC(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}T${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
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
