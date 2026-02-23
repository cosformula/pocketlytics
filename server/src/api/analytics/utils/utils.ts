import { FilterParams } from "@rybbit/shared";
import { and, eq, inArray } from "drizzle-orm";
import { DateTime } from "luxon";
import SqlString from "sqlstring";
import { db } from "../../../db/postgres/postgres.js";
import { userProfiles } from "../../../db/postgres/schema.js";
import { validateTimeStatementParams } from "./query-validation.js";

export function getTimeStatement(
  params: Pick<FilterParams, "start_date" | "end_date" | "time_zone" | "past_minutes_start" | "past_minutes_end">
) {
  const { start_date, end_date, time_zone, past_minutes_start, past_minutes_end } = params;

  // Construct the legacy format for validation
  const pastMinutesRange =
    past_minutes_start !== undefined && past_minutes_end !== undefined
      ? { start: Number(past_minutes_start), end: Number(past_minutes_end) }
      : undefined;

  const date = start_date && end_date && time_zone ? { start_date, end_date, time_zone } : undefined;

  // Sanitize inputs with Zod
  const sanitized = validateTimeStatementParams({
    date,
    pastMinutesRange,
  });

  if (sanitized.date) {
    const { start_date, end_date, time_zone } = sanitized.date;
    if (!start_date && !end_date) {
      return "";
    }
    if (!start_date || !end_date || !time_zone) {
      return "";
    }

    // Compute exact UTC bounds in JS so DuckDB SQL stays simple and timezone-correct.
    const startUtc = DateTime.fromISO(start_date, { zone: time_zone }).startOf("day").toUTC();
    const nowInZone = DateTime.now().setZone(time_zone);
    const isEndTodayInZone = end_date === nowInZone.toISODate();
    const endUtc = isEndTodayInZone
      ? nowInZone.toUTC()
      : DateTime.fromISO(end_date, { zone: time_zone }).plus({ days: 1 }).startOf("day").toUTC();

    const startUtcSql = startUtc.toFormat("yyyy-MM-dd HH:mm:ss");
    const endUtcSql = endUtc.toFormat("yyyy-MM-dd HH:mm:ss");

    return `AND timestamp >= CAST(${SqlString.escape(startUtcSql)} AS TIMESTAMP)
      AND timestamp < CAST(${SqlString.escape(endUtcSql)} AS TIMESTAMP)`;
  }

  // Handle specific range of past minutes - convert to exact timestamps for better performance
  if (sanitized.pastMinutesRange) {
    const { start, end } = sanitized.pastMinutesRange;

    // Calculate exact timestamps in JavaScript to avoid runtime ClickHouse calculations
    const now = new Date();
    const startTimestamp = new Date(now.getTime() - start * 60 * 1000);
    const endTimestamp = new Date(now.getTime() - end * 60 * 1000);

    // Format as YYYY-MM-DD HH:MM:SS without milliseconds
    const startIso = startTimestamp.toISOString().slice(0, 19).replace("T", " ");
    const endIso = endTimestamp.toISOString().slice(0, 19).replace("T", " ");

    return `AND timestamp > CAST(${SqlString.escape(startIso)} AS TIMESTAMP) AND timestamp <= CAST(${SqlString.escape(endIso)} AS TIMESTAMP)`;
  }

  // If no valid time parameters were provided, return empty string
  return "";
}

type DuckDbLikeResult = {
  json?: (...args: any[]) => Promise<any>;
};

export async function processResults<T>(results: DuckDbLikeResult | T[]): Promise<T[]> {
  let data: any[] = [];

  if (Array.isArray(results)) {
    data = results;
  } else if (results && typeof results.json === "function") {
    const raw = await results.json();
    data = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  }

  for (const row of data) {
    for (const key in row) {
      // Only convert to number if the value is not null/undefined and is a valid number
      if (
        key !== "session_id" &&
        key !== "user_id" &&
        key !== "identified_user_id" &&
        key !== "effective_user_id" &&
        row[key] !== null &&
        row[key] !== undefined &&
        row[key] !== "" &&
        row[key] !== true &&
        row[key] !== false &&
        !isNaN(Number(row[key]))
      ) {
        row[key] = Number(row[key]) as any;
      }
    }
  }
  return data;
}

/**
 * Converts wildcard path patterns to ClickHouse regex pattern
 * - Supports * for matching a single path segment (not including /)
 * - Supports ** for matching multiple path segments (including /)
 * @param pattern Path pattern with wildcards
 * @returns ClickHouse-compatible regex string
 */
export function patternToRegex(pattern: string): string {
  // Escape special regex characters except * which we'll handle specially
  const escapedPattern = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

  // Replace ** with a temporary marker
  const withDoubleStar = escapedPattern.replace(/\*\*/g, "{{DOUBLE_STAR}}");

  // Replace * with [^/]+ (any characters except /)
  const withSingleStar = withDoubleStar.replace(/\*/g, "[^/]+");

  // Replace the double star marker with .* (any characters including /)
  const finalRegex = withSingleStar.replace(/{{DOUBLE_STAR}}/g, ".*");

  // Anchor the regex to start/end of string for exact matches
  return `^${finalRegex}$`;
}

// Time bucket mapping constants
export const TimeBucketToFn = {
  minute: "toStartOfMinute",
  five_minutes: "toStartOfFiveMinutes",
  ten_minutes: "toStartOfTenMinutes",
  fifteen_minutes: "toStartOfFifteenMinutes",
  hour: "toStartOfHour",
  day: "toStartOfDay",
  week: "toStartOfWeek",
  month: "toStartOfMonth",
  year: "toStartOfYear",
} as const;

export const bucketIntervalMap = {
  minute: "1 MINUTE",
  five_minutes: "5 MINUTES",
  ten_minutes: "10 MINUTES",
  fifteen_minutes: "15 MINUTES",
  hour: "1 HOUR",
  day: "1 DAY",
  week: "7 DAY",
  month: "1 MONTH",
  year: "1 YEAR",
} as const;

/**
 * Enriches data with user traits from Postgres for identified users.
 * This is a shared utility to avoid duplicating the traits fetching logic.
 * Uses identified_user_id to look up traits since that's the custom user ID.
 */
export async function enrichWithTraits<T extends { identified_user_id: string }>(
  data: T[],
  siteId: number
): Promise<Array<T & { traits: Record<string, unknown> | null }>> {
  const identifiedUserIds = [
    ...new Set(data.filter(item => item.identified_user_id).map(item => item.identified_user_id)),
  ];

  let traitsMap: Map<string, Record<string, unknown>> = new Map();
  if (identifiedUserIds.length > 0) {
    const profiles = await db
      .select({
        userId: userProfiles.userId,
        traits: userProfiles.traits,
      })
      .from(userProfiles)
      .where(and(eq(userProfiles.siteId, siteId), inArray(userProfiles.userId, identifiedUserIds)));

    traitsMap = new Map(
      profiles.map(p => [
        p.userId,
        p.traits && typeof p.traits === "object" && !Array.isArray(p.traits)
          ? (p.traits as Record<string, unknown>)
          : {},
      ])
    );
  }

  return data.map(item => ({ ...item, traits: traitsMap.get(item.identified_user_id) || null }));
}
