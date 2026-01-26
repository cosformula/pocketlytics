"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryError } from "@/api/admin/endpoints/clickhouseStats";
import { Badge } from "@/components/ui/badge";
import { DateTime } from "luxon";

interface QueryErrorsTableProps {
  queryErrors: QueryError[] | undefined;
  isLoading: boolean;
  isUnavailable?: boolean;
}

export function QueryErrorsTable({ queryErrors, isLoading, isUnavailable }: QueryErrorsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isUnavailable) {
    return (
      <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
        <p>Feature unavailable</p>
        <p className="text-xs mt-1">system.query_log is disabled to save disk space</p>
      </div>
    );
  }

  if (!queryErrors || queryErrors.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
        No query errors in the last 24 hours
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden dark:border-neutral-800">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[160px]">Time</TableHead>
            <TableHead className="w-[100px]">Error Code</TableHead>
            <TableHead className="w-[300px]">Exception</TableHead>
            <TableHead>Query</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queryErrors.map(error => {
            const eventTime = DateTime.fromSQL(error.eventTime, { zone: "utc" });
            return (
              <TableRow key={error.queryId}>
                <TableCell className="text-xs">
                  {eventTime.toLocaleString(DateTime.DATETIME_SHORT)}
                </TableCell>
                <TableCell>
                  <Badge variant="destructive" className="text-xs">
                    {error.exceptionCode}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="max-w-[300px] truncate text-xs text-red-600 dark:text-red-400">
                    {error.exception}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="max-w-md truncate font-mono text-xs text-neutral-600 dark:text-neutral-400">
                    {error.query}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
