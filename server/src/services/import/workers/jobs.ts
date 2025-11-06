import { UmamiEvent } from "../mappings/umami.js";
import { SimpleAnalyticsEvent } from "../mappings/simpleAnalytics.js";
import { ImportPlatform } from "../platforms.js";

export const CSV_PARSE_QUEUE = "csv-parse";

export const DATA_INSERT_QUEUE = "data-insert";

interface ImportJob {
  site: string;
  importId: string;
  platform: ImportPlatform;
}

export interface CsvParseJob extends ImportJob {
  storageLocation: string; // Either local file path or R2 key
  isR2Storage: boolean;
  organization: string;
  startDate?: string;
  endDate?: string;
}

export interface DataInsertJob extends ImportJob {
  chunk: UmamiEvent[] | SimpleAnalyticsEvent[];
  allChunksSent: boolean; // Finalization signal
}
