import { MetadataRoute } from "next";
import { source } from "@/lib/source";
import { blogSource } from "@/lib/blog-source";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://rybbit.com";

  // Get all documentation pages
  const docPages = source.getPages().map(page => ({
    url: `${baseUrl}/docs/${page.slugs.join("/")}`,
    lastModified: page.data.lastModified || new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // Get all blog posts
  const blogPosts = blogSource.getPages().map(post => ({
    url: `${baseUrl}/blog/${post.slugs.join("/")}`,
    lastModified: post.data.date || new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Tool pages
  const toolSlugs = [
    "utm-builder",
    "seo-title-generator",
    "meta-description-generator",
    "og-tag-generator",
    "marketing-roi-calculator",
    "ctr-calculator",
    "bounce-rate-calculator",
    "sample-size-calculator",
    "traffic-value-calculator",
    "page-speed-calculator",
    "funnel-visualizer",
    "ai-privacy-policy-generator",
    "analytics-detector",
    "privacy-policy-builder",
  ];

  const toolPages = toolSlugs.map(slug => ({
    url: `${baseUrl}/tools/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.85,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
  ];

  return [...staticPages, ...toolPages, ...docPages, ...blogPosts];
}
