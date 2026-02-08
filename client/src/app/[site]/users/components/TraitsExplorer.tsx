"use client";

import { useEffect, useMemo, useState } from "react";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { ChevronRight, Loader2, Tags } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { NothingFound } from "../../../../components/NothingFound";
import {
  useGetUserTraitKeys,
  useGetUserTraitValues,
  useGetUserTraitValueUsers,
} from "../../../../api/analytics/hooks/useGetUserTraits";
import { Avatar } from "../../../../components/Avatar";
import { IdentifiedBadge } from "../../../../components/IdentifiedBadge";
import {
  CountryFlagTooltipIcon,
  BrowserTooltipIcon,
  OperatingSystemTooltipIcon,
  DeviceTypeTooltipIcon,
} from "../../../../components/TooltipIcons/TooltipIcons";
import { getUserDisplayName } from "../../../../lib/utils";

function TraitValueUsersList({ traitKey, value }: { traitKey: string; value: string }) {
  const { site } = useParams();
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetUserTraitValueUsers(traitKey, value);

  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px 0px 200px 0px",
  });

  const flattenedUsers = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.users);
  }, [data]);

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [entry?.isIntersecting, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  if (isLoading) {
    return (
      <div className="pl-12 py-2 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5 animate-pulse">
            <div className="h-5 w-5 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (flattenedUsers.length === 0) {
    return (
      <div className="pl-12 py-3 text-xs text-neutral-500 dark:text-neutral-400">
        No users found
      </div>
    );
  }

  return (
    <div className="border-l border-neutral-150 dark:border-neutral-750 ml-[19px]">
      {flattenedUsers.map((user, index) => {
        const isIdentified = !!user.identified_user_id;
        const linkId = isIdentified ? user.identified_user_id : user.user_id;
        const encodedLinkId = encodeURIComponent(linkId);
        const displayName = getUserDisplayName(user);

        return (
          <div
            key={`${linkId}-${index}`}
            className="flex items-center gap-3 py-1.5 px-3 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
          >
            <Link
              href={`/${site}/user/${encodedLinkId}`}
              className="flex items-center gap-2 min-w-0 shrink"
            >
              <Avatar size={20} id={linkId} />
              <span className="truncate max-w-[160px] hover:underline" title={displayName}>
                {displayName}
              </span>
            </Link>
            {isIdentified && <IdentifiedBadge traits={user.traits} />}
            <div className="flex items-center gap-1.5 shrink-0">
              <CountryFlagTooltipIcon
                country={user.country || ""}
                city={user.city || ""}
                region={user.region || ""}
              />
              <BrowserTooltipIcon browser={user.browser || ""} />
              <OperatingSystemTooltipIcon operating_system={user.operating_system || ""} />
              <DeviceTypeTooltipIcon device_type={user.device_type || ""} />
              <span className="text-neutral-500 dark:text-neutral-400 text-xs whitespace-nowrap ml-1">
                {user.sessions.toLocaleString()} {user.sessions === 1 ? "session" : "sessions"}
              </span>
            </div>
          </div>
        );
      })}
      {isFetchingNextPage && (
        <div ref={ref} className="py-2 flex justify-center">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading more...
          </div>
        </div>
      )}
    </div>
  );
}

function TraitValueRow({
  traitKey,
  value,
  userCount,
}: {
  traitKey: string;
  value: string;
  userCount: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between py-1.5 px-3 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`h-4 w-4 text-neutral-400 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          <span className="text-neutral-700 dark:text-neutral-300 truncate">
            {value || <span className="italic text-neutral-400">empty</span>}
          </span>
        </div>
        <span className="text-neutral-500 dark:text-neutral-400 text-xs whitespace-nowrap">
          {userCount.toLocaleString()} {userCount === 1 ? "user" : "users"}
        </span>
      </button>
      {expanded && <TraitValueUsersList traitKey={traitKey} value={value} />}
    </div>
  );
}

function TraitValuesList({ traitKey }: { traitKey: string }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetUserTraitValues(traitKey);

  const [ref, entry] = useIntersectionObserver({
    threshold: 0,
    root: null,
    rootMargin: "0px 0px 200px 0px",
  });

  const flattenedValues = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.values);
  }, [data]);

  useEffect(() => {
    if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage && !isLoading) {
      fetchNextPage();
    }
  }, [entry?.isIntersecting, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading]);

  if (isLoading) {
    return (
      <div className="pl-8 py-2 space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-1 animate-pulse">
            <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-800 rounded" />
            <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="border-l border-neutral-150 dark:border-neutral-750 ml-[23px]">
      {flattenedValues.map((item, index) => (
        <TraitValueRow
          key={`${item.value}-${index}`}
          traitKey={traitKey}
          value={item.value}
          userCount={item.userCount}
        />
      ))}
      {isFetchingNextPage && (
        <div ref={ref} className="py-2 flex justify-center">
          <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading more...
          </div>
        </div>
      )}
    </div>
  );
}

function TraitKeyRow({ traitKey, userCount }: { traitKey: string; userCount: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-neutral-100 dark:border-neutral-800 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`h-4 w-4 text-neutral-400 transition-transform ${expanded ? "rotate-90" : ""}`}
          />
          <span className="font-medium text-sm">{traitKey}</span>
        </div>
        <span className="text-neutral-500 dark:text-neutral-400 text-xs">
          {userCount.toLocaleString()} {userCount === 1 ? "user" : "users"}
        </span>
      </button>
      {expanded && <TraitValuesList traitKey={traitKey} />}
    </div>
  );
}

export function TraitsExplorer() {
  const { data, isLoading } = useGetUserTraitKeys();

  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-100 dark:border-neutral-850 bg-white dark:bg-neutral-900">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-850 last:border-b-0 animate-pulse"
          >
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-neutral-200 dark:bg-neutral-800 rounded" />
              <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
            </div>
            <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-800 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!data?.keys?.length) {
    return (
      <NothingFound
        icon={<Tags className="w-10 h-10" />}
        title="No traits found"
        description="Traits will appear here once you identify users with custom properties."
      />
    );
  }

  return (
    <div className="rounded-lg border border-neutral-100 dark:border-neutral-850 bg-white dark:bg-neutral-900">
      {data.keys.map((item) => (
        <TraitKeyRow key={item.key} traitKey={item.key} userCount={item.userCount} />
      ))}
    </div>
  );
}
