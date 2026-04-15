import { useState } from "react";

interface ApplyDiscountDialogProps {
  subscriptionId: string;
  onSubmit: (couponId?: string, promotionCodeId?: string) => Promise<void>;
  onClose: () => void;
}

type DiscountType = "coupon" | "promotion_code";

export function ApplyDiscountDialog({
  onSubmit,
  onClose,
}: ApplyDiscountDialogProps) {
  const [discountType, setDiscountType] = useState<DiscountType>("coupon");
  const [couponId, setCouponId] = useState("");
  const [promotionCodeId, setPromotionCodeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = discountType === "coupon" ? couponId : promotionCodeId;
  const canSubmit = value.trim().length > 0;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      if (discountType === "coupon") {
        await onSubmit(couponId.trim(), undefined);
      } else {
        await onSubmit(undefined, promotionCodeId.trim());
      }
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Apply Discount</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Type selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name="discountType"
                checked={discountType === "coupon"}
                onChange={() => setDiscountType("coupon")}
              />
              <span>Coupon ID</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="radio"
                name="discountType"
                checked={discountType === "promotion_code"}
                onChange={() => setDiscountType("promotion_code")}
              />
              <span>Promotion Code ID</span>
            </label>
          </div>

          {/* Input */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {discountType === "coupon" ? "Coupon ID" : "Promotion Code ID"}
            </label>
            <input
              type="text"
              value={discountType === "coupon" ? couponId : promotionCodeId}
              onChange={(e) =>
                discountType === "coupon"
                  ? setCouponId(e.target.value)
                  : setPromotionCodeId(e.target.value)
              }
              placeholder={discountType === "coupon" ? "e.g. SUMMER20" : "e.g. promo_xxx"}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter the ID from Stripe Dashboard
            </p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
            className="px-3 py-1.5 text-xs text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
