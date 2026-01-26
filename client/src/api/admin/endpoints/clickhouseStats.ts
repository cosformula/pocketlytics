import { authedFetch } from "../../utils";

export interface TableStats {
  table: string;
  totalRows: number;
  compressedSize: string;
  compressedBytes: number;
  uncompressedSize: string;
  uncompressedBytes: number;
  partsCount: number;
}

export interface RowsByDate {
  date: string;
  table: string;
  rowsInserted: number;
}

export interface InsertRate {
  hour: string;
  insertCount: number;
  totalRowsInserted: number;
}

export interface QueryError {
  eventTime: string;
  queryId: string;
  exceptionCode: number;
  exception: string;
  query: string;
}

export interface ClickhouseStatsResponse {
  tableStats: TableStats[];
  rowsByDate: RowsByDate[];
  insertRate: InsertRate[];
  queryErrors: QueryError[];
  unavailableFeatures: string[];
}

export interface ActiveQuery {
  queryId: string;
  user: string;
  query: string;
  elapsed: number;
  readRows: number;
  memoryUsage: number;
  queryKind: string;
}

export interface ClickhouseActiveQueriesResponse {
  activeQueries: ActiveQuery[];
}

export function getClickhouseStats() {
  return authedFetch<ClickhouseStatsResponse>("/admin/clickhouse-stats");
}

export function getClickhouseActiveQueries() {
  return authedFetch<ClickhouseActiveQueriesResponse>("/admin/clickhouse-active-queries");
}
