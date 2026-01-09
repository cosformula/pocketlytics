import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { funnels as funnelsTable } from "../../../db/postgres/schema.js";
import { getUserHasAccessToSite } from "../../../lib/auth-utils.js";

export async function deleteFunnel(
  request: FastifyRequest<{
    Params: {
      funnelId: string;
    };
  }>,
  reply: FastifyReply
) {
  const { funnelId } = request.params;

  try {
    const funnel = await db.query.funnels.findFirst({
      where: eq(funnelsTable.reportId, parseInt(funnelId)),
    });

    if (!funnel) {
      return reply.status(404).send({ error: "Funnel not found" });
    }

    if (!funnel.siteId) {
      return reply.status(400).send({ error: "Invalid funnel: missing site ID" });
    }

    const userHasAccessToSite = await getUserHasAccessToSite(request, funnel.siteId.toString());
    if (!userHasAccessToSite) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    await db.delete(funnelsTable).where(eq(funnelsTable.reportId, parseInt(funnelId)));

    return reply.status(200).send({ success: true });
  } catch (error) {
    console.error("Error deleting funnel:", error);
    return reply.status(500).send({ error: "Failed to delete funnel" });
  }
}
