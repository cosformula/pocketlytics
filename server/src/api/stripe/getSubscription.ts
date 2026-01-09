import { eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { DateTime } from "luxon";
import Stripe from "stripe";
import { db } from "../../db/postgres/postgres.js";
import { organization } from "../../db/postgres/schema.js";
import { getBestSubscription } from "../../lib/subscriptionUtils.js";

function getStartOfMonth() {
  return DateTime.now().startOf("month").toJSDate();
}

function getStartOfNextMonth() {
  return DateTime.now().startOf("month").plus({ months: 1 }).toJSDate();
}

export async function getSubscriptionInner(organizationId: string) {
  const orgResult = await db
    .select({
      stripeCustomerId: organization.stripeCustomerId,
      monthlyEventCount: organization.monthlyEventCount,
      createdAt: organization.createdAt,
      name: organization.name,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  const org = orgResult[0];

  if (!org) {
    return null;
  }

  const subscription = await getBestSubscription(organizationId, org.stripeCustomerId);

  if (subscription.source === "override") {
    return {
      id: null,
      planName: subscription.planName,
      status: subscription.status,
      currentPeriodEnd: getStartOfNextMonth(),
      currentPeriodStart: getStartOfMonth(),
      eventLimit: subscription.eventLimit,
      monthlyEventCount: org.monthlyEventCount || 0,
      interval: subscription.interval,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      isPro: subscription.isPro,
      isOverride: true,
    };
  }

  if (subscription.source === "appsumo") {
    return {
      id: null,
      planName: subscription.planName,
      status: subscription.status,
      currentPeriodEnd: getStartOfNextMonth(),
      currentPeriodStart: getStartOfMonth(),
      eventLimit: subscription.eventLimit,
      monthlyEventCount: org.monthlyEventCount || 0,
      interval: subscription.interval,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      isPro: false,
    };
  }

  if (subscription.source === "stripe") {
    return {
      id: subscription.subscriptionId,
      planName: subscription.planName,
      isPro: subscription.isPro,
      status: subscription.status,
      createdAt: subscription.createdAt,
      currentPeriodStart: DateTime.fromISO(subscription.periodStart).toJSDate(),
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      eventLimit: subscription.eventLimit,
      monthlyEventCount: org.monthlyEventCount || 0,
      interval: subscription.interval,
    };
  }

  return {
    id: null,
    planName: subscription.planName,
    status: subscription.status,
    currentPeriodEnd: getStartOfNextMonth(),
    currentPeriodStart: getStartOfMonth(),
    eventLimit: subscription.eventLimit,
    monthlyEventCount: org.monthlyEventCount || 0,
    trialDaysRemaining: 0,
  };
}

export async function getSubscription(
  request: FastifyRequest<{
    Querystring: {
      organizationId: string;
    };
  }>,
  reply: FastifyReply
) {
  const userId = request.user?.id;
  const { organizationId } = request.query;

  if (!userId) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  if (!organizationId) {
    return reply.status(400).send({ error: "Organization ID is required" });
  }

  try {
    const responseData = await getSubscriptionInner(organizationId);
    return reply.send(responseData);
  } catch (error: any) {
    console.error("Get Subscription Error:", error);
    if (error instanceof Stripe.errors.StripeError) {
      return reply.status(error.statusCode || 500).send({ error: error.message });
    } else {
      return reply.status(500).send({
        error: "Failed to fetch subscription details",
        details: error.message,
      });
    }
  }
}
