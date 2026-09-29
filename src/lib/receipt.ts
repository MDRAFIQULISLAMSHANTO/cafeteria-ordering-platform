// Receipt wording per STS's answers (C8 §8–9), shared by the printed receipt
// and the order page so both always say the same thing.
import { employeeDiscountNote, vatLabel } from "./rules";

export const PAYMENT_LABEL: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  card: "Card (Visa / Mastercard / Amex)",
  cash: "Cash at counter",
  card_terminal: "Card at counter",
  invoice: "Cost-centre invoice (monthly)",
};

export function paymentLabel(method: string): string {
  return PAYMENT_LABEL[method] ?? method;
}

type OrderLike = { accountType: string; discount: number; discountRule: string | null; vat: number };
type OutletLike = { kind: string };
type CustomerLike = { discountEligible: boolean };

/** Discount and VAT rows: every employee receipt shows both, even at ৳0. */
export function taxAndDiscountRows(order: OrderLike, outlet: OutletLike, customer: CustomerLike) {
  const employee = order.accountType === "employee";
  const discount =
    order.discount > 0
      ? { label: order.discountRule ?? "Discount", amount: -order.discount }
      : employee
        ? { label: employeeDiscountNote(outlet.kind === "parent_lounge", customer.discountEligible), amount: 0 }
        : null;
  const vat = { label: vatLabel(order.accountType), amount: employee ? 0 : order.vat };
  return { discount, vat };
}
