// Sample "October" HR staff list for the monthly-sync demo (fictional people).
// Against the seeded list it: keeps the demo personas unchanged, adds one
// joiner (Shirin), moves Mitu to the Parent Lounge with the staff discount,
// makes Rakib discount-eligible and drops Nadia (a leaver — her account is
// deactivated and her number can no longer sign in).
export const HR_SAMPLE_CSV = `employee_id,name,phone,outlet_id,cost_centre,discount_eligible,coordinator
E1023,Farhana Akter,01700000003,ISD-PL,ISD-ADMIN,yes,no
E2001,Tanvir Ahmed,01700000004,HO,HO-FIN,no,yes
E1044,Sabbir Hasan,01700000005,ISD-CAF,ISD-ACAD,yes,no
E3010,Rakib Chowdhury,01700000007,UCBD,UCBD-OPS,yes,no
E2015,Mitu Sultana,01700000008,ISD-PL,HO-HR,yes,no
E1120,Shirin Akhter,01700000010,ISD-PL,ISD-ADMIN,yes,no
`;
