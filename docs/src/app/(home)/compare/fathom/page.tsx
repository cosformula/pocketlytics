import { ComparisonPage } from "../components/ComparisonPage";
import { fathomComparisonData } from "./comparison-data";
import { FathomComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pocketlytics vs Fathom: Privacy Analytics Comparison 2025",
  description:
    "Compare Pocketlytics and Fathom analytics. Both prioritize privacy, but Pocketlytics offers more features like session replay, funnels, and open-source flexibility.",
  openGraph: {
    title: "Pocketlytics vs Fathom: More Features, Same Privacy Focus",
    description: "Fathom is simple. Pocketlytics is simple AND powerful. Compare session replay, funnels, and more.",
    type: "website",
    url: "https://pocketlytics.local/compare/fathom",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pocketlytics vs Fathom Analytics",
    description: "Privacy-first analytics compared. See which offers more value.",
  },
  alternates: {
    canonical: "https://pocketlytics.local/compare/fathom",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://pocketlytics.local/compare/fathom",
      name: "Pocketlytics vs Fathom Comparison",
      description: "Compare Pocketlytics and Fathom analytics platforms",
      url: "https://pocketlytics.local/compare/fathom",
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
          name: "How does Pocketlytics compare to Fathom?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both Pocketlytics and Fathom are privacy-first analytics platforms. Pocketlytics offers additional features like session replay, funnels, user journeys, and is fully open-source, while Fathom focuses on simplicity.",
          },
        },
        {
          "@type": "Question",
          name: "Is Pocketlytics open-source unlike Fathom?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Pocketlytics is fully open-source and can be self-hosted for free. Fathom is closed-source and only available as a paid cloud service.",
          },
        },
        {
          "@type": "Question",
          name: "Which has more features, Pocketlytics or Fathom?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Pocketlytics offers more features including session replay, funnel analysis, user journey visualization, Web Vitals monitoring, error tracking, and public dashboards. Fathom focuses on basic pageview analytics.",
          },
        },
      ],
    },
  ],
};

export default function Fathom() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="Fathom"
        sections={fathomComparisonData}
        comparisonContent={<FathomComparisonContent />}
      />
    </>
  );
}
