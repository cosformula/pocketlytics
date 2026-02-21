import { and, desc, eq, inArray } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { uptimeIncidents, uptimeMonitors } from "../../db/postgres/schema.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { getUserOrganizations } from "./utils.js";

// Schemas
const incidentStatusSchema = z.enum(["active", "acknowledged", "resolved", "all"]);

const getIncidentsQuerySchema = z.object({
  status: incidentStatusSchema.default("all"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const incidentIdParamsSchema = z.object({
  id: z.coerce.number().int(),
});

const incidentSchema = z.object({
  id: z.number(),
  organizationId: z.string(),
  monitorId: z.number(),
  monitorName: z.string(),
  region: z.string().nullable(),
  startTime: z.string(),
  endTime: z.string().nullable(),
  status: z.string(),
  acknowledgedBy: z.string().nullable(),
  acknowledgedAt: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  lastError: z.string().nullable(),
  lastErrorType: z.string().nullable(),
  failureCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const incidentsRoutes = async (server: FastifyInstance) => {
  // Get incidents
  server.route({
    method: "GET",
    url: "/api/uptime/incidents",
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await getSessionFromReq(request);
      const userId = session?.user?.id;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // Get user's organizations
      const organizationIds = await getUserOrganizations(userId);

      if (organizationIds.length === 0) {
        return reply.status(403).send({ error: "No organization access" });
      }

      const query = getIncidentsQuerySchema.parse(request.query);
      const { status, limit, offset } = query;

      // Build where conditions
      const conditions = [inArray(uptimeIncidents.organizationId, organizationIds)];

      if (status !== "all") {
        conditions.push(eq(uptimeIncidents.status, status));
      }

      const incidentRows = await db
        .select({
          id: uptimeIncidents.id,
          organizationId: uptimeIncidents.organizationId,
          monitorId: uptimeIncidents.monitorId,
          monitorName: uptimeMonitors.name,
          monitorType: uptimeMonitors.monitorType,
          httpConfig: uptimeMonitors.httpConfig,
          tcpConfig: uptimeMonitors.tcpConfig,
          region: uptimeIncidents.region,
          startTime: uptimeIncidents.startTime,
          endTime: uptimeIncidents.endTime,
          status: uptimeIncidents.status,
          acknowledgedBy: uptimeIncidents.acknowledgedBy,
          acknowledgedAt: uptimeIncidents.acknowledgedAt,
          resolvedBy: uptimeIncidents.resolvedBy,
          resolvedAt: uptimeIncidents.resolvedAt,
          lastError: uptimeIncidents.lastError,
          lastErrorType: uptimeIncidents.lastErrorType,
          failureCount: uptimeIncidents.failureCount,
          createdAt: uptimeIncidents.createdAt,
          updatedAt: uptimeIncidents.updatedAt,
        })
        .from(uptimeIncidents)
        .leftJoin(uptimeMonitors, eq(uptimeIncidents.monitorId, uptimeMonitors.id))
        .where(and(...conditions))
        .orderBy(desc(uptimeIncidents.startTime));

      const toHourBucket = (value: string | null) => {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        date.setMinutes(0, 0, 0);
        return date.toISOString();
      };

      const getMonitorName = (row: (typeof incidentRows)[number]) => {
        if (row.monitorName && row.monitorName.trim() !== "") {
          return row.monitorName;
        }
        if (row.monitorType === "http") {
          const httpConfig = row.httpConfig as { url?: string } | null;
          return httpConfig?.url || "HTTP Monitor";
        }
        if (row.monitorType === "tcp") {
          const tcpConfig = row.tcpConfig as { host?: string; port?: number } | null;
          if (tcpConfig?.host && tcpConfig?.port) {
            return `${tcpConfig.host}:${tcpConfig.port}`;
          }
          return "TCP Monitor";
        }
        return "Unknown Monitor";
      };

      type GroupedIncident = {
        id: number;
        organizationId: string;
        monitorId: number;
        monitorName: string;
        affectedRegions: string[];
        startTime: string;
        endTime: string | null;
        status: string;
        acknowledgedBy: string | null;
        acknowledgedAt: string | null;
        resolvedBy: string | null;
        resolvedAt: string | null;
        lastError: string | null;
        lastErrorType: string | null;
        failureCount: number;
        createdAt: string | null;
        updatedAt: string | null;
      };

      const groupedMap = new Map<string, GroupedIncident & { affectedRegionSet: Set<string>; latestUpdatedAt: string }>();

      for (const row of incidentRows) {
        const resolvedBucket = row.status === "resolved" ? toHourBucket(row.endTime) : "";
        const key = `${row.monitorId}-${row.status}-${resolvedBucket}`;
        const fallbackUpdatedAt = row.updatedAt ?? row.createdAt ?? row.startTime;

        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            id: row.id,
            organizationId: row.organizationId,
            monitorId: row.monitorId,
            monitorName: getMonitorName(row),
            affectedRegions: [],
            affectedRegionSet: new Set<string>(),
            startTime: row.startTime,
            endTime: row.endTime,
            status: row.status,
            acknowledgedBy: row.acknowledgedBy,
            acknowledgedAt: row.acknowledgedAt,
            resolvedBy: row.resolvedBy,
            resolvedAt: row.resolvedAt,
            lastError: row.lastError,
            lastErrorType: row.lastErrorType,
            failureCount: row.failureCount ?? 0,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            latestUpdatedAt: fallbackUpdatedAt,
          });
        } else {
          const existing = groupedMap.get(key)!;

          if (row.id < existing.id) existing.id = row.id;
          if (row.startTime < existing.startTime) existing.startTime = row.startTime;
          if (existing.createdAt === null || (row.createdAt && row.createdAt < existing.createdAt)) {
            existing.createdAt = row.createdAt;
          }
          if (!existing.endTime || (row.endTime && row.endTime > existing.endTime)) existing.endTime = row.endTime;
          if (row.updatedAt && (!existing.updatedAt || row.updatedAt > existing.updatedAt)) {
            existing.updatedAt = row.updatedAt;
          }
          existing.failureCount += row.failureCount ?? 0;

          if (fallbackUpdatedAt >= existing.latestUpdatedAt) {
            existing.acknowledgedBy = row.acknowledgedBy;
            existing.acknowledgedAt = row.acknowledgedAt;
            existing.resolvedBy = row.resolvedBy;
            existing.resolvedAt = row.resolvedAt;
            existing.lastError = row.lastError;
            existing.lastErrorType = row.lastErrorType;
            existing.latestUpdatedAt = fallbackUpdatedAt;
          }
        }

        const current = groupedMap.get(key)!;
        if (row.region) {
          current.affectedRegionSet.add(row.region);
        }
      }

      const groupedIncidents = Array.from(groupedMap.values())
        .map(({ affectedRegionSet, latestUpdatedAt: _, ...incident }) => ({
          ...incident,
          affectedRegions: Array.from(affectedRegionSet).sort(),
        }))
        .sort((a, b) => (a.startTime < b.startTime ? 1 : -1));

      const total = groupedIncidents.length;
      const paginatedIncidents = groupedIncidents.slice(offset, offset + limit);

      return reply.send({
        incidents: paginatedIncidents,
        pagination: {
          total,
          limit,
          offset,
        },
      });
    },
  });

  // Acknowledge incident
  server.route({
    method: "PATCH",
    url: "/api/uptime/incidents/:id/acknowledge",
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await getSessionFromReq(request);
      const userId = session?.user?.id;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const params = incidentIdParamsSchema.parse(request.params);
      const { id } = params;

      // Get user's organizations
      const organizationIds = await getUserOrganizations(userId);

      if (organizationIds.length === 0) {
        return reply.status(403).send({ error: "No organization access" });
      }

      // Verify incident belongs to user's organization
      const incident = await db
        .select()
        .from(uptimeIncidents)
        .where(and(eq(uptimeIncidents.id, id), inArray(uptimeIncidents.organizationId, organizationIds)))
        .limit(1);

      if (!incident[0]) {
        return reply.code(404).send({ error: "Incident not found" });
      }

      if (incident[0].status === "resolved") {
        return reply.code(400).send({ error: "Cannot acknowledge resolved incident" });
      }

      // Update incident
      const now = new Date().toISOString();
      const [updated] = await db
        .update(uptimeIncidents)
        .set({
          status: "acknowledged",
          acknowledgedBy: userId,
          acknowledgedAt: now,
          updatedAt: now,
        })
        .where(eq(uptimeIncidents.id, id))
        .returning({
          id: uptimeIncidents.id,
          status: uptimeIncidents.status,
          acknowledgedBy: uptimeIncidents.acknowledgedBy,
          acknowledgedAt: uptimeIncidents.acknowledgedAt,
        });

      return reply.send({
        success: true,
        incident: updated,
      });
    },
  });

  // Resolve incident
  server.route({
    method: "PATCH",
    url: "/api/uptime/incidents/:id/resolve",
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await getSessionFromReq(request);
      const userId = session?.user?.id;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const params = incidentIdParamsSchema.parse(request.params);
      const { id } = params;

      // Get user's organizations
      const organizationIds = await getUserOrganizations(userId);

      if (organizationIds.length === 0) {
        return reply.status(403).send({ error: "No organization access" });
      }

      // Verify incident belongs to user's organization
      const incident = await db
        .select()
        .from(uptimeIncidents)
        .where(and(eq(uptimeIncidents.id, id), inArray(uptimeIncidents.organizationId, organizationIds)))
        .limit(1);

      if (!incident[0]) {
        return reply.code(404).send({ error: "Incident not found" });
      }

      if (incident[0].status === "resolved") {
        return reply.code(400).send({ error: "Incident already resolved" });
      }

      // Update incident
      const now = new Date().toISOString();
      const [updated] = await db
        .update(uptimeIncidents)
        .set({
          status: "resolved",
          resolvedBy: userId,
          resolvedAt: now,
          endTime: now,
          updatedAt: now,
        })
        .where(eq(uptimeIncidents.id, id))
        .returning({
          id: uptimeIncidents.id,
          status: uptimeIncidents.status,
          resolvedBy: uptimeIncidents.resolvedBy,
          resolvedAt: uptimeIncidents.resolvedAt,
          endTime: uptimeIncidents.endTime,
        });

      return reply.send({
        success: true,
        incident: updated,
      });
    },
  });
};
