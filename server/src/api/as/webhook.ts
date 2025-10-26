import { sql } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/postgres/postgres.js";
import { IS_CLOUD } from "../../lib/const.js";

interface AppSumoWebhookPayload {
  test?: boolean;
  event: string;
  license_key: string;
  prev_license_key?: string; // Used in upgrade/downgrade events
  event_timestamp?: number; // Unix timestamp in milliseconds
  created_at?: number; // Unix timestamp in seconds
  license_status?: string;
  tier?: string | number;
  extra?: {
    reason?: string;
  };
  // Deal add-on specific fields
  partner_plan_name?: string;
  parent_license_key?: string;
  unit_quantity?: number;
}

/**
 * Check if AppSumo integration is enabled
 */
function isAppSumoEnabled(): boolean {
  return (
    IS_CLOUD &&
    !!process.env.APPSUMO_CLIENT_ID &&
    !!process.env.APPSUMO_CLIENT_SECRET
  );
}

/**
 * Validate webhook payload
 */
function validateWebhookPayload(payload: AppSumoWebhookPayload): boolean {
  if (!payload.license_key) {
    throw new Error("Missing license_key in webhook payload");
  }

  if (!payload.event) {
    throw new Error("Missing event in webhook payload");
  }

  const validEvents = ["purchase", "activate", "upgrade", "downgrade", "deactivate", "migrate", "test"];
  if (!validEvents.includes(payload.event)) {
    throw new Error(`Invalid event type: ${payload.event}`);
  }

  return true;
}

export async function handleAppSumoWebhook(
  request: FastifyRequest<{
    Body: AppSumoWebhookPayload;
  }>,
  reply: FastifyReply
) {
  if (!isAppSumoEnabled()) {
    return reply.status(503).send({
      error: "AppSumo integration is not available",
    });
  }

  const payload = request.body;

  // Handle test webhook for AppSumo validation
  if (payload.test === true || payload.event === "test") {
    return reply.status(200).send({
      event: "test",
      success: true,
    });
  }

  try {
    // Validate webhook payload
    validateWebhookPayload(payload);

    const {
      license_key,
      event,
      tier,
      parent_license_key,
      prev_license_key,
      license_status,
      event_timestamp,
      extra,
    } = payload;

    // Log webhook event for audit trail
    await db.execute(sql`
      INSERT INTO as_webhook_events (
        license_key,
        event,
        payload,
        processed_at,
        created_at
      ) VALUES (
        ${license_key},
        ${event},
        ${JSON.stringify(payload)},
        NOW(),
        NOW()
      )
    `);

    // Process the webhook based on event type
    switch (event) {
      case "purchase":
        // License purchased - create placeholder record
        // Note: license_status will be "inactive" until user activates
        await handlePurchaseEvent(license_key, tier, parent_license_key);
        break;

      case "activate":
        // License activated by user
        // Note: license_status is "inactive" in webhook, becomes active after our 200 response
        await handleActivateEvent(license_key, tier);
        break;

      case "upgrade":
        // License upgraded to higher tier
        // Note: Creates NEW license_key with prev_license_key pointing to old one
        // AppSumo sends simultaneous deactivate event for old license (we skip it)
        await handleUpgradeEvent(license_key, tier, prev_license_key);
        break;

      case "downgrade":
        // License downgraded to lower tier
        // Note: Creates NEW license_key with prev_license_key pointing to old one
        // AppSumo sends simultaneous deactivate event for old license (we skip it)
        await handleDowngradeEvent(license_key, tier, prev_license_key);
        break;

      case "deactivate":
        // License refunded or canceled
        // Note: license_status is "active" in webhook (for refunds), becomes deactivated after our 200 response
        // For upgrade/downgrade, license_status is already "deactivated" - we skip these
        const isUpgradeOrDowngradeDeactivation =
          extra?.reason === "Upgraded by customer" || extra?.reason === "Downgraded by customer";
        if (!isUpgradeOrDowngradeDeactivation) {
          await handleDeactivateEvent(license_key);
        }
        break;

      case "migrate":
        // Add-on migration when parent license is upgraded/downgraded
        // Note: parent_license_key is updated to point to new parent license
        await handleMigrateEvent(license_key, tier, parent_license_key);
        break;

      default:
        console.warn(`Unknown AppSumo webhook event: ${event}`);
    }

    // Return success response as required by AppSumo
    return reply.status(200).send({
      event: event,
      success: true,
    });
  } catch (error) {
    console.error("Error processing AppSumo webhook:", error);

    // Still return 200 to acknowledge receipt, but log the error
    return reply.status(200).send({
      event: payload.event || "unknown",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Handle purchase event - create placeholder license record
 */
async function handlePurchaseEvent(
  licenseKey: string,
  tier: any,
  parentLicenseKey?: string
) {
  const tierValue = tier?.toString() || "1";

  // Check if license already exists
  const existing = await db.execute(
    sql`SELECT id FROM as_licenses WHERE license_key = ${licenseKey} LIMIT 1`
  );

  if (Array.isArray(existing) && existing.length === 0) {
    // Create placeholder - will be linked to org when user activates
    await db.execute(sql`
      INSERT INTO as_licenses (
        organization_id,
        license_key,
        tier,
        status,
        parent_license_key,
        created_at,
        updated_at
      ) VALUES (
        NULL,
        ${licenseKey},
        ${tierValue},
        'pending',
        ${parentLicenseKey || null},
        NOW(),
        NOW()
      )
      ON CONFLICT (license_key) DO NOTHING
    `);
  }
}

/**
 * Handle activate event - update license status
 */
async function handleActivateEvent(licenseKey: string, tier: any) {
  const tierValue = tier?.toString() || "1";

  await db.execute(sql`
    UPDATE as_licenses
    SET
      status = 'active',
      tier = ${tierValue},
      activated_at = NOW(),
      updated_at = NOW()
    WHERE license_key = ${licenseKey}
  `);
}

/**
 * Handle upgrade event - create new license and transfer organization
 */
async function handleUpgradeEvent(licenseKey: string, tier: any, prevLicenseKey?: string) {
  const tierValue = tier?.toString() || "1";

  if (!prevLicenseKey) {
    console.warn("No prev_license_key provided for upgrade event");
    return;
  }

  // Get the old license to find the organization
  const oldLicenseResult = await db.execute(
    sql`SELECT organization_id FROM as_licenses WHERE license_key = ${prevLicenseKey} LIMIT 1`
  );

  if (!Array.isArray(oldLicenseResult) || oldLicenseResult.length === 0) {
    console.error(`Old license not found: ${prevLicenseKey}`);
    return;
  }

  const oldLicense = oldLicenseResult[0] as any;
  const organizationId = oldLicense.organization_id;

  // Create new license with the organization transferred
  await db.execute(sql`
    INSERT INTO as_licenses (
      organization_id,
      license_key,
      tier,
      status,
      activated_at,
      created_at,
      updated_at
    ) VALUES (
      ${organizationId},
      ${licenseKey},
      ${tierValue},
      ${organizationId ? 'active' : 'pending'},
      ${organizationId ? sql`NOW()` : null},
      NOW(),
      NOW()
    )
    ON CONFLICT (license_key) DO UPDATE SET
      organization_id = ${organizationId},
      tier = ${tierValue},
      status = ${organizationId ? 'active' : 'pending'},
      activated_at = ${organizationId ? sql`NOW()` : null},
      updated_at = NOW()
  `);

  // Deactivate the old license
  await db.execute(sql`
    UPDATE as_licenses
    SET
      status = 'inactive',
      deactivated_at = NOW(),
      updated_at = NOW()
    WHERE license_key = ${prevLicenseKey}
  `);
}

/**
 * Handle downgrade event - create new license and transfer organization
 */
async function handleDowngradeEvent(licenseKey: string, tier: any, prevLicenseKey?: string) {
  const tierValue = tier?.toString() || "1";

  if (!prevLicenseKey) {
    console.warn("No prev_license_key provided for downgrade event");
    return;
  }

  // Get the old license to find the organization
  const oldLicenseResult = await db.execute(
    sql`SELECT organization_id FROM as_licenses WHERE license_key = ${prevLicenseKey} LIMIT 1`
  );

  if (!Array.isArray(oldLicenseResult) || oldLicenseResult.length === 0) {
    console.error(`Old license not found: ${prevLicenseKey}`);
    return;
  }

  const oldLicense = oldLicenseResult[0] as any;
  const organizationId = oldLicense.organization_id;

  // Create new license with the organization transferred
  await db.execute(sql`
    INSERT INTO as_licenses (
      organization_id,
      license_key,
      tier,
      status,
      activated_at,
      created_at,
      updated_at
    ) VALUES (
      ${organizationId},
      ${licenseKey},
      ${tierValue},
      ${organizationId ? 'active' : 'pending'},
      ${organizationId ? sql`NOW()` : null},
      NOW(),
      NOW()
    )
    ON CONFLICT (license_key) DO UPDATE SET
      organization_id = ${organizationId},
      tier = ${tierValue},
      status = ${organizationId ? 'active' : 'pending'},
      activated_at = ${organizationId ? sql`NOW()` : null},
      updated_at = NOW()
  `);

  // Deactivate the old license
  await db.execute(sql`
    UPDATE as_licenses
    SET
      status = 'inactive',
      deactivated_at = NOW(),
      updated_at = NOW()
    WHERE license_key = ${prevLicenseKey}
  `);
}

/**
 * Handle deactivate event - mark license as inactive
 */
async function handleDeactivateEvent(licenseKey: string) {
  await db.execute(sql`
    UPDATE as_licenses
    SET
      status = 'inactive',
      deactivated_at = NOW(),
      updated_at = NOW()
    WHERE license_key = ${licenseKey}
  `);
}

/**
 * Handle migrate event - update parent license for add-ons
 */
async function handleMigrateEvent(
  licenseKey: string,
  tier: any,
  parentLicenseKey?: string
) {
  const tierValue = tier?.toString() || "1";

  await db.execute(sql`
    UPDATE as_licenses
    SET
      tier = ${tierValue},
      parent_license_key = ${parentLicenseKey || null},
      updated_at = NOW()
    WHERE license_key = ${licenseKey}
  `);
}
