import { ComparisonPage } from "../components/ComparisonPage";
import { simpleAnalyticsComparisonData } from "./comparison-data";
import { SimpleAnalyticsComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pocketlytics vs Simple Analytics: Feature Comparison 2025",
  description:
    "Compare Pocketlytics and Simple Analytics. Both are privacy-focused, but Pocketlytics offers more advanced features like session replay, funnels, and user journeys.",
  openGraph: {
    title: "Pocketlytics vs Simple Analytics: Simple AND Powerful",
    description: "Simple Analytics keeps it basic. Pocketlytics adds power without complexity. Compare features.",
    type: "website",
    url: "https://pocketlytics.local/compare/simpleanalytics",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pocketlytics vs Simple Analytics",
    description: "Privacy-first analytics compared. See which offers the best value.",
  },
  alternates: {
    canonical: "https://pocketlytics.local/compare/simpleanalytics",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://pocketlytics.local/compare/simpleanalytics",
      name: "Pocketlytics vs Simple Analytics Comparison",
      description: "Compare Pocketlytics and Simple Analytics platforms",
      url: "https://pocketlytics.local/compare/simpleanalytics",
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
          name: "How does Pocketlytics compare to Simple Analytics?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both are privacy-first analytics platforms, but Pocketlytics offers more advanced features like session replay, funnels, user journeys, and error tracking while maintaining a simple, intuitive interface.",
          },
        },
        {
          "@type": "Question",
          name: "Is Pocketlytics more feature-rich than Simple Analytics?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Pocketlytics includes session replay, funnel analysis, user journey visualization, Web Vitals monitoring, error tracking, and public dashboards. Simple Analytics focuses on basic metrics and simplicity.",
          },
        },
        {
          "@type": "Question",
          name: "Which is better value, Pocketlytics or Simple Analytics?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Pocketlytics offers more features at competitive pricing, plus a generous free tier and open-source self-hosting option. Simple Analytics has fixed pricing without a free tier.",
          },
        },
      ],
    },
  ],
};

export default function SimpleAnalytics() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="SimpleAnalytics"
        sections={simpleAnalyticsComparisonData}
        comparisonContent={<SimpleAnalyticsComparisonContent />}
      />
    </>
  );
}
