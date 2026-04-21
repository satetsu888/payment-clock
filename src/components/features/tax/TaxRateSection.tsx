import { useState } from "react";
import { Percent } from "lucide-react";
import { useTaxRates } from "../../../hooks/useTaxRates";
import type { StripeTaxRate } from "../../../lib/types";
import { DropdownMenu } from "../../ui/DropdownMenu";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { StripeIdLink } from "../../ui/StripeIdLink";
import { CreateTaxRateDialog } from "./CreateTaxRateDialog";

interface TaxRateSectionProps {
  accountId: string;
}

function describeLocation(rate: StripeTaxRate): string {
  const parts = [rate.country, rate.state].filter(Boolean) as string[];
  const loc = parts.join(" / ");
  if (rate.jurisdiction) {
    return loc ? `${rate.jurisdiction} (${loc})` : rate.jurisdiction;
  }
  return loc || "—";
}

export function TaxRateSection({ accountId }: TaxRateSectionProps) {
  const {
    taxRates,
    loading,
    error,
    reload,
    createTaxRate,
    archiveTaxRate,
  } = useTaxRates(accountId);

  const [showCreate, setShowCreate] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<StripeTaxRate | null>(null);
  const [archiveLoading, setArchiveLoading] = useState(false);

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setArchiveLoading(true);
    try {
      await archiveTaxRate(archiveTarget.id);
    } finally {
      setArchiveLoading(false);
      setArchiveTarget(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Tax Rates</h2>
          {!loading && (
            <span className="text-xs text-gray-400">({taxRates.length})</span>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md"
        >
          + New Tax Rate
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Manual tax rates used in Subscription items. For automatic tax, use Stripe Tax instead.
      </p>

      {loading && (
        <p className="text-sm text-gray-500 text-center py-4">Loading...</p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md mb-3">
          {error}
          <button onClick={reload} className="ml-2 underline">Retry</button>
        </p>
      )}

      {!loading && taxRates.length === 0 && !error && (
        <p className="text-sm text-gray-400 text-center py-4">
          No tax rates yet.
        </p>
      )}

      {taxRates.length > 0 && (
        <div className="border border-gray-200 rounded-md overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                <th className="px-3 py-1.5 text-left font-medium">Name</th>
                <th className="px-3 py-1.5 text-right font-medium">Rate</th>
                <th className="px-3 py-1.5 text-left font-medium">Behavior</th>
                <th className="px-3 py-1.5 text-left font-medium">Location</th>
                <th className="px-3 py-1.5 text-left font-medium">ID</th>
                <th className="px-3 py-1.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {taxRates.map((rate) => (
                <tr key={rate.id} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-medium text-gray-800">
                    {rate.display_name}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-gray-700">
                    {rate.percentage}%
                  </td>
                  <td className="px-3 py-1.5 text-gray-600">
                    {rate.inclusive ? "Inclusive" : "Exclusive"}
                  </td>
                  <td className="px-3 py-1.5 text-gray-600">
                    {describeLocation(rate)}
                  </td>
                  <td className="px-3 py-1.5">
                    <StripeIdLink stripeId={rate.id} className="text-gray-500 text-[11px]" />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <DropdownMenu
                      items={[
                        {
                          label: "Archive",
                          onClick: () => setArchiveTarget(rate),
                          danger: true,
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateTaxRateDialog
          onSubmit={async (displayName, percentage, inclusive, country, stateCode, jurisdiction) => {
            await createTaxRate(displayName, percentage, inclusive, country, stateCode, jurisdiction);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {archiveTarget && (
        <ConfirmDialog
          title="Archive Tax Rate"
          message={`"${archiveTarget.display_name}" will be archived and no longer available for new subscriptions. Existing subscriptions keep using it.`}
          confirmLabel="Archive"
          onConfirm={handleArchive}
          onCancel={() => setArchiveTarget(null)}
          loading={archiveLoading}
        />
      )}
    </div>
  );
}
