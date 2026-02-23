#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

function parseEnvFile(content) {
  const parsed = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    parsed[key] = value;
  }
  return parsed;
}

async function loadServerEnv() {
  const envPath = path.join(ROOT_DIR, "server", ".env");
  if (!existsSync(envPath)) return;
  const raw = await readFile(envPath, "utf8");
  const parsed = parseEnvFile(raw);
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function replacePathParams(pathTemplate, context, useRealIds) {
  const replacements = {
    siteId: useRealIds ? String(context.siteId) : String(context.fakeSiteId),
    organizationId: useRealIds ? context.organizationId : context.fakeOrganizationId,
    memberId: "fake-member-id",
    invitationId: "fake-invitation-id",
    goalId: "999999",
    funnelId: "999999",
    stepNumber: "1",
    importId: "fake-import-id",
    sessionId: "fake-session-id",
    userId: "fake-user-id",
    keyId: "fake-key-id",
  };

  return pathTemplate.replace(/:([A-Za-z0-9_]+)/g, (_, key) => replacements[key] ?? "1");
}

function withDefaultQuery(route, context) {
  const query = new URLSearchParams();
  const pathTemplate = route.path;

  if (pathTemplate.includes("/sites/:siteId/overview-bucketed")) {
    query.set("past_minutes_start", "60");
    query.set("past_minutes_end", "0");
    query.set("bucket", "hour");
    query.set("stat", "users");
  }

  if (pathTemplate.includes("/sites/:siteId/overview") && !pathTemplate.includes("overview-bucketed")) {
    query.set("past_minutes_start", "60");
    query.set("past_minutes_end", "0");
  }

  if (pathTemplate.includes("/sites/:siteId/metric")) {
    query.set("parameter", "browser");
    query.set("past_minutes_start", "60");
    query.set("past_minutes_end", "0");
    query.set("page", "1");
    query.set("limit", "20");
  }

  if (
    pathTemplate.includes("/sites/:siteId/sessions") ||
    pathTemplate.includes("/sites/:siteId/users") ||
    pathTemplate.includes("/sites/:siteId/events")
  ) {
    query.set("past_minutes_start", "60");
    query.set("past_minutes_end", "0");
    query.set("page", "1");
    query.set("limit", "20");
    query.set("time_zone", "UTC");
  }

  if (pathTemplate.includes("/sites/:siteId/events/bucketed")) {
    query.set("event", "__all_events__");
  }

  if (pathTemplate.includes("/sites/:siteId/export/pdf")) {
    query.set("past_minutes_start", "60");
    query.set("past_minutes_end", "0");
  }

  if (pathTemplate.includes("/sites/:siteId/gsc/data")) {
    query.set("startDate", new Date().toISOString().slice(0, 10));
    query.set("endDate", new Date().toISOString().slice(0, 10));
  }

  if (pathTemplate.includes("/stripe/subscription")) {
    query.set("organizationId", context.organizationId);
  }

  if (pathTemplate.includes("/user/unsubscribe-marketing-oneclick")) {
    query.set("email", context.testEmail);
  }

  const rendered = route.resolvedPath;
  const queryString = query.toString();
  return queryString ? `${rendered}?${queryString}` : rendered;
}

function defaultBodyForRoute(route, context) {
  if (route.path === "/api/track") {
    return {
      type: "custom_event",
      site_id: String(context.sitePublicId),
      event_name: `endpoint_sweep_${Date.now()}`,
      properties: "{\"source\":\"endpoint-sweep\"}",
      hostname: "sweep.local",
      pathname: "/sweep",
      querystring: "",
      page_title: "Endpoint Sweep",
      user_agent: "endpoint-sweep/1.0",
      language: "en-US",
    };
  }

  if (route.path === "/api/identify") {
    return {
      site_id: String(context.sitePublicId),
      user_id: "endpoint-sweep-user",
      anonymous_id: "endpoint-sweep-anon",
      traits: { source: "endpoint-sweep" },
    };
  }

  return {};
}

function extractRoutes(indexSource) {
  const routes = [];
  const seen = new Set();

  const fastifyRegex = /\bfastify\.(get|post|put|delete|patch|options|head|all)\(\s*"([^"]+)"/g;
  const serverRegex = /\bserver\.(get|post|put|delete|patch|options|head)\(\s*"([^"]+)"/g;

  for (const match of indexSource.matchAll(fastifyRegex)) {
    const method = match[1].toUpperCase();
    const rawPath = match[2];

    if (rawPath.includes("*") || method === "ALL") continue;

    const pathWithPrefix = rawPath.startsWith("/api") ? rawPath : `/api${rawPath}`;
    const key = `${method} ${pathWithPrefix}`;
    if (seen.has(key)) continue;
    seen.add(key);
    routes.push({ method, path: pathWithPrefix });
  }

  for (const match of indexSource.matchAll(serverRegex)) {
    const method = match[1].toUpperCase();
    const rawPath = match[2];

    if (rawPath.includes("*")) continue;

    const key = `${method} ${rawPath}`;
    if (seen.has(key)) continue;
    seen.add(key);
    routes.push({ method, path: rawPath });
  }

  routes.sort((a, b) => `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`));
  return routes;
}

async function main() {
  await loadServerEnv();

  const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:3001";
  const clientOrigin = process.env.CLIENT_ORIGIN || "http://127.0.0.1:3002";
  const testEmail = process.env.TEST_USER_EMAIL || "test@pocketlytics-lite.local";
  const testPassword = process.env.TEST_USER_PASSWORD || "PocketlyticsLite!12345";

  const cookies = new Map();
  const setCookieFromResponse = response => {
    const setCookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : response.headers.get("set-cookie")
          ? [response.headers.get("set-cookie")]
          : [];

    for (const setCookie of setCookies) {
      const firstPart = setCookie.split(";")[0];
      const eq = firstPart.indexOf("=");
      if (eq <= 0) continue;
      const key = firstPart.slice(0, eq).trim();
      const value = firstPart.slice(eq + 1).trim();
      if (key) cookies.set(key, value);
    }
  };

  const cookieHeader = () => Array.from(cookies.entries()).map(([k, v]) => `${k}=${v}`).join("; ");

  const request = async (method, routePath, body) => {
    const headers = {
      Accept: "application/json, text/plain, */*",
      Origin: clientOrigin,
      Referer: `${clientOrigin}/`,
    };

    const cookie = cookieHeader();
    if (cookie) headers.Cookie = cookie;

    let payload;
    if (body !== undefined) {
      headers["content-type"] = "application/json";
      payload = JSON.stringify(body);
    }

    const response = await fetch(`${backendUrl}${routePath}`, {
      method,
      headers,
      body: payload,
      redirect: "manual",
    });

    setCookieFromResponse(response);

    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    return {
      status: response.status,
      body: text,
      json,
    };
  };

  // Health check
  const health = await request("GET", "/api/health");
  if (health.status !== 200) {
    console.error(`[endpoint-sweep] health check failed: ${health.status}`);
    process.exit(1);
  }

  // Sign in / sign up
  let signIn = await request("POST", "/api/auth/sign-in/email", { email: testEmail, password: testPassword });
  if (signIn.status !== 200) {
    const signUp = await request("POST", "/api/auth/sign-up/email", {
      name: "endpoint-sweep-user",
      email: testEmail,
      password: testPassword,
    });
    if (![200, 201, 409].includes(signUp.status)) {
      console.error(`[endpoint-sweep] sign-up failed: ${signUp.status}`);
      console.error(signUp.body.slice(0, 300));
      process.exit(1);
    }
    signIn = await request("POST", "/api/auth/sign-in/email", { email: testEmail, password: testPassword });
    if (signIn.status !== 200) {
      console.error(`[endpoint-sweep] sign-in failed: ${signIn.status}`);
      console.error(signIn.body.slice(0, 300));
      process.exit(1);
    }
  }

  // Load org + site context
  let organizations = await request("GET", "/api/user/organizations");
  if (organizations.status !== 200) {
    console.error(`[endpoint-sweep] organizations failed: ${organizations.status}`);
    console.error(organizations.body.slice(0, 300));
    process.exit(1);
  }

  let organizationId = organizations.json?.[0]?.id;
  if (!organizationId) {
    const created = await request("POST", "/api/auth/organization/create", {
      name: "Endpoint Sweep Org",
      slug: `endpoint-sweep-${Date.now()}`,
    });
    if (![200, 201].includes(created.status)) {
      console.error(`[endpoint-sweep] create organization failed: ${created.status}`);
      console.error(created.body.slice(0, 300));
      process.exit(1);
    }
    organizationId = created.json?.id;
    if (!organizationId) {
      console.error("[endpoint-sweep] create organization returned empty id");
      process.exit(1);
    }
    await request("POST", "/api/auth/organization/set-active", { organizationId });
    organizations = await request("GET", "/api/user/organizations");
  }

  let sites = await request("GET", `/api/organizations/${organizationId}/sites`);
  if (sites.status !== 200) {
    console.error(`[endpoint-sweep] list sites failed: ${sites.status}`);
    console.error(sites.body.slice(0, 300));
    process.exit(1);
  }

  let siteId = sites.json?.sites?.[0]?.siteId;
  let sitePublicId = sites.json?.sites?.[0]?.id;
  if (!siteId || !sitePublicId) {
    const createSite = await request("POST", `/api/organizations/${organizationId}/sites`, {
      name: "Endpoint Sweep Site",
      domain: `endpoint-sweep-${Date.now()}.local`,
    });
    if (![200, 201].includes(createSite.status)) {
      console.error(`[endpoint-sweep] create site failed: ${createSite.status}`);
      console.error(createSite.body.slice(0, 300));
      process.exit(1);
    }
    sites = await request("GET", `/api/organizations/${organizationId}/sites`);
    siteId = sites.json?.sites?.[0]?.siteId;
    sitePublicId = sites.json?.sites?.[0]?.id;
  }

  if (!siteId || !sitePublicId) {
    console.error("[endpoint-sweep] failed to resolve site context");
    process.exit(1);
  }

  const context = {
    backendUrl,
    clientOrigin,
    testEmail,
    organizationId,
    fakeOrganizationId: "fake-org-id",
    siteId,
    sitePublicId,
    fakeSiteId: 999999999,
  };

  const indexPath = path.join(ROOT_DIR, "server", "src", "index.ts");
  const indexSource = await readFile(indexPath, "utf8");
  const routes = extractRoutes(indexSource);

  console.log(`[endpoint-sweep] route candidates: ${routes.length}`);

  const failures = [];
  const statusBuckets = { ok2xx: 0, redirect3xx: 0, client4xx: 0, server5xx: 0 };

  for (const route of routes) {
    const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(route.method);
    const useRealIds = !isMutation;
    const resolvedPath = replacePathParams(route.path, context, useRealIds);
    const routeWithContext = { ...route, resolvedPath };
    const finalPath = withDefaultQuery(routeWithContext, context);
    const body = isMutation ? defaultBodyForRoute(route, context) : undefined;

    const res = await request(route.method, finalPath, body);

    if (res.status >= 500) {
      statusBuckets.server5xx += 1;
      failures.push({
        route: `${route.method} ${route.path}`,
        resolved: `${route.method} ${finalPath}`,
        status: res.status,
        body: res.body.slice(0, 300),
      });
      console.log(`[endpoint-sweep] FAIL ${res.status} ${route.method} ${finalPath}`);
      continue;
    }

    if (res.status >= 400) statusBuckets.client4xx += 1;
    else if (res.status >= 300) statusBuckets.redirect3xx += 1;
    else statusBuckets.ok2xx += 1;

    console.log(`[endpoint-sweep] ${res.status} ${route.method} ${finalPath}`);
  }

  console.log("");
  console.log("[endpoint-sweep] summary");
  console.log(`  routes: ${routes.length}`);
  console.log(`  2xx:    ${statusBuckets.ok2xx}`);
  console.log(`  3xx:    ${statusBuckets.redirect3xx}`);
  console.log(`  4xx:    ${statusBuckets.client4xx}`);
  console.log(`  5xx:    ${statusBuckets.server5xx}`);

  if (failures.length > 0) {
    console.log("");
    console.log("[endpoint-sweep] 5xx failures");
    for (const failure of failures) {
      console.log(`  - ${failure.status} ${failure.resolved}`);
      if (failure.body) {
        console.log(`    body: ${failure.body.replace(/\s+/g, " ").trim()}`);
      }
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error("[endpoint-sweep] unhandled error:", error);
  process.exit(1);
});

