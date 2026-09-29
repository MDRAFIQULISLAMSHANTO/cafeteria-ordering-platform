// Demo actors for client walkthroughs. The presenter signs in once, then
// switches actor from the "Demo as" menu. Every persona is a seeded sandbox
// account (test number, OTP 123456) — real registered customers cannot switch.
// Plain data only, so the switcher can import it on the client.

export type PersonaId = "c-parent" | "c-student" | "c-employee" | "c-employee-caf" | "c-coordinator";

export type Persona = {
  id: PersonaId;
  actor: string; // short label in the menu
  who: string; // what the presenter should expect to see
  customer: {
    id: PersonaId;
    phone: string;
    name: string;
    accountType: "parent" | "student" | "employee";
    outletId: string;
    classGrade?: string;
    section?: string;
    employeeId?: string;
    costCentre?: string;
    discountEligible?: boolean;
    coordinator?: boolean;
  };
};

export const PERSONAS: Persona[] = [
  {
    id: "c-parent",
    actor: "Parent — Nusrat",
    who: "ISD Cafeteria · pays online · 5% VAT included",
    customer: { id: "c-parent", phone: "01700000001", name: "Nusrat Rahman", accountType: "parent", outletId: "ISD-CAF" },
  },
  {
    id: "c-student",
    actor: "Student — Arif (8B)",
    who: "ISD Cafeteria · pays online · 5% VAT included · class on the ticket",
    customer: { id: "c-student", phone: "01700000002", name: "Arif Hossain", accountType: "student", outletId: "ISD-CAF", classGrade: "8", section: "B" },
  },
  {
    id: "c-employee",
    actor: "Employee — Farhana (Parent Lounge)",
    who: "ISD Parent Lounge · 20% staff discount · VAT 0% · pay online or at the counter",
    customer: { id: "c-employee", phone: "01700000003", name: "Farhana Akter", accountType: "employee", outletId: "ISD-PL", employeeId: "E1023", costCentre: "ISD-ADMIN", discountEligible: true },
  },
  {
    id: "c-employee-caf",
    actor: "Employee — Sabbir (Cafeteria)",
    who: "ISD Cafeteria · VAT 0% · no discount (Parent Lounge only)",
    customer: { id: "c-employee-caf", phone: "01700000005", name: "Sabbir Hasan", accountType: "employee", outletId: "ISD-CAF", employeeId: "E1044", costCentre: "ISD-ACAD", discountEligible: true },
  },
  {
    id: "c-coordinator",
    actor: "Coordinator — Tanvir (Head Office)",
    who: "Corporate Office Cafeteria · VAT 0% · bulk meeting orders billed to cost centre",
    customer: { id: "c-coordinator", phone: "01700000004", name: "Tanvir Ahmed", accountType: "employee", outletId: "HO", employeeId: "E2001", costCentre: "HO-FIN", coordinator: true },
  },
];

export const STAFF_SCREENS = [
  { id: "kds", actor: "Kitchen display", path: "/kds" },
  { id: "counter", actor: "Counter · collection", path: "/counter" },
  { id: "status", actor: "Pickup TV", path: "/status" },
  { id: "admin", actor: "Operations", path: "/admin" },
] as const;

export type StaffScreenId = (typeof STAFF_SCREENS)[number]["id"];

export function isPersonaId(id: string | null | undefined): id is PersonaId {
  return PERSONAS.some((p) => p.id === id);
}

export function personaFor(id: string | null | undefined): Persona | null {
  return PERSONAS.find((p) => p.id === id) ?? null;
}
