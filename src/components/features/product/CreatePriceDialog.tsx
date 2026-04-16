import { useState, useEffect } from "react";
import { formatCurrency } from "../../../lib/format";
import { listMeters, createMeter as apiCreateMeter } from "../../../lib/api";
import type { StripeProduct, StripeMeter } from "../../../lib/types";
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
  accountId: string;
  product: StripeProduct;
  onSubmit: (
    productId: string,
    unitAmount: number,
    currency: string,
    recurringInterval?: string,
    recurringIntervalCount?: number,
    nickname?: string,
    usageType?: string,
    meterId?: string,
  ) => Promise<void>;
  onClose: () => void;
}

export function CreatePriceDialog({
  accountId,
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
  const [usageType, setUsageType] = useState<"licensed" | "metered">("licensed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Meter state
  const [meters, setMeters] = useState<StripeMeter[]>([]);
  const [selectedMeterId, setSelectedMeterId] = useState("");
  const [showCreateMeter, setShowCreateMeter] = useState(false);
  const [newMeterDisplayName, setNewMeterDisplayName] = useState("");
  const [newMeterEventName, setNewMeterEventName] = useState("");
  const [newMeterAggregation, setNewMeterAggregation] = useState("sum");
  const [creatingMeter, setCreatingMeter] = useState(false);

  useEffect(() => {
    if (usageType === "metered") {
      listMeters(accountId).then(setMeters).catch(() => {});
    }
  }, [accountId, usageType]);

  const parsedAmount = parseFloat(amount);
  const unitAmount = !isNaN(parsedAmount) && parsedAmount >= 0
    ? toSmallestUnit(parsedAmount, currency)
    : null;

  const isMetered = isRecurring && usageType === "metered";
  const preview = unitAmount !== null
    ? `${formatCurrency(unitAmount, currency)}${isMetered ? "/unit" : ""}${isRecurring ? `/${interval}` : " (one-time)"}`
    : null;

  const canSubmit = unitAmount !== null && (!isMetered || selectedMeterId !== "");

  const handleCreateMeter = async () => {
    if (!newMeterDisplayName.trim() || !newMeterEventName.trim()) return;
    setCreatingMeter(true);
    try {
      const meter = await apiCreateMeter(
        accountId,
        newMeterDisplayName.trim(),
        newMeterEventName.trim(),
        newMeterAggregation,
      );
      setMeters((prev) => [...prev, meter]);
      setSelectedMeterId(meter.id);
      setShowCreateMeter(false);
      setNewMeterDisplayName("");
      setNewMeterEventName("");
      setNewMeterAggregation("sum");
    } catch (e) {
      setError(String(e));
    } finally {
      setCreatingMeter(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const count = parseInt(intervalCount, 10);
      await onSubmit(
        product.id,
        unitAmount!,
        currency,
        isRecurring ? interval : undefined,
        isRecurring && count > 1 ? count : undefined,
        nickname.trim() || undefined,
        isMetered ? "metered" : undefined,
        isMetered ? selectedMeterId : undefined,
      );
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const selectedMeter = meters.find((m) => m.id === selectedMeterId);

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
                {isMetered ? "Unit Amount" : "Amount"}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={isMetered ? "0.04" : "0.00"}
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
                onChange={(e) => {
                  setIsRecurring(e.target.checked);
                  if (!e.target.checked) setUsageType("licensed");
                }}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                disabled={loading}
              />
              Recurring
            </label>
          </div>

          {isRecurring && (
            <>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usage Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="usageType"
                      value="licensed"
                      checked={usageType === "licensed"}
                      onChange={() => setUsageType("licensed")}
                      className="text-indigo-600 focus:ring-indigo-500"
                      disabled={loading}
                    />
                    Licensed
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="usageType"
                      value="metered"
                      checked={usageType === "metered"}
                      onChange={() => setUsageType("metered")}
                      className="text-indigo-600 focus:ring-indigo-500"
                      disabled={loading}
                    />
                    Metered
                  </label>
                </div>
              </div>

              {isMetered && (
                <div className="space-y-3 pl-1 border-l-2 border-indigo-200 ml-1">
                  <div className="pl-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Meter
                    </label>
                    {meters.length > 0 && !showCreateMeter ? (
                      <div className="space-y-2">
                        <select
                          value={selectedMeterId}
                          onChange={(e) => setSelectedMeterId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          disabled={loading}
                        >
                          <option value="">Select a meter...</option>
                          {meters.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.display_name} ({m.event_name}, {m.default_aggregation.formula})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowCreateMeter(true)}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          + Create new meter
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 bg-gray-50 rounded-md p-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Display Name
                          </label>
                          <input
                            type="text"
                            value={newMeterDisplayName}
                            onChange={(e) => setNewMeterDisplayName(e.target.value)}
                            placeholder="e.g. API Requests"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            disabled={creatingMeter}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Event Name
                          </label>
                          <input
                            type="text"
                            value={newMeterEventName}
                            onChange={(e) => setNewMeterEventName(e.target.value)}
                            placeholder="e.g. api_requests"
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            disabled={creatingMeter}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Aggregation
                          </label>
                          <select
                            value={newMeterAggregation}
                            onChange={(e) => setNewMeterAggregation(e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            disabled={creatingMeter}
                          >
                            <option value="sum">Sum</option>
                            <option value="count">Count</option>
                            <option value="last">Last</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleCreateMeter}
                            disabled={creatingMeter || !newMeterDisplayName.trim() || !newMeterEventName.trim()}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {creatingMeter ? "Creating..." : "Create Meter"}
                          </button>
                          {meters.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowCreateMeter(false)}
                              className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedMeter && (
                      <p className="text-xs text-gray-500 mt-1">
                        Aggregation: <span className="font-medium">{selectedMeter.default_aggregation.formula}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
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
              {isMetered && " (metered)"}
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
            disabled={!canSubmit}
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
