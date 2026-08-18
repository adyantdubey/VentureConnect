export const DEMO_LOGINS = {
  founder: {
    label: "Founder demo",
    email: "founder@innovestart.demo",
    password: "FounderDemo@2026",
  },
  investor: {
    label: "Investor demo",
    email: "investor@innovestart.demo",
    password: "InvestorDemo@2026",
  },
} as const;

export function demoEmailFor(role: "founder" | "investor", zeroBasedIndex: number) {
  if (zeroBasedIndex === 0) return DEMO_LOGINS[role].email;
  return `${role}${String(zeroBasedIndex + 1).padStart(2, "0")}@innovestart.demo`;
}

export function demoPasswordFor(role: "founder" | "investor") {
  return DEMO_LOGINS[role].password;
}
