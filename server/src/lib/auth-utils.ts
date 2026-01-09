import { and, eq, inArray } from "drizzle-orm";
import { FastifyRequest } from "fastify";
import NodeCache from "node-cache";
import { db } from "../db/postgres/postgres.js";
import { member, memberSiteAccess, sites, user } from "../db/postgres/schema.js";
import { auth } from "./auth.js";
import { siteConfig } from "./siteConfig.js";
import { logger } from "./logger/logger.js";

export function mapHeaders(headers: any) {
  const entries = Object.entries(headers);
  const map = new Map();
  for (const [headerKey, headerValue] of entries) {
    if (headerValue != null) {
      map.set(headerKey, headerValue);
    }
  }
  return map;
}

export async function getSessionFromReq(req: FastifyRequest) {
  const headers = new Headers(req.headers as any);
  const session = await auth!.api.getSession({ headers });
  return session;
}

export async function getIsUserAdmin(req: FastifyRequest) {
  const session = await getSessionFromReq(req);
  const userId = session?.user.id;

  if (!userId) {
    return false;
  }

  const userRecord = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1);
  return userRecord.length > 0 && userRecord[0].role === "admin";
}

const sitesAccessCache = new NodeCache({
  stdTTL: 15,
  checkperiod: 30,
  useClones: false,
});

export async function getSitesUserHasAccessTo(req: FastifyRequest, adminOnly = false) {
  const session = await getSessionFromReq(req);

  const userId = session?.user.id;

  if (!userId) {
    return [];
  }

  const cacheKey = `${userId}:${adminOnly}`;

  const cached = sitesAccessCache.get<Promise<any[]>>(cacheKey);
  if (cached) {
    return cached;
  }

  const promise = (async () => {
    try {
      const [isAdmin, memberRecords] = await Promise.all([
        getIsUserAdmin(req),
        db
          .select({
            id: member.id,
            organizationId: member.organizationId,
            role: member.role,
            hasRestrictedSiteAccess: member.hasRestrictedSiteAccess,
          })
          .from(member)
          .where(eq(member.userId, userId)),
      ]);

      if (isAdmin) {
        const allSites = await db.select().from(sites);
        return allSites;
      }

      if (!memberRecords || memberRecords.length === 0) {
        return [];
      }

      const fullAccessOrgIds: string[] = [];
      const restrictedMemberIds: string[] = [];

      for (const record of memberRecords) {
        if (adminOnly && record.role === "member") {
          continue;
        }

        if (record.role === "admin" || record.role === "owner") {
          fullAccessOrgIds.push(record.organizationId);
        } else if (record.role === "member" && record.hasRestrictedSiteAccess) {
          restrictedMemberIds.push(record.id);
        } else {
          fullAccessOrgIds.push(record.organizationId);
        }
      }

      const [orgSites, restrictedSites] = await Promise.all([
        fullAccessOrgIds.length > 0
          ? db.select().from(sites).where(inArray(sites.organizationId, fullAccessOrgIds))
          : Promise.resolve([]),
        restrictedMemberIds.length > 0
          ? (async () => {
              const siteAccess = await db
                .select({ siteId: memberSiteAccess.siteId })
                .from(memberSiteAccess)
                .where(inArray(memberSiteAccess.memberId, restrictedMemberIds));
              const siteIds = siteAccess.map(s => s.siteId);
              if (siteIds.length === 0) return [];
              return db.select().from(sites).where(inArray(sites.siteId, siteIds));
            })()
          : Promise.resolve([]),
      ]);

      const siteMap = new Map<number, (typeof orgSites)[0]>();
      for (const site of orgSites) {
        siteMap.set(site.siteId, site);
      }
      for (const site of restrictedSites) {
        if (!siteMap.has(site.siteId)) {
          siteMap.set(site.siteId, site);
        }
      }

      return Array.from(siteMap.values());
    } catch (error) {
      console.error("Error getting sites user has access to:", error);
      sitesAccessCache.del(cacheKey);
      return [];
    }
  })();

  sitesAccessCache.set(cacheKey, promise);

  return promise;
}

export function invalidateSitesAccessCache(userId: string) {
  sitesAccessCache.del(`${userId}:true`);
  sitesAccessCache.del(`${userId}:false`);
}

export async function checkApiKey(req: FastifyRequest, options: { organizationId?: string; siteId?: string | number }) {
  const authHeader = req.headers["authorization"];
  const bearerToken =
    authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;

  const queryApiKey = (req.query as any)?.api_key;
  const apiKey = bearerToken || queryApiKey;

  if (apiKey && typeof apiKey === "string") {
    try {
      const result = await auth.api.verifyApiKey({
        body: { key: apiKey },
      });

      if (result.valid && result.key) {
        const apiKeyUserId = result.key.userId;

        let organizationId = options.organizationId;

        if (!organizationId && options.siteId) {
          const siteRecords = await db
            .select({
              organizationId: sites.organizationId,
            })
            .from(sites)
            .where(eq(sites.siteId, Number(options.siteId)))
            .limit(1);

          if (siteRecords.length > 0 && siteRecords[0].organizationId) {
            organizationId = siteRecords[0].organizationId;
          }
        }

        if (organizationId) {
          const userMembership = await db
            .select()
            .from(member)
            .where(and(eq(member.userId, apiKeyUserId), eq(member.organizationId, organizationId)))
            .limit(1);

          if (userMembership.length > 0) {
            return { valid: true, role: userMembership[0].role };
          }
        }
        return { valid: false, role: null };
      }
    } catch (error) {
      logger.error(error, "Error verifying API key");
    }
  }
  return { valid: false, role: null };
}

export async function getUserIdFromRequest(req: FastifyRequest): Promise<string | null> {
  const session = await getSessionFromReq(req);
  if (session?.user?.id) {
    return session.user.id;
  }

  const authHeader = req.headers["authorization"];
  const bearerToken =
    authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : null;
  const queryApiKey = (req.query as any)?.api_key;
  const apiKey = bearerToken || queryApiKey;

  if (apiKey && typeof apiKey === "string") {
    try {
      const result = await auth.api.verifyApiKey({
        body: { key: apiKey },
      });
      if (result.valid && result.key?.userId) {
        return result.key.userId;
      }
    } catch (error) {
      logger.error(error, "Error verifying API key");
    }
  }

  return null;
}

export async function getUserHasAccessToSitePublic(req: FastifyRequest, siteId: string | number) {
  const [userSites, config] = await Promise.all([getSitesUserHasAccessTo(req), siteConfig.getConfig(siteId)]);

  const hasDirectAccess = userSites.some(site => site.siteId === Number(siteId));
  if (hasDirectAccess) {
    return true;
  }

  if (config?.public) {
    return true;
  }

  const privateKey = req.headers["x-private-key"];
  if (privateKey && typeof privateKey === "string" && config?.privateLinkKey === privateKey) {
    return true;
  }

  const result = await checkApiKey(req, { siteId });
  if (result.valid) {
    return true;
  }

  return false;
}

export async function getUserHasAccessToSite(req: FastifyRequest, siteId: string | number) {
  const sites = await getSitesUserHasAccessTo(req);
  return sites.some(site => site.siteId === Number(siteId));
}

export async function getUserHasAdminAccessToSite(req: FastifyRequest, siteId: string | number) {
  const sites = await getSitesUserHasAccessTo(req, true);
  return sites.some(site => site.siteId === Number(siteId));
}

export async function getUserIsInOrg(req: FastifyRequest, organizationId: string) {
  const session = await getSessionFromReq(req);

  if (!session?.user.id) {
    return false;
  }

  const userMembership = await db.query.member.findFirst({
    where: and(eq(member.userId, session.user.id), eq(member.organizationId, organizationId)),
  });

  return userMembership;
}
