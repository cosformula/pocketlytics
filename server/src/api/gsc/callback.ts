import { FastifyReply, FastifyRequest } from "fastify";
import { GSCCallbackRequest } from "./types.js";
import { gscConnections } from "../../db/postgres/schema.js";
import { eq } from "drizzle-orm";
import { getGSCProperties } from "./utils.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { db } from "../../db/postgres/postgres.js";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * Handles the OAuth callback from Google
 * Exchanges the code for tokens and stores them in the database
 */
export async function gscCallback(req: FastifyRequest<GSCCallbackRequest>, res: FastifyReply) {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error("OAuth error:", error);
      return res.redirect(`${process.env.BASE_URL}/error?message=OAuth failed`);
    }

    if (!code || !state) {
      return res.status(400).send({ error: "Missing code or state parameter" });
    }

    const siteId = Number(state);
    if (isNaN(siteId)) {
      return res.status(400).send({ error: "Invalid site ID in state" });
    }

    // Get session to retrieve userId
    const session = await getSessionFromReq(req);
    if (!session) {
      return res.status(401).send({ error: "Unauthorized" });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.SERVER_URL}/api/gsc/callback`;

    if (!clientId || !clientSecret) {
      return res.status(500).send({ error: "Google OAuth not configured" });
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", await tokenResponse.text());
      return res.redirect(`${process.env.BASE_URL}/error?message=Token exchange failed`);
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // Get available GSC properties
    const properties = await getGSCProperties(tokens.access_token);

    if (properties.length === 0) {
      return res.redirect(`${process.env.BASE_URL}/error?message=No GSC properties found`);
    }

    // Use the first property by default
    // TODO: In a future iteration, allow user to select which property to use
    const gscPropertyUrl = properties[0];

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Check if connection already exists
    const [existingConnection] = await db.select().from(gscConnections).where(eq(gscConnections.siteId, siteId));

    if (existingConnection) {
      // Update existing connection
      await db
        .update(gscConnections)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: expiresAt.toISOString(),
          gscPropertyUrl,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(gscConnections.siteId, siteId));
    } else {
      // Create new connection
      await db.insert(gscConnections).values({
        siteId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: expiresAt.toISOString(),
        gscPropertyUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Redirect back to the client with success
    return res.redirect(`${process.env.BASE_URL}/${siteId}/settings?gsc=success`);
  } catch (error) {
    console.error("Error handling GSC callback:", error);
    return res.redirect(`${process.env.BASE_URL}/error?message=Callback failed`);
  }
}
