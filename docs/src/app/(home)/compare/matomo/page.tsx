import { ComparisonPage } from "../components/ComparisonPage";
import { matomoComparisonData } from "./comparison-data";
import { MatomoComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pocketlytics vs Matomo: Open-Source Analytics Comparison 2025",
  description:
    "Compare Pocketlytics and Matomo analytics. See how Pocketlytics offers simpler setup, modern UI, privacy by default, and zero maintenance vs Matomo's complex PHP-based system.",
  openGraph: {
    title: "Pocketlytics vs Matomo: Which Analytics Platform is Right for You?",
    description: "Side-by-side comparison of Pocketlytics and Matomo. Modern, privacy-first analytics vs legacy PHP system.",
    type: "website",
    url: "https://pocketlytics.local/compare/matomo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pocketlytics vs Matomo Comparison",
    description: "Compare Pocketlytics and Matomo analytics. See which open-source platform fits your needs.",
  },
  alternates: {
    canonical: "https://pocketlytics.local/compare/matomo",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://pocketlytics.local/compare/matomo",
      name: "Pocketlytics vs Matomo Comparison",
      description: "Compare Pocketlytics and Matomo analytics platforms",
      url: "https://pocketlytics.local/compare/matomo",
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
          name: "How does Pocketlytics compare to Matomo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Pocketlytics offers a modern, simpler alternative to Matomo with privacy by default, zero maintenance cloud hosting, and a beautiful single-page dashboard. While both are open-source, Pocketlytics uses modern technology (Next.js, ClickHouse) vs Matomo's legacy PHP stack.",
          },
        },
        {
          "@type": "Question",
          name: "Is Pocketlytics easier to use than Matomo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Matomo has 70+ reports across 12 sections, inheriting Google Analytics complexity. Pocketlytics provides all essential metrics on a single dashboard with no training required.",
          },
        },
        {
          "@type": "Question",
          name: "Does Pocketlytics require cookies like Matomo?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Pocketlytics is cookie-free by default and requires no consent banners. Matomo uses cookies by default and requires configuration to achieve GDPR compliance.",
          },
        },
      ],
    },
  ],
};

export default function Matomo() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="Matomo"
        sections={matomoComparisonData}
        comparisonContent={<MatomoComparisonContent />}
      />
    </>
  );
}
