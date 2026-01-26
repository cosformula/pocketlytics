import { useQuery } from "@tanstack/react-query";
import {
  getClickhouseStats,
  getClickhouseActiveQueries,
  ClickhouseStatsResponse,
  ClickhouseActiveQueriesResponse,
} from "../endpoints/clickhouseStats";

export function useClickhouseStats() {
  return useQuery<ClickhouseStatsResponse>({
    queryKey: ["clickhouse-stats"],
    queryFn: getClickhouseStats,
    refetchInterval: 60000, // 60 seconds
  });
}

export function useClickhouseActiveQueries() {
  return useQuery<ClickhouseActiveQueriesResponse>({
    queryKey: ["clickhouse-active-queries"],
    queryFn: getClickhouseActiveQueries,
    refetchInterval: 10000, // 10 seconds
  });
}
