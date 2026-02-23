import { ComparisonPage } from "../components/ComparisonPage";
import { umamiComparisonData } from "./comparison-data";
import { UmamiComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pocketlytics vs Umami: Open-Source Analytics Comparison 2025",
  description:
    "Compare Pocketlytics and Umami analytics. Both are open-source and privacy-focused, but Pocketlytics offers advanced features like session replay, funnels, and a managed cloud option.",
  openGraph: {
    title: "Pocketlytics vs Umami: Open-Source Analytics Head-to-Head",
    description: "Two open-source analytics platforms compared. See which offers more features and flexibility.",
    type: "website",
    url: "https://pocketlytics.local/compare/umami",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pocketlytics vs Umami Comparison",
    description: "Open-source analytics showdown. Compare features, hosting options, and more.",
  },
  alternates: {
    canonical: "https://pocketlytics.local/compare/umami",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://pocketlytics.local/compare/umami",
      name: "Pocketlytics vs Umami Comparison",
      description: "Compare Pocketlytics and Umami analytics platforms",
      url: "https://pocketlytics.local/compare/umami",
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
          name: "How does Pocketlytics compare to Umami?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both are open-source, privacy-focused analytics platforms. Pocketlytics offers more advanced features like session replay, funnels, user journeys, and Web Vitals monitoring, plus a fully managed cloud option.",
          },
        },
        {
          "@type": "Question",
          name: "Does Pocketlytics offer more features than Umami?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Pocketlytics includes session replay, funnel analysis, user journey visualization, Web Vitals dashboard, error tracking, and public dashboards. Umami focuses on core analytics metrics.",
          },
        },
        {
          "@type": "Question",
          name: "Which is easier to self-host, Pocketlytics or Umami?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Both are relatively easy to self-host with Docker. Pocketlytics uses ClickHouse for better performance at scale, while Umami uses MySQL/PostgreSQL. Pocketlytics also offers a managed cloud option if you prefer not to self-host.",
          },
        },
      ],
    },
  ],
};

export default function Umami() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="Umami"
        sections={umamiComparisonData}
        comparisonContent={<UmamiComparisonContent />}
      />
    </>
  );
}
