export const IMPORT_PLATFORMS_CHOICES = [
  { value: "umami", label: "Umami" },
  { value: "simple_analytics", label: "Simple Analytics" },
] as const;

export const IMPORT_PLATFORMS = ["umami", "simple_analytics"] as const;

export type ImportPlatform = (typeof IMPORT_PLATFORMS)[number];
