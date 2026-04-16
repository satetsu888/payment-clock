import type { StripePrice } from "./types";

// Stripe zero-decimal currencies
// https://docs.stripe.com/currencies#zero-decimal
const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

const THREE_DECIMAL_CURRENCIES = new Set([
  "bhd", "iqd", "jod", "kwd", "lyd", "omr", "tnd",
]);

export function formatCurrency(amount: number, currency: string): string {
  const cur = currency.toLowerCase();
  let value: number;
  if (ZERO_DECIMAL_CURRENCIES.has(cur)) {
    value = amount;
  } else if (THREE_DECIMAL_CURRENCIES.has(cur)) {
    value = amount / 1000;
  } else {
    value = amount / 100;
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: cur,
  }).format(value);
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
