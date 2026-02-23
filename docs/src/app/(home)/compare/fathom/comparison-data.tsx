import { DEFAULT_EVENT_LIMIT } from "../../../../lib/const";
import { ComparisonSection } from "../components/ComparisonPage";

export const fathomComparisonData: ComparisonSection[] = [
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
        name: "Live visitor counter",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "UTM/Campaign tracking",
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
    title: "Privacy & Compliance",
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
        name: "No consent banner needed",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Daily rotating salt option",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "IP anonymization",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Data stored in EU",
        pocketlyticsValue: true,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Open Source & Transparency",
    features: [
      {
        name: "Open source",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Self-hostable",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Code transparency",
        pocketlyticsValue: "Full",
        competitorValue: "None",
      },
      {
        name: "License",
        pocketlyticsValue: "AGPL v3",
        competitorValue: "Proprietary",
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
        name: "Public dashboards",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Email reports",
        pocketlyticsValue: false,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Technical & Performance",
    features: [
      {
        name: "Script size",
        pocketlyticsValue: "18KB",
        competitorValue: "2KB",
      },
      {
        name: "Bot filtering",
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
        competitorValue: "PHP/Singlestore",
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
        competitorValue: "$15/mo",
      },
      {
        name: "Customer support",
        pocketlyticsValue: true,
        competitorValue: true,
      },
    ],
  },
];
