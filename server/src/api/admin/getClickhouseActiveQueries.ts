import { FastifyReply, FastifyRequest } from "fastify";
import { clickhouse } from "../../db/clickhouse/clickhouse.js";

interface ActiveQueryRow {
  query_id: string;
  user: string;
  query: string;
  elapsed: number;
  read_rows: string;
  memory_usage: string;
  query_kind: string;
}

export async function getClickhouseActiveQueries(request: FastifyRequest, reply: FastifyReply) {
  try {
    const activeQueriesResult = await clickhouse.query({
      query: `
        SELECT
          query_id,
          user,
          substring(query, 1, 500) as query,
          elapsed,
          read_rows,
          memory_usage,
          query_kind
        FROM system.processes
        WHERE is_cancelled = 0
          AND query NOT LIKE '%system.processes%'
        ORDER BY elapsed DESC
        LIMIT 20
      `,
      format: "JSONEachRow",
    });
    const activeQueries = (await activeQueriesResult.json()) as ActiveQueryRow[];

    return reply.status(200).send({
      activeQueries: activeQueries.map(row => ({
        queryId: row.query_id,
        user: row.user,
        query: row.query,
        elapsed: row.elapsed,
        readRows: Number(row.read_rows),
        memoryUsage: Number(row.memory_usage),
        queryKind: row.query_kind,
      })),
    });
  } catch (error) {
    request.log.error(error, "Failed to get ClickHouse active queries");
    return reply.status(500).send({ error: "Failed to get ClickHouse active queries" });
  }
}
