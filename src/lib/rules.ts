// Client rules (C8, returned 28 Sep 2026) plus the assumptions the prototype
// runs on until STS confirms them. Every assumption is labelled "pending"
// wherever it shows in the UI.

export const RULES = {
  maxDaysAhead: 7,
  // Pending client confirmation: 8 PM previous day; same day 60 min before the slot
  nextDayCutoff: "20:00",
  sameDayCutoffMinutes: 60,
  vatRate: 5, // Parent/Student only; employees VAT-free (C8)
  // Pending STS Finance: printed menu prices are VAT-inclusive
  pricesIncludeVat: true,
  employeeDiscountPercent: 20, // Parent Lounge only, eligible HR-verified employees
  otpTtlSeconds: 300,
  otpMaxAttempts: 5,
  lateAfterMinutes: 15,
} as const;

export const PENDING = {
  cutoffs: "Cut-off times pending STS confirmation",
  vat: "VAT-inclusive prices pending STS Finance confirmation",
  menu: "Menu-to-outlet assignment is a sample until Invento maps the menus",
  slots: "Pickup slots are samples until STS supplies campus timings",
  gateway: "Sandbox payment — no money moves",
  sms: "Sandbox SMS — shown in the demo inbox",
} as const;

export type AccountType = "parent" | "student" | "employee";

export const ACCOUNT_LABEL: Record<AccountType, string> = {
  parent: "Parent",
  student: "Student",
  employee: "Employee",
};

export function money(poisha: number): string {
  const taka = poisha / 100;
  return `৳${taka.toLocaleString("en-IN", { minimumFractionDigits: taka % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export type PriceInput = {
  accountType: AccountType;
  isParentLounge: boolean;
  discountEligible: boolean;
  lines: { unitPrice: number; qty: number }[];
};

export type PriceResult = {
  lineTotals: number[];
  subtotal: number; // what the items cost before discount (VAT removed for employees)
  discount: number;
  vat: number; // VAT contained in the total (Parent/Student)
  total: number;
  vatRule: string;
  discountRule: string | null;
  /** For employees without the discount: why (shown as a ৳0 line). */
  discountNote: string | null;
};

/** VAT label by account type (C8 §9: VAT depends on account type, not outlet). */
export function vatLabel(accountType: string): string {
  return accountType === "employee" ? "VAT 0% — employee (VAT-free)" : `VAT ${RULES.vatRate}% included`;
}

/** The employee-discount line every employee receipt carries (C8 §8–9). */
export function employeeDiscountNote(isParentLounge: boolean, discountEligible: boolean): string {
  if (!isParentLounge) return "Employee discount — Parent Lounge only";
  return discountEligible ? `Employee ${RULES.employeeDiscountPercent}% · Parent Lounge` : "Employee discount — not eligible on the HR list";
}

/** Unit price the account pays before any discount: VAT is taken out for employees. */
export function unitBeforeDiscount(accountType: string, menuPrice: number): number {
  return accountType === "employee" ? Math.round((menuPrice * 100) / (100 + RULES.vatRate)) : menuPrice;
}

// Printed prices are treated as VAT-inclusive (pending Finance).
// - Parent/Student: pay the printed price; 5% VAT is shown as included.
// - Employee: VAT-free, so the 5% VAT is taken out of the printed price;
//   eligible employees at a Parent Lounge then get 20% off (no stacking with
//   other offers — there are none in the prototype).
export function price(input: PriceInput): PriceResult {
  const { accountType, isParentLounge, discountEligible } = input;
  const employee = accountType === "employee";
  const exVat = (p: number) => unitBeforeDiscount("employee", p);

  const base = input.lines.map((l) => unitBeforeDiscount(accountType, l.unitPrice) * l.qty);
  const subtotal = base.reduce((a, b) => a + b, 0);

  const discountApplies = employee && discountEligible && isParentLounge;
  const lineTotals = base.map((b) => (discountApplies ? Math.round((b * (100 - RULES.employeeDiscountPercent)) / 100) : b));
  const total = lineTotals.reduce((a, b) => a + b, 0);
  const discount = subtotal - total;

  const vat = employee ? 0 : total - exVat(total);
  return {
    lineTotals,
    subtotal,
    discount,
    vat,
    total,
    vatRule: vatLabel(accountType),
    discountRule: discountApplies ? `Employee ${RULES.employeeDiscountPercent}% · Parent Lounge` : null,
    discountNote: employee && !discountApplies ? employeeDiscountNote(isParentLounge, discountEligible) : null,
  };
}
