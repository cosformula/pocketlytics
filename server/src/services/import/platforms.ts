export const IMPORT_PLATFORMS = ["umami", "simple_analytics"] as const;

export type ImportPlatform = (typeof IMPORT_PLATFORMS)[number];
