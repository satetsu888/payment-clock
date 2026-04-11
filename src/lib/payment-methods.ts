export interface TestPaymentMethod {
  id: string;
  label: string;
}

export interface TestPaymentMethodGroup {
  label: string;
  methods: TestPaymentMethod[];
}

export const PM_VISA: TestPaymentMethod = { id: "pm_card_visa", label: "Visa (4242)" };
export const PM_MASTERCARD: TestPaymentMethod = { id: "pm_card_mastercard", label: "Mastercard (5555)" };
export const PM_AMEX: TestPaymentMethod = { id: "pm_card_amex", label: "Amex (3782)" };
export const PM_VISA_DEBIT: TestPaymentMethod = { id: "pm_card_visa_debit", label: "Visa Debit" };
export const PM_CHARGE_FAIL: TestPaymentMethod = { id: "pm_card_chargeCustomerFail", label: "Charge Fail" };

export const TEST_PAYMENT_METHOD_GROUPS: TestPaymentMethodGroup[] = [
  {
    label: "Success",
    methods: [PM_VISA, PM_MASTERCARD, PM_AMEX, PM_VISA_DEBIT],
  },
  {
    label: "Decline",
    methods: [PM_CHARGE_FAIL],
  },
];
