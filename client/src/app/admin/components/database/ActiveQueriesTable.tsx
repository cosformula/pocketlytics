"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ActiveQuery } from "@/api/admin/endpoints/clickhouseStats";
import { Badge } from "@/components/ui/badge";

interface ActiveQueriesTableProps {
  activeQueries: ActiveQuery[] | undefined;
  isLoading: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`;
  }
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  }
  if (bytes >= 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }
  if (bytes >= 1024) {
    return (bytes / 1024).toFixed(2) + " KB";
  }
  return bytes + " B";
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + "B";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + "K";
  }
  return num.toLocaleString();
}

export function ActiveQueriesTable({ activeQueries, isLoading }: ActiveQueriesTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!activeQueries || activeQueries.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">No active queries running</div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden dark:border-neutral-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">User</TableHead>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead className="w-[100px]">Elapsed</TableHead>
            <TableHead className="w-[100px]">Rows Read</TableHead>
            <TableHead className="w-[100px]">Memory</TableHead>
            <TableHead>Query</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeQueries.map(query => (
            <TableRow key={query.queryId}>
              <TableCell className="font-medium">{query.user}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {query.queryKind || "Unknown"}
                </Badge>
              </TableCell>
              <TableCell className={query.elapsed > 10 ? "text-amber-500" : ""}>
                {formatDuration(query.elapsed)}
              </TableCell>
              <TableCell>{formatNumber(query.readRows)}</TableCell>
              <TableCell>{formatBytes(query.memoryUsage)}</TableCell>
              <TableCell>
                <div className="max-w-md truncate font-mono text-xs text-neutral-600 dark:text-neutral-400">
                  {query.query}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
