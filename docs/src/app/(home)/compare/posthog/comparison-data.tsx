import { ComparisonSection } from "../components/ComparisonPage";

export const posthogComparisonData: ComparisonSection[] = [
  {
    title: "Core Analytics Features",
    features: [
      {
        name: "Web analytics",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Product analytics",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Simple dashboard",
        pocketlyticsValue: true,
        competitorValue: false,
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
        name: "Geographic data",
        pocketlyticsValue: "City-level",
        competitorValue: "City-level",
      },
      {
        name: "UTM tracking",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Custom events",
        pocketlyticsValue: "With attributes",
        competitorValue: "With properties",
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
        competitorValue: true,
      },
      {
        name: "Funnels",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "User journeys (Sankey)",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "User profiles",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Sessions tracking",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Real-time globe view",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Web Vitals dashboard",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Error tracking",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Heatmaps",
        pocketlyticsValue: false,
        competitorValue: true,
      },
      {
        name: "Feature flags",
        pocketlyticsValue: false,
        competitorValue: true,
      },
      {
        name: "A/B testing",
        pocketlyticsValue: false,
        competitorValue: true,
      },
      {
        name: "Surveys",
        pocketlyticsValue: false,
        competitorValue: true,
      },
      {
        name: "SQL query interface",
        pocketlyticsValue: false,
        competitorValue: true,
      },
      {
        name: "Cohort analysis",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Retention analysis",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Ecommerce tracking",
        pocketlyticsValue: true,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Privacy & Open Source",
    features: [
      {
        name: "Cookie-free tracking",
        pocketlyticsValue: true,
        competitorValue: "Optional",
      },
      // {
      //   name: "GDPR compliant",
      //   pocketlyticsValue: true,
      //   competitorValue: true,
      // },
      {
        name: "No personal data collection",
        pocketlyticsValue: true,
        competitorValue: false,
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
        competitorValue: "very difficult",
      },
      {
        name: "Privacy-first by default",
        pocketlyticsValue: true,
        competitorValue: false,
      },
    ],
  },
  {
    title: "User Experience",
    features: [
      {
        name: "Beautiful UI",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "No training required",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Non-technical friendly",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Public dashboards",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Live demo",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Mobile app",
        pocketlyticsValue: false,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Performance & Technical",
    features: [
      {
        name: "Script size",
        pocketlyticsValue: "18KB",
        competitorValue: "~60KB",
      },
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
        pocketlyticsValue: "TypeScript/ClickHouse",
        competitorValue: "TypeScript/ClickHouse",
      },
      {
        name: "Bot filtering",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Bypasses ad blockers",
        pocketlyticsValue: true,
        competitorValue: "With proxy",
      },
      {
        name: "Autocapture",
        pocketlyticsValue: false,
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
        competitorValue: "7 years",
      },
      {
        name: "Data location",
        pocketlyticsValue: "EU",
        competitorValue: "US/EU",
      },
      {
        name: "Team collaboration",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Organization support",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Multiple websites",
        pocketlyticsValue: true,
        competitorValue: true,
      },
    ],
  },
];
