import { FREE_SITE_LIMIT, STANDARD_SITE_LIMIT, STANDARD_TEAM_LIMIT } from "../../../lib/const";
import { getStripePrices, STRIPE_TIERS } from "../../../lib/stripe";

export const EVENT_TIERS = [...STRIPE_TIERS.map(tier => tier.events), "Custom"];

export const STANDARD_FEATURES = [
  "Everything in Free",
  `Up to ${STANDARD_SITE_LIMIT} websites`,
  `Up to ${STANDARD_TEAM_LIMIT} team members`,
  "Funnels",
  "Goals",
  "Journeys",
  "Web vitals",
  "Error tracking",
  "User profiles",
  "Retention",
  "Sessions",
  "Email reports",
  "2 year data retention",
  "Email support",
];

export const PRO_FEATURES = [
  "Everything in Standard",
  "Unlimited websites",
  "Unlimited team members",
  "Session replays",
  "5 year data retention",
  "Priority support",
];

export const ENTERPRISE_FEATURES = [
  "Everything in Pro",
  "Single Sign-On (SSO)",
  "Infinite data retention",
  "Dedicated isolated instance",
  "On-premise Installation",
  "Custom Features",
  "Whitelabeling",
  "Manual invoicing",
  "Uptime SLA",
  "Enterprise support",
  "Slack/live chat support",
];

export const FREE_FEATURES = [
  "1 user",
  `${FREE_SITE_LIMIT} website`,
  "Web analytics dashboard",
  "Custom events",
  "6 month data retention",
];

const stripePrices = getStripePrices();

export function findPriceForTier(
  eventLimit: number | string,
  interval: "month" | "year",
  planType: "standard" | "pro" = "standard"
) {
  if (eventLimit === "Custom") {
    return null;
  }

  const eventLimitValue = Number(eventLimit);
  const isAnnual = interval === "year";

  const plans = stripePrices.filter(
    plan =>
      (isAnnual
        ? plan.name.startsWith(planType) && plan.name.includes("-annual")
        : plan.name.startsWith(planType) && !plan.name.includes("-annual")) && plan.interval === interval
  );

  const matchingPlan = plans.find(plan => plan.events >= eventLimitValue);
  return matchingPlan || plans[plans.length - 1] || null;
}

export function formatEventTier(tier: number | string): string {
  if (typeof tier === "string") {
    return tier;
  }

  return tier >= 1_000_000 ? `${tier / 1_000_000}M` : `${tier / 1_000}k`;
}
