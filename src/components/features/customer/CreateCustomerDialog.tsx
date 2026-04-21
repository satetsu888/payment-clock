import { useState } from "react";
import type { CustomerAddress } from "../../../lib/types";
import { Dialog } from "../../ui/Dialog";

interface CreateCustomerDialogProps {
  onSubmit: (
    name?: string,
    email?: string,
    address?: CustomerAddress,
    metadata?: Record<string, string>,
  ) => Promise<void>;
  onClose: () => void;
  customerCount: number;
}

const COUNTRY_OPTIONS: Array<{ code: string; label: string }> = [
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

export function CreateCustomerDialog({
  onSubmit,
  onClose,
  customerCount,
}: CreateCustomerDialogProps) {
  const [name, setName] = useState(`customer${customerCount + 1}`);
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const meta = name ? { payment_clock_label: name } : undefined;
      let address: CustomerAddress | undefined;
      if (country) {
        address = { country };
        if (country === "US" && postalCode) {
          address.postal_code = postalCode;
        }
      }
      await onSubmit(name || undefined, email || undefined, address, meta);
      onClose();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog onClose={onClose} size="md">
      <Dialog.Header title="Create Customer" />
      <form onSubmit={handleSubmit}>
        <Dialog.Content>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country (optional, for Stripe Tax)
            </label>
            <select
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                if (e.target.value !== "US") setPostalCode("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              disabled={loading}
            >
              <option value="">— Not set —</option>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Required for automatic tax calculation on subscriptions.
            </p>
          </div>
          {country === "US" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Postal code (US sales tax varies by ZIP)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d{5}"
                maxLength={5}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))}
                placeholder="94103"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                disabled={loading}
              />
              <p className="text-xs text-gray-400 mt-1">
                5-digit ZIP. Try 94103 (CA) vs 10001 (NY) to see different tax rates.
              </p>
            </div>
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
