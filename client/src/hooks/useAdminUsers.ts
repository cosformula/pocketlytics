"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth";
import { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { AdminUser } from "@/types/admin";
import { useRouter } from "next/navigation";

export function useAdminUsers() {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 50 });
  const [globalFilter, setGlobalFilter] = useState("");

  const fetchUsers = async () => {
    const sortBy = sorting.length > 0 ? sorting[0].id : "createdAt";
    const sortDirection = sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : "desc";

    let emailFilter = "";
    let roleFilter = "";

    columnFilters.forEach(filter => {
      if (filter.id === "email" && typeof filter.value === "string") {
        emailFilter = filter.value;
      }
      if (filter.id === "role" && typeof filter.value === "string") {
        roleFilter = filter.value;
      }
    });

    const response = await authClient.admin.listUsers({
      query: {
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        sortBy,
        sortDirection,
        ...(emailFilter && {
          searchField: "email",
          searchOperator: "contains",
          searchValue: emailFilter.toLowerCase(),
        }),
        ...(roleFilter && {
          filterField: "role",
          filterOperator: "eq",
          filterValue: roleFilter,
        }),
      },
    });

    const users = response.data?.users || [];
    const total = response.data?.total || 0;

    return {
      users,
      total,
    };
  };

  const { data, isLoading, isError, refetch } = useQuery<{
    users: AdminUser[];
    total: number;
  }>({
    queryKey: ["admin-users", pagination.pageIndex, pagination.pageSize, sorting, columnFilters, globalFilter],
    queryFn: fetchUsers,
  });

  const handleImpersonate = async (userId: string) => {
    try {
      await authClient.admin.impersonateUser({
        userId,
      });
      router.push("/");
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error(`Failed to impersonate user: ${errorMessage}`);
      return false;
    }
  };

  const handleStopImpersonating = async () => {
    try {
      await authClient.admin.stopImpersonating();
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error(`Failed to stop impersonation: ${errorMessage}`);
      return false;
    }
  };

  return {
    users: data?.users || [],
    total: data?.total || 0,
    isLoading,
    isError,
    sorting,
    setSorting,
    columnFilters,
    setColumnFilters,
    pagination,
    setPagination,
    globalFilter,
    setGlobalFilter,
    refetch,
    handleImpersonate,
    handleStopImpersonating,
  };
}
