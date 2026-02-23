import { ComparisonPage } from "../components/ComparisonPage";
import { posthogComparisonData } from "./comparison-data";
import { PostHogComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pocketlytics vs PostHog: Analytics Platform Comparison 2025",
  description:
    "Compare Pocketlytics and PostHog. See why Pocketlytics's focused web analytics beats PostHog's complex product suite for teams wanting simplicity without sacrificing power.",
  openGraph: {
    title: "Pocketlytics vs PostHog: Focused Analytics vs Feature Bloat",
    description: "PostHog does everything. Pocketlytics does web analytics perfectly. Compare the approaches.",
    type: "website",
    url: "https://pocketlytics.local/compare/posthog",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pocketlytics vs PostHog Comparison",
    description: "Focused web analytics vs all-in-one platform. Which approach fits your needs?",
  },
  alternates: {
    canonical: "https://pocketlytics.local/compare/posthog",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://pocketlytics.local/compare/posthog",
      name: "Pocketlytics vs PostHog Comparison",
      description: "Compare Pocketlytics and PostHog analytics platforms",
      url: "https://pocketlytics.local/compare/posthog",
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
          name: "How is Pocketlytics different from PostHog?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Pocketlytics focuses exclusively on web analytics with a clean, simple interface. PostHog is an all-in-one product suite with analytics, feature flags, A/B testing, and more. Pocketlytics is ideal for teams who want powerful web analytics without the complexity.",
          },
        },
        {
          "@type": "Question",
          name: "Is Pocketlytics simpler than PostHog?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Pocketlytics provides a single-page dashboard with all essential metrics visible at a glance. PostHog's extensive feature set requires more time to learn and configure.",
          },
        },
        {
          "@type": "Question",
          name: "Which is better for web analytics, Pocketlytics or PostHog?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "For pure web analytics, Pocketlytics offers a more focused and streamlined experience. PostHog is better suited for teams needing a full product analytics suite with feature flags and experimentation.",
          },
        },
      ],
    },
  ],
};

export default function PostHog() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="PostHog"
        sections={posthogComparisonData}
        comparisonContent={<PostHogComparisonContent />}
      />
    </>
  );
}
