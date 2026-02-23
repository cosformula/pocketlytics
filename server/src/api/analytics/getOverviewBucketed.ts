import { FilterParams } from "@rybbit/shared";
import { FastifyReply, FastifyRequest } from "fastify";
import SqlString from "sqlstring";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";
import { validateTimeStatementFillParams } from "./utils/query-validation.js";
import { getTimeStatement, processResults, TimeBucketToFn } from "./utils/utils.js";
import { getFilterStatement } from "./utils/getFilterStatement.js";
import { TimeBucket } from "./types.js";

function getTimeStatementFill(params: FilterParams, bucket: TimeBucket) {
  // DuckDB does not support ClickHouse `WITH FILL` semantics the same way.
  // Keep query output dense on the frontend instead of generating DB-side fill rows.
  validateTimeStatementFillParams(params, bucket);
  return "";
}

const getQuery = (params: FilterParams<{ bucket: TimeBucket }>, siteId: number) => {
  const { start_date, end_date, time_zone, bucket = "hour", filters, past_minutes_start, past_minutes_end } = params;
  const timeStatement = getTimeStatement(params);
  const filterStatement = getFilterStatement(filters, siteId, timeStatement);

  const pastMinutesRange =
    past_minutes_start !== undefined && past_minutes_end !== undefined
      ? { start: Number(past_minutes_start), end: Number(past_minutes_end) }
      : undefined;

  const isAllTime = !start_date && !end_date && !pastMinutesRange;

  const query = `
WITH
-- First, calculate total pageviews per session (no parameter filters)
AllSessionPageviews AS (
    SELECT
        session_id,
        countIf(type = 'pageview') AS total_pageviews_in_session
    FROM events
    WHERE
        site_id = {siteId:Int32}
        ${getTimeStatement(params)}
    GROUP BY session_id
),
-- Then get session data with filters applied
FilteredSessions AS (
    SELECT
        session_id,
        MIN(timestamp) AS start_time,
        MAX(timestamp) AS end_time
    FROM events
    WHERE
        site_id = {siteId:Int32}
        ${filterStatement}
        ${getTimeStatement(params)}
    GROUP BY session_id
),
-- Join to get sessions with their total pageviews
SessionsWithPageviews AS (
    SELECT
        fs.session_id,
        fs.start_time,
        fs.end_time,
        asp.total_pageviews_in_session
    FROM FilteredSessions fs
    LEFT JOIN AllSessionPageviews asp ON fs.session_id = asp.session_id
)
SELECT
    COALESCE(session_stats.time, page_stats.time) AS time,
    COALESCE(session_stats.sessions, 0) AS sessions,
    COALESCE(session_stats.pages_per_session, 0) AS pages_per_session,
    COALESCE(session_stats.bounce_rate * 100, 0) AS bounce_rate,
    COALESCE(session_stats.session_duration, 0) AS session_duration,
    COALESCE(page_stats.pageviews, 0) AS pageviews,
    COALESCE(page_stats.users, 0) AS users
FROM
(
    SELECT
         toDateTime(${TimeBucketToFn[bucket]}(toTimeZone(start_time, ${SqlString.escape(time_zone)}))) AS time,
        COUNT() AS sessions,
        AVG(total_pageviews_in_session) AS pages_per_session,
        sumIf(1, total_pageviews_in_session = 1) / COUNT() AS bounce_rate,
        AVG(dateDiff('second', start_time, end_time)) AS session_duration
    FROM SessionsWithPageviews
    GROUP BY time ORDER BY time ${isAllTime ? "" : getTimeStatementFill(params, bucket)}
) AS session_stats
FULL JOIN
(
    SELECT
        toDateTime(${TimeBucketToFn[bucket]}(toTimeZone(timestamp, ${SqlString.escape(time_zone)}))) AS time,
        countIf(type = 'pageview') AS pageviews,
        COUNT(DISTINCT user_id) AS users
    FROM events
    WHERE
        site_id = {siteId:Int32}
        ${filterStatement}
        ${getTimeStatement(params)}
    GROUP BY time ORDER BY time ${isAllTime ? "" : getTimeStatementFill(params, bucket)}
) AS page_stats
ON session_stats.time = page_stats.time
WHERE COALESCE(session_stats.time, page_stats.time) IS NOT NULL
ORDER BY time`;

  return query;
};

type getOverviewBucketed = { time: string; pageviews: number }[];

export async function getOverviewBucketed(
  req: FastifyRequest<{
    Params: {
      siteId: string;
    };
    Querystring: FilterParams<{
      bucket: TimeBucket;
    }>;
  }>,
  res: FastifyReply
) {
  const { start_date, end_date, time_zone, bucket, filters, past_minutes_start, past_minutes_end } = req.query;
  const site = req.params.siteId;

  const query = getQuery(
    {
      start_date,
      end_date,
      time_zone,
      bucket,
      filters,
      past_minutes_start,
      past_minutes_end,
    },
    Number(site)
  );

  try {
    const result = await clickhouse.query({
      query,
      format: "JSONEachRow",
      query_params: {
        siteId: Number(site),
      },
    });

    const data = (await processResults<getOverviewBucketed[number]>(result)).filter(row => !!row.time);
    return res.send({ data });
  } catch (error) {
    console.error("Error fetching pageviews:", error);
    return res.status(500).send({ error: "Failed to fetch pageviews" });
  }
}
