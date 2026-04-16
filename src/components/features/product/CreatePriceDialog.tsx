import { useState } from "react";
import { formatCurrency } from "../../../lib/format";
import type { StripeProduct } from "../../../lib/types";
import { Dialog } from "../../ui/Dialog";

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
  "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

const THREE_DECIMAL_CURRENCIES = new Set([
  "bhd", "iqd", "jod", "kwd", "lyd", "omr", "tnd",
]);

function toSmallestUnit(displayAmount: number, currency: string): number {
  const cur = currency.toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(cur)) return Math.round(displayAmount);
  if (THREE_DECIMAL_CURRENCIES.has(cur)) return Math.round(displayAmount * 1000);
  return Math.round(displayAmount * 100);
}

interface CreatePriceDialogProps {
  product: StripeProduct;
  onSubmit: (
    productId: string,
    unitAmount: number,
    currency: string,
    recurringInterval?: string,
    recurringIntervalCount?: number,
    nickname?: string,
  ) => Promise<void>;
  onClose: () => void;
}

export function CreatePriceDialog({
  product,
  onSubmit,
  onClose,
}: CreatePriceDialogProps) {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("usd");
  const [interval, setInterval] = useState("month");
  const [intervalCount, setIntervalCount] = useState("1");
  const [nickname, setNickname] = useState("");
  const [isRecurring, setIsRecurring] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = parseFloat(amount);
  const unitAmount = !isNaN(parsedAmount) && parsedAmount >= 0
    ? toSmallestUnit(parsedAmount, currency)
    : null;

  const preview = unitAmount !== null
    ? `${formatCurrency(unitAmount, currency)}${isRecurring ? `/${interval}` : " (one-time)"}`
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (unitAmount === null) return;
    setLoading(true);
    setError(null);
    try {
      const count = parseInt(intervalCount, 10);
      await onSubmit(
        product.id,
        unitAmount,
        currency,
        isRecurring ? interval : undefined,
        isRecurring && count > 1 ? count : undefined,
        nickname.trim() || undefined,
      );
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog onClose={onClose} size="md">
      <Dialog.Header title="Create Price" />
      <form onSubmit={handleSubmit}>
        <Dialog.Content>
          <p className="text-xs text-gray-500">
            Product: <span className="font-medium text-gray-700">{product.name}</span>
          </p>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                disabled={loading}
                autoFocus
              />
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                disabled={loading}
              >
                <option value="usd">USD</option>
                <option value="eur">EUR</option>
                <option value="gbp">GBP</option>
                <option value="jpy">JPY</option>
                <option value="cad">CAD</option>
                <option value="aud">AUD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                disabled={loading}
              />
              Recurring
            </label>
          </div>

          {isRecurring && (
            <div className="flex gap-3">
              <div className="w-28">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Every
                </label>
                <input
                  type="number"
                  min="1"
                  value={intervalCount}
                  onChange={(e) => setIntervalCount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  disabled={loading}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Interval
                </label>
                <select
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  disabled={loading}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nickname (optional)
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Monthly Basic"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              disabled={loading}
            />
          </div>

          {preview && (
            <p className="text-sm text-gray-500">
              Preview: <span className="font-medium text-gray-700">{preview}</span>
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
              {error}
            </p>
          )}
        </Dialog.Content>
        <Dialog.Footer>
          <Dialog.CancelButton onClick={onClose} disabled={loading} />
          <Dialog.ActionButton
            type="submit"
            disabled={unitAmount === null}
            loading={loading}
            loadingText="Creating..."
          >
            Create
          </Dialog.ActionButton>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
}
