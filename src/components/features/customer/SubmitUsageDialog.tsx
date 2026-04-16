import { useState, useEffect } from "react";
import { listMeters, createMeterEvent } from "../../../lib/api";
import type { StripeMeter, ResourceItem } from "../../../lib/types";
import { Dialog } from "../../ui/Dialog";

function hasMeteredItem(subscriptions: ResourceItem[]): boolean {
  for (const sub of subscriptions) {
    const items = (sub.data.items as Record<string, unknown>)?.data as Array<Record<string, unknown>> | undefined;
    if (!items) continue;
    for (const item of items) {
      const price = item.price as Record<string, unknown> | undefined;
      if (!price) continue;
      const recurring = price.recurring as Record<string, unknown> | undefined;
      if (recurring?.usage_type === "metered") return true;
    }
  }
  return false;
}

interface SubmitUsageDialogProps {
  accountId: string;
  testClockId: string;
  customerId: string;
  frozenTime: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function SubmitUsageDialog({
  accountId,
  testClockId,
  customerId,
  frozenTime,
  onClose,
  onSubmitted,
}: SubmitUsageDialogProps) {
  const [meters, setMeters] = useState<StripeMeter[]>([]);
  const [selectedEventName, setSelectedEventName] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMeters(accountId).then((allMeters) => {
      setMeters(allMeters);
      if (allMeters.length === 1) {
        setSelectedEventName(allMeters[0].event_name);
      }
    }).catch(() => {});
  }, [accountId]);

  const frozenTimestamp = Math.floor(new Date(frozenTime).getTime() / 1000);
  const selectedMeter = meters.find((m) => m.event_name === selectedEventName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventName || !value) return;
    setLoading(true);
    setError(null);
    try {
      await createMeterEvent(
        accountId,
        testClockId,
        selectedEventName,
        customerId,
        value,
        frozenTimestamp,
      );
      onSubmitted();
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog onClose={onClose} size="md">
      <Dialog.Header title="Report Usage" />
      <form onSubmit={handleSubmit}>
        <Dialog.Content>
          {meters.length === 0 ? (
            <p className="text-sm text-gray-500">Loading meters...</p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meter
                </label>
                <select
                  value={selectedEventName}
                  onChange={(e) => setSelectedEventName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  disabled={loading}
                >
                  {meters.length > 1 && <option value="">Select a meter...</option>}
                  {meters.map((m) => (
                    <option key={m.id} value={m.event_name}>
                      {m.display_name} ({m.default_aggregation.formula})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <p className="text-xs text-gray-500">
                Timestamp: <span className="font-medium">{frozenTime}</span>
                {selectedMeter && (
                  <>
                    <br />
                    Event name: <span className="font-mono text-gray-600">{selectedMeter.event_name}</span>
                  </>
                )}
              </p>
            </>
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
            disabled={!selectedEventName || !value || loading}
            loading={loading}
            loadingText="Submitting..."
          >
            Submit
          </Dialog.ActionButton>
        </Dialog.Footer>
      </form>
    </Dialog>
  );
}

export function hasMeteredSubscriptions(subscriptions: ResourceItem[]): boolean {
  return hasMeteredItem(subscriptions);
}
