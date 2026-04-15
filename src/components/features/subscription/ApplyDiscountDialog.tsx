import { useState } from "react";
import { Dialog } from "../../ui/Dialog";

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
    <Dialog onClose={onClose} size="md">
      <Dialog.Header title="Apply Discount" />
      <Dialog.Content compact>
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
            className="w-full text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Enter the ID from Stripe Dashboard
          </p>
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </Dialog.Content>
      <Dialog.Footer>
        <Dialog.CancelButton size="compact" onClick={onClose} />
        <Dialog.ActionButton
          size="compact"
          onClick={handleSubmit}
          disabled={!canSubmit}
          loading={loading}
          loadingText="Applying..."
        >
          Apply
        </Dialog.ActionButton>
      </Dialog.Footer>
    </Dialog>
  );
}
