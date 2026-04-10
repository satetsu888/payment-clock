import { useState } from "react";

interface ApiKeyInputProps {
  onSubmit: (apiKey: string) => Promise<void>;
}

export function ApiKeyInput({ onSubmit }: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidPrefix = apiKey === "" || apiKey.startsWith("sk_test_");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.startsWith("sk_test_")) {
      setError("API Key must start with sk_test_");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(apiKey);
      setApiKey("");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="api-key"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Stripe Test API Key
        </label>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk_test_..."
          className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            !isValidPrefix ? "border-red-300" : "border-gray-300"
          }`}
          disabled={loading}
        />
        {!isValidPrefix && (
          <p className="mt-1 text-xs text-red-600">
            Only test mode keys (sk_test_) are accepted
          </p>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !apiKey.startsWith("sk_test_")}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Connecting..." : "Connect Account"}
      </button>
    </form>
  );
}
