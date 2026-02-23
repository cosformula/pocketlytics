import { DEFAULT_EVENT_LIMIT } from "../../../../lib/const";
import { ComparisonSection } from "../components/ComparisonPage";

export const plausibleComparisonData: ComparisonSection[] = [
  {
    title: "Core Analytics Features",
    features: [
      {
        name: "Simple dashboard",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Real-time data",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Visitor analytics",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Page analytics",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Source tracking",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Device/OS/Browser stats",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "UTM tracking",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Custom events",
        pocketlyticsValue: "With attributes",
        competitorValue: "Basic",
      },
      {
        name: "Conversion goals",
        pocketlyticsValue: true,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Advanced Features",
    features: [
      {
        name: "Session Replay",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Funnels",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "User journeys (Sankey)",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "User profiles",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Sessions tracking",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Real-time globe view",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Web Vitals dashboard",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Error tracking",
        pocketlyticsValue: true,
        competitorValue: false,
      },
    ],
  },
  {
    title: "Privacy & Open Source",
    features: [
      {
        name: "Cookie-free tracking",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      // {
      //   name: "GDPR compliant",
      //   pocketlyticsValue: true,
      //   competitorValue: true,
      // },
      {
        name: "No personal data collection",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Daily rotating salt option",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Open source",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Self-hostable",
        pocketlyticsValue: true,
        competitorValue: true,
      },
    ],
  },
  {
    title: "User Experience",
    features: [
      {
        name: "Beautiful UI",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "No training required",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Public dashboards",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Live demo",
        pocketlyticsValue: true,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Performance & Technical",
    features: [
      {
        name: "Real-time updates",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "API access",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Tech stack",
        pocketlyticsValue: "Typescript/ClickHouse",
        competitorValue: "Elixir/ClickHouse",
      },
      {
        name: "Bot filtering",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Bypasses ad blockers",
        pocketlyticsValue: true,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Data & Infrastructure",
    features: [
      {
        name: "Data retention",
        pocketlyticsValue: "2-5+ years",
        competitorValue: "Unlimited",
      },
      {
        name: "Data location",
        pocketlyticsValue: "EU (Hetzner)",
        competitorValue: "EU (Hetzner)",
      },
      {
        name: "Team collaboration",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Organization support",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Multiple websites",
        pocketlyticsValue: true,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Pricing & Support",
    features: [
      {
        name: "Free tier",
        pocketlyticsValue: DEFAULT_EVENT_LIMIT.toLocaleString() + " events",
        competitorValue: false,
      },
      {
        name: "Entry price",
        pocketlyticsValue: "$19/mo",
        competitorValue: "$19/mo",
      },
      {
        name: "Pricing model",
        pocketlyticsValue: "Events-based",
        competitorValue: "Pageview-based",
      },
      {
        name: "Customer support",
        pocketlyticsValue: true,
        competitorValue: true,
      },
    ],
  },
];
