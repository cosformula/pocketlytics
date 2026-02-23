import { ComparisonPage } from "../components/ComparisonPage";
import { plausibleComparisonData } from "./comparison-data";
import { PlausibleComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pocketlytics vs Plausible: Feature Comparison 2025",
  description:
    "Compare Pocketlytics and Plausible analytics. Both are privacy-first, but Pocketlytics offers more features like session replay, funnels, and user journeys at competitive pricing.",
  openGraph: {
    title: "Pocketlytics vs Plausible: Which Privacy-First Analytics Wins?",
    description: "Both respect privacy, but Pocketlytics offers more power. Compare session replay, funnels, and pricing.",
    type: "website",
    url: "https://pocketlytics.local/compare/plausible",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pocketlytics vs Plausible Comparison",
    description: "Privacy-first analytics showdown. See which platform offers more value.",
  },
  alternates: {
    canonical: "https://pocketlytics.local/compare/plausible",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://pocketlytics.local/compare/plausible",
      name: "Pocketlytics vs Plausible Comparison",
      description: "Compare Pocketlytics and Plausible analytics platforms",
      url: "https://pocketlytics.local/compare/plausible",
      isPartOf: {
        "@type": "WebSite",
        name: "Pocketlytics",
        url: "https://pocketlytics.local",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "How does Pocketlytics compare to Plausible?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both Pocketlytics and Plausible are privacy-first analytics platforms, but Pocketlytics offers more advanced features like session replay, funnels, user journeys, and error tracking while maintaining simplicity.",
          },
        },
        {
          "@type": "Question",
          name: "Does Pocketlytics have features Plausible doesn't?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Pocketlytics includes session replay, funnel analysis, user journey visualization (Sankey diagrams), Web Vitals monitoring, error tracking, and public dashboards that Plausible doesn't offer.",
          },
        },
        {
          "@type": "Question",
          name: "Which is more affordable, Pocketlytics or Plausible?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Pocketlytics offers competitive pricing starting at $19/month for 100k events with a generous free tier. Both platforms offer similar value, but Pocketlytics includes more features at each price point.",
          },
        },
      ],
    },
  ],
};

export default function Plausible() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="Plausible"
        sections={plausibleComparisonData}
        comparisonContent={<PlausibleComparisonContent />}
      />
    </>
  );
}
