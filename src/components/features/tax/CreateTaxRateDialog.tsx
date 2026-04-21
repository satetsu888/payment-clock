import { useState } from "react";
import { Dialog } from "../../ui/Dialog";

interface CreateTaxRateDialogProps {
  onSubmit: (
    displayName: string,
    percentage: string,
    inclusive: boolean,
    country?: string,
    state?: string,
    jurisdiction?: string,
  ) => Promise<void>;
  onClose: () => void;
}

const COUNTRY_OPTIONS: Array<{ code: string; label: string }> = [
  { code: "", label: "— Not set —" },
  { code: "JP", label: "Japan (JP)" },
  { code: "US", label: "United States (US)" },
  { code: "GB", label: "United Kingdom (GB)" },
  { code: "DE", label: "Germany (DE)" },
  { code: "FR", label: "France (FR)" },
  { code: "AU", label: "Australia (AU)" },
  { code: "SG", label: "Singapore (SG)" },
  { code: "NL", label: "Netherlands (NL)" },
  { code: "IE", label: "Ireland (IE)" },
];

export function CreateTaxRateDialog({ onSubmit, onClose }: CreateTaxRateDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [percentage, setPercentage] = useState("");
  const [inclusive, setInclusive] = useState(false);
  const [country, setCountry] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    displayName.trim().length > 0 &&
    percentage.trim().length > 0 &&
    !isNaN(parseFloat(percentage));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await onSubmit(
        displayName.trim(),
        percentage.trim(),
        inclusive,
        country || undefined,
        stateCode.trim() || undefined,
        jurisdiction.trim() || undefined,
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
      <Dialog.Header title="Create Tax Rate" />
      <form onSubmit={handleSubmit}>
        <Dialog.Content>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. JP Consumption Tax"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Percentage
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                disabled={loading}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Behavior
              </label>
              <select
                value={inclusive ? "inclusive" : "exclusive"}
                onChange={(e) => setInclusive(e.target.value === "inclusive")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                disabled={loading}
              >
                <option value="exclusive">Exclusive (added on top)</option>
                <option value="inclusive">Inclusive (already included)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country (optional)
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              disabled={loading}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State (optional, ISO 3166-2)
            </label>
            <input
              type="text"
              value={stateCode}
              onChange={(e) => setStateCode(e.target.value)}
              placeholder="e.g. CA, NY"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jurisdiction (optional, shown on invoices)
            </label>
            <input
              type="text"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              placeholder="e.g. JP, CA - San Francisco"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              disabled={loading}
            />
          </div>

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
