import { DEFAULT_EVENT_LIMIT } from "../../../../lib/const";
import { ComparisonSection } from "../components/ComparisonPage";

export const matomoComparisonData: ComparisonSection[] = [
  {
    title: "Ease of Use",
    features: [
      {
        name: "Simple, intuitive interface",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Single-page dashboard",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "No training required",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "One-click setup",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Beautiful modern UI",
        pocketlyticsValue: true,
        competitorValue: false,
      },
    ],
  },
  {
    title: "Core Analytics Features",
    features: [
      {
        name: "Web analytics dashboard",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Real-time data",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Custom events tracking",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Conversion goals",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Ecommerce tracking",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Heatmaps",
        pocketlyticsValue: false,
        competitorValue: true,
      },
      {
        name: "A/B testing",
        pocketlyticsValue: false,
        competitorValue: true,
      },
      {
        name: "Form analytics",
        pocketlyticsValue: false,
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
        competitorValue: false,
      },
      {
        name: "User profiles",
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
        competitorValue: false,
      },
      {
        name: "Error tracking",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Public dashboards",
        pocketlyticsValue: true,
        competitorValue: false,
      },
    ],
  },
  {
    title: "Performance & Infrastructure",
    features: [
      {
        name: "Script size",
        pocketlyticsValue: "18KB",
        competitorValue: "20-50KB",
      },
      {
        name: "Global CDN included",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Modern tech stack",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Auto-scaling cloud",
        pocketlyticsValue: true,
        competitorValue: "Self-host only",
      },
      {
        name: "Zero maintenance",
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
        competitorValue: "Optional",
      },
      // {
      //   name: "GDPR compliant by default",
      //   pocketlyticsValue: true,
      //   competitorValue: false,
      // },
      {
        name: "No consent banner needed",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Daily rotating salt option",
        pocketlyticsValue: true,
        competitorValue: false,
      },
      {
        name: "Data stored in EU",
        pocketlyticsValue: true,
        competitorValue: "Varies",
      },
    ],
  },
  {
    title: "Data & Hosting",
    features: [
      {
        name: "Data retention",
        pocketlyticsValue: "2-5+ years",
        competitorValue: "24 months (cloud)",
      },
      {
        name: "Self-hostable",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Managed cloud option",
        pocketlyticsValue: true,
        competitorValue: "Limited",
      },
      {
        name: "Easy Google Analytics import",
        pocketlyticsValue: false,
        competitorValue: "Complex",
      },
      {
        name: "Data export",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "API access",
        pocketlyticsValue: true,
        competitorValue: true,
      },
    ],
  },
  {
    title: "Support & Pricing",
    features: [
      {
        name: "Human customer support",
        pocketlyticsValue: true,
        competitorValue: "Paid only",
      },
      {
        name: "Free tier",
        pocketlyticsValue: DEFAULT_EVENT_LIMIT.toLocaleString() + " events",
        competitorValue: "Self-host only",
      },
      {
        name: "Cloud pricing",
        pocketlyticsValue: "$19-$499/mo",
        competitorValue: "€19-€450+/mo",
      },
      {
        name: "Open source",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Live demo available",
        pocketlyticsValue: true,
        competitorValue: true,
      },
      {
        name: "Documentation quality",
        pocketlyticsValue: "Modern",
        competitorValue: "Extensive but complex",
      },
    ],
  },
];
