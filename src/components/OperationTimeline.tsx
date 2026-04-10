import type { Operation } from "../lib/types";

interface OperationTimelineProps {
  operations: Operation[];
}

const operationLabels: Record<string, string> = {
  create_clock: "Created test clock",
  advance_time: "Advanced time",
  delete_clock: "Deleted test clock",
  create_customer: "Created customer",
  attach_payment_method: "Attached payment method",
  create_subscription: "Created subscription",
};

function formatTime(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}

function OperationItem({ operation }: { operation: Operation }) {
  const label =
    operationLabels[operation.operationType] || operation.operationType;

  let detail: string | null = null;
  if (operation.requestParams) {
    try {
      const params = JSON.parse(operation.requestParams);
      if (params.frozen_time) {
        const dt = new Date(params.frozen_time * 1000);
        detail = `to ${dt.toLocaleString()}`;
      }
    } catch {
      // ignore parse errors
    }
  }

  return (
    <div className="flex gap-3 py-2">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5" />
        <div className="w-px flex-1 bg-gray-200" />
      </div>
      <div className="flex-1 pb-2">
        <div className="text-sm text-gray-900">{label}</div>
        {detail && <div className="text-xs text-gray-500">{detail}</div>}
        <div className="text-xs text-gray-400">
          {formatTime(operation.createdAt)}
        </div>
      </div>
    </div>
  );
}

export function OperationTimeline({ operations }: OperationTimelineProps) {
  if (operations.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-4">
        No operations recorded yet
      </p>
    );
  }

  return (
    <div className="px-2">
      {operations.map((op) => (
        <OperationItem key={op.id} operation={op} />
      ))}
    </div>
  );
}
