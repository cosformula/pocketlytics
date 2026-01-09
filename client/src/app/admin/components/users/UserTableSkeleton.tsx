"use client";

import { TableCell, TableRow } from "@/components/ui/table";

interface SkeletonProps {
  rowCount?: number;
  columnCount?: number;
}

export function UserTableSkeleton({ rowCount = 50 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, index) => (
        <TableRow key={index} className="animate-pulse">
          <TableCell>
            <div className="h-6 bg-neutral-800 rounded w-32 font-mono"></div>
          </TableCell>
          <TableCell>
            <div className="h-6 bg-neutral-800 rounded w-24"></div>
          </TableCell>
          <TableCell>
            <div className="h-6 bg-neutral-800 rounded w-48"></div>
          </TableCell>
          <TableCell>
            <div className="h-6 bg-neutral-800 rounded w-16"></div>
          </TableCell>
          <TableCell>
            <div className="h-6 bg-neutral-800 rounded w-24"></div>
          </TableCell>
          <TableCell>
            <div className="h-8 bg-neutral-800 rounded w-28"></div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
