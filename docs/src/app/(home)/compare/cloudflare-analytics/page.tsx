import { ComparisonPage } from "../components/ComparisonPage";
import { cloudflareAnalyticsComparisonData } from "./comparison-data";
import { CloudflareAnalyticsComparisonContent } from "./ComparisonContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pocketlytics vs Cloudflare Analytics: Full Comparison 2025",
  description:
    "Compare Pocketlytics and Cloudflare Web Analytics. While Cloudflare is free and basic, Pocketlytics offers advanced features like session replay, funnels, and custom events.",
  openGraph: {
    title: "Pocketlytics vs Cloudflare Analytics: Basic vs Full-Featured",
    description: "Cloudflare is free but limited. Pocketlytics offers the full analytics experience. Compare features.",
    type: "website",
    url: "https://pocketlytics.local/compare/cloudflare-analytics",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pocketlytics vs Cloudflare Analytics",
    description: "Free basic analytics vs full-featured platform. See the difference.",
  },
  alternates: {
    canonical: "https://pocketlytics.local/compare/cloudflare-analytics",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://pocketlytics.local/compare/cloudflare-analytics",
      name: "Pocketlytics vs Cloudflare Analytics Comparison",
      description: "Compare Pocketlytics and Cloudflare Web Analytics",
      url: "https://pocketlytics.local/compare/cloudflare-analytics",
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
          name: "Is Pocketlytics better than Cloudflare Analytics?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Pocketlytics offers significantly more features than Cloudflare Web Analytics including session replay, funnels, custom events, user journeys, and conversion tracking. Cloudflare is free but limited to basic pageview metrics.",
          },
        },
        {
          "@type": "Question",
          name: "What features does Pocketlytics have that Cloudflare doesn't?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Pocketlytics includes session replay, funnel analysis, custom event tracking, user journey visualization, Web Vitals monitoring, error tracking, goals and conversions, and public dashboards. Cloudflare only provides basic traffic metrics.",
          },
        },
        {
          "@type": "Question",
          name: "Should I switch from Cloudflare Analytics to Pocketlytics?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "If you need more than basic pageview data, yes. Pocketlytics provides actionable insights with session replay, conversion tracking, and user behavior analysis that Cloudflare doesn't offer.",
          },
        },
      ],
    },
  ],
};

export default function CloudflareAnalytics() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <ComparisonPage
        competitorName="Cloudflare Analytics"
        sections={cloudflareAnalyticsComparisonData}
        comparisonContent={<CloudflareAnalyticsComparisonContent />}
      />
    </>
  );
}
