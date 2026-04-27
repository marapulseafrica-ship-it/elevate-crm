export type PlanTier = "starter" | "basic" | "pro" | "premium";

export interface PlanLimits {
  customers: number;       // max customers (Infinity = unlimited)
  campaigns: number;       // max campaigns per month (Infinity = unlimited)
}

export interface PlanConfig extends PlanLimits {
  name: string;
  label: string;
  price: string;
  priceNote: string;
  color: string;
  features: string[];
  notIncluded: string[];
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  starter: {
    name: "starter",
    label: "Starter",
    price: "$50",
    priceNote: "for 3 months",
    color: "blue",
    customers: 500,
    campaigns: 3,
    features: [
      "Up to 500 customers",
      "3 campaigns per month",
      "QR check-in",
      "Dashboard & analytics",
      "Basic notifications",
      "Customer segments",
    ],
    notIncluded: [
      "Menu management",
      "Revenue analytics",
      "AI food insights",
      "AI campaign timing",
      "Promo ROI",
      "Bi-weekly summary",
    ],
  },
  basic: {
    name: "basic",
    label: "Basic",
    price: "$70",
    priceNote: "per month",
    color: "emerald",
    customers: 2000,
    campaigns: 10,
    features: [
      "Up to 2,000 customers",
      "10 campaigns per month",
      "Everything in Starter",
      "Menu management",
      "Full analytics",
      "Campaign history",
    ],
    notIncluded: [
      "Revenue analytics",
      "AI food insights",
      "AI campaign timing",
      "Promo ROI",
      "Bi-weekly summary",
    ],
  },
  pro: {
    name: "pro",
    label: "Pro",
    price: "$140",
    priceNote: "per month",
    color: "orange",
    customers: 10000,
    campaigns: 50,
    features: [
      "Up to 10,000 customers",
      "50 campaigns per month",
      "Everything in Basic",
      "Revenue analytics",
      "AI food insights",
      "AI campaign timing",
      "Promo ROI tracking",
      "Bi-weekly AI summary",
    ],
    notIncluded: [],
  },
  premium: {
    name: "premium",
    label: "Premium",
    price: "$210",
    priceNote: "per month",
    color: "purple",
    customers: Infinity,
    campaigns: Infinity,
    features: [
      "Unlimited customers",
      "Unlimited campaigns",
      "Everything in Pro",
      "Priority support",
    ],
    notIncluded: [],
  },
};

const PLAN_ORDER: PlanTier[] = ["starter", "basic", "pro", "premium"];

const FEATURE_TIER_MAP: Record<string, PlanTier> = {
  dashboard:        "starter",
  checkin:          "starter",
  campaigns:        "starter",
  notifications:    "starter",
  customers:        "starter",
  menu:             "basic",
  analytics:        "basic",
  revenue_analytics:"pro",
  ai_insights:      "pro",
  ai_timing:        "pro",
  promo_roi:        "pro",
  biweekly_summary: "pro",
};

export function canAccess(tier: PlanTier, feature: string): boolean {
  const required = FEATURE_TIER_MAP[feature];
  if (!required) return true;
  return PLAN_ORDER.indexOf(tier) >= PLAN_ORDER.indexOf(required);
}

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return { customers: PLANS[tier].customers, campaigns: PLANS[tier].campaigns };
}

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
}

export function getMonthsForPlan(tier: PlanTier): number {
  return tier === "starter" ? 3 : 1;
}
