import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/postgres/postgres.js";
import { goals } from "../../../db/postgres/schema.js";
import { getUserHasAccessToSite } from "../../../lib/auth-utils.js";
import { z } from "zod";
import { eq } from "drizzle-orm";

const pathPatternSchema = z.string().min(1, "Path pattern cannot be empty");

const eventConfigSchema = z
  .object({
    eventName: z.string().min(1, "Event name cannot be empty"),
    eventPropertyKey: z.string().optional(),
    eventPropertyValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  })
  .refine(
    data => {
      if (data.eventPropertyKey && data.eventPropertyValue === undefined) {
        return false;
      }
      if (data.eventPropertyValue !== undefined && !data.eventPropertyKey) {
        return false;
      }
      return true;
    },
    {
      message: "Both eventPropertyKey and eventPropertyValue must be provided together or omitted together",
    }
  );

const updateGoalSchema = z
  .object({
    goalId: z.number().int().positive("Goal ID must be a positive integer"),
    siteId: z.number().int().positive("Site ID must be a positive integer"),
    name: z.string().optional(),
    goalType: z.enum(["path", "event"]),
    config: z.object({
      pathPattern: z.string().optional(),
      eventName: z.string().optional(),
      eventPropertyKey: z.string().optional(),
      eventPropertyValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
    }),
  })
  .refine(
    data => {
      if (data.goalType === "path") {
        return !!data.config.pathPattern;
      } else if (data.goalType === "event") {
        return !!data.config.eventName;
      }
      return false;
    },
    {
      message: "Configuration must match goal type",
      path: ["config"],
    }
  );

type UpdateGoalRequest = z.infer<typeof updateGoalSchema>;

export async function updateGoal(
  request: FastifyRequest<{
    Body: UpdateGoalRequest;
  }>,
  reply: FastifyReply
) {
  try {
    const validatedData = updateGoalSchema.parse(request.body);
    const { goalId, siteId, name, goalType, config } = validatedData;

    const existingGoal = await db.query.goals.findFirst({
      where: eq(goals.goalId, goalId),
    });

    if (!existingGoal) {
      return reply.status(404).send({ error: "Goal not found" });
    }

    if (existingGoal.siteId !== siteId) {
      return reply.status(403).send({ error: "Goal does not belong to the specified site" });
    }

    const userHasAccessToSite = await getUserHasAccessToSite(request, siteId.toString());
    if (!userHasAccessToSite) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    if (goalType === "path") {
      pathPatternSchema.parse(config.pathPattern);
    } else if (goalType === "event") {
      eventConfigSchema.parse({
        eventName: config.eventName,
        eventPropertyKey: config.eventPropertyKey,
        eventPropertyValue: config.eventPropertyValue,
      });
    }

    const result = await db
      .update(goals)
      .set({
        name: name || null,
        goalType,
        config,
      })
      .where(eq(goals.goalId, goalId))
      .returning({ goalId: goals.goalId });

    if (!result || result.length === 0) {
      return reply.status(500).send({ error: "Failed to update goal" });
    }

    return reply.send({
      success: true,
      goalId: result[0].goalId,
    });
  } catch (error) {
    console.error("Error updating goal:", error);

    if (error instanceof z.ZodError) {
      return reply.status(400).send({
        error: "Validation error",
        details: error.errors,
      });
    }

    return reply.status(500).send({ error: "Failed to update goal" });
  }
}
