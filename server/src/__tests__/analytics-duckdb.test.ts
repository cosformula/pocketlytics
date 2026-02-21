import { randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Fastify, { type FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

type ClickhouseClient = {
  exec: (options: { query: string; query_params?: Record<string, unknown> }) => Promise<void>;
  insert: (options: { table: string; values: Record<string, unknown>[]; format?: string }) => Promise<void>;
};

type SqliteClient = {
  execute: (query: string) => Promise<unknown>;
  close?: () => void | Promise<void>;
};

const SITE_ID = 1;

let app: FastifyInstance;
let clickhouse: ClickhouseClient;
let initializeDuckDB: () => Promise<void>;
let sqlite: SqliteClient;

const makeTimestamp = (minutesAgo: number): string => new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

const buildSeedEvents = (): Record<string, unknown>[] => [
  {
    site_id: SITE_ID,
    timestamp: makeTimestamp(110),
    session_id: "session-1",
    user_id: "anon-1",
    identified_user_id: "",
    hostname: "example.com",
    pathname: "/home",
    querystring: "",
    url_parameters: { utm_source: "newsletter" },
    page_title: "Home",
    referrer: "https://google.com/search?q=rybbit",
    channel: "organic",
    browser: "Chrome",
    browser_version: "121",
    operating_system: "macOS",
    operating_system_version: "14",
    language: "en",
    country: "US",
    region: "CA",
    city: "San Francisco",
    lat: 37.7749,
    lon: -122.4194,
    device_type: "desktop",
    type: "pageview",
  },
  {
    site_id: SITE_ID,
    timestamp: makeTimestamp(106),
    session_id: "session-1",
    user_id: "anon-1",
    identified_user_id: "",
    hostname: "example.com",
    pathname: "/pricing",
    querystring: "",
    url_parameters: { utm_source: "newsletter" },
    page_title: "Pricing",
    referrer: "https://google.com/search?q=rybbit",
    channel: "organic",
    browser: "Chrome",
    browser_version: "121",
    operating_system: "macOS",
    operating_system_version: "14",
    language: "en",
    country: "US",
    region: "CA",
    city: "San Francisco",
    lat: 37.7749,
    lon: -122.4194,
    device_type: "desktop",
    type: "pageview",
  },
  {
    site_id: SITE_ID,
    timestamp: makeTimestamp(105),
    session_id: "session-1",
    user_id: "anon-1",
    identified_user_id: "",
    hostname: "example.com",
    pathname: "/pricing",
    querystring: "",
    url_parameters: { utm_source: "newsletter" },
    page_title: "Pricing",
    referrer: "https://google.com/search?q=rybbit",
    channel: "organic",
    browser: "Chrome",
    browser_version: "121",
    operating_system: "macOS",
    operating_system_version: "14",
    language: "en",
    country: "US",
    region: "CA",
    city: "San Francisco",
    lat: 37.7749,
    lon: -122.4194,
    device_type: "desktop",
    type: "custom_event",
    event_name: "signup_click",
    props: { cta: "top_nav" },
  },
  {
    site_id: SITE_ID,
    timestamp: makeTimestamp(104),
    session_id: "session-1",
    user_id: "anon-1",
    identified_user_id: "",
    hostname: "example.com",
    pathname: "/pricing",
    querystring: "",
    url_parameters: { utm_source: "newsletter" },
    page_title: "Pricing",
    referrer: "https://google.com/search?q=rybbit",
    channel: "organic",
    browser: "Chrome",
    browser_version: "121",
    operating_system: "macOS",
    operating_system_version: "14",
    language: "en",
    country: "US",
    region: "CA",
    city: "San Francisco",
    lat: 37.7749,
    lon: -122.4194,
    device_type: "desktop",
    type: "outbound",
    event_name: "docs_link",
    props: { href: "https://docs.example.com" },
  },
  {
    site_id: SITE_ID,
    timestamp: makeTimestamp(75),
    session_id: "session-2",
    user_id: "anon-2",
    identified_user_id: "user-2",
    hostname: "example.com",
    pathname: "/home",
    querystring: "",
    url_parameters: { utm_source: "x" },
    page_title: "Home",
    referrer: "",
    channel: "direct",
    browser: "Firefox",
    browser_version: "122",
    operating_system: "Windows",
    operating_system_version: "11",
    language: "en",
    country: "CA",
    region: "ON",
    city: "Toronto",
    lat: 43.6532,
    lon: -79.3832,
    device_type: "desktop",
    type: "pageview",
  },
  {
    site_id: SITE_ID,
    timestamp: makeTimestamp(72),
    session_id: "session-2",
    user_id: "anon-2",
    identified_user_id: "user-2",
    hostname: "example.com",
    pathname: "/docs",
    querystring: "",
    url_parameters: { utm_source: "x" },
    page_title: "Docs",
    referrer: "",
    channel: "direct",
    browser: "Firefox",
    browser_version: "122",
    operating_system: "Windows",
    operating_system_version: "11",
    language: "en",
    country: "CA",
    region: "ON",
    city: "Toronto",
    lat: 43.6532,
    lon: -79.3832,
    device_type: "desktop",
    type: "pageview",
  },
  {
    site_id: SITE_ID,
    timestamp: makeTimestamp(70),
    session_id: "session-2",
    user_id: "anon-2",
    identified_user_id: "user-2",
    hostname: "example.com",
    pathname: "/docs",
    querystring: "",
    url_parameters: { utm_source: "x" },
    page_title: "Docs",
    referrer: "",
    channel: "direct",
    browser: "Firefox",
    browser_version: "122",
    operating_system: "Windows",
    operating_system_version: "11",
    language: "en",
    country: "CA",
    region: "ON",
    city: "Toronto",
    lat: 43.6532,
    lon: -79.3832,
    device_type: "desktop",
    type: "custom_event",
    event_name: "download",
    props: { file: "guide.pdf" },
  },
  {
    site_id: SITE_ID,
    timestamp: makeTimestamp(68),
    session_id: "session-2",
    user_id: "anon-2",
    identified_user_id: "user-2",
    hostname: "example.com",
    pathname: "/contact",
    querystring: "",
    url_parameters: { utm_source: "x" },
    page_title: "Contact",
    referrer: "",
    channel: "direct",
    browser: "Firefox",
    browser_version: "122",
    operating_system: "Windows",
    operating_system_version: "11",
    language: "en",
    country: "CA",
    region: "ON",
    city: "Toronto",
    lat: 43.6532,
    lon: -79.3832,
    device_type: "desktop",
    type: "pageview",
  },
  {
    site_id: SITE_ID,
    timestamp: makeTimestamp(2),
    session_id: "session-live",
    user_id: "anon-live",
    identified_user_id: "",
    hostname: "example.com",
    pathname: "/live",
    querystring: "",
    page_title: "Live",
    referrer: "",
    channel: "direct",
    browser: "Safari",
    browser_version: "17",
    operating_system: "iOS",
    operating_system_version: "17",
    language: "en",
    country: "US",
    region: "NY",
    city: "New York",
    lat: 40.7128,
    lon: -74.006,
    device_type: "mobile",
    type: "pageview",
  },
];

async function ensureSqliteSchema(client: SqliteClient) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS sites (
      site_id INTEGER PRIMARY KEY,
      id TEXT,
      name TEXT,
      domain TEXT
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      site_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      traits TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (site_id, user_id)
    )
  `);

  await client.execute(`
    INSERT OR IGNORE INTO sites (site_id, id, name, domain)
    VALUES (${SITE_ID}, 'site-${SITE_ID}', 'Test Site', 'example.com')
  `);
}

async function seedAnalyticsData() {
  await clickhouse.exec({ query: "DELETE FROM events" });
  await clickhouse.exec({ query: "DELETE FROM session_replay_metadata" });

  await clickhouse.insert({
    table: "events",
    values: buildSeedEvents(),
  });

  await clickhouse.insert({
    table: "session_replay_metadata",
    values: [
      {
        site_id: SITE_ID,
        session_id: "session-1",
        user_id: "anon-1",
        event_count: 3,
      },
    ],
  });
}

function expectObjectKeys(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    expect(payload).toHaveProperty(key);
  }
}

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.DUCKDB_PATH = ":memory:";

  const tempDir = mkdtempSync(path.join(tmpdir(), "rybbit-analytics-test-"));
  process.env.SQLITE_DB_PATH = `file:${path.join(tempDir, `${randomUUID()}.sqlite`)}`;

  const analytics = await import("../api/analytics/index.js");
  const clickhouseModule = await import("../db/clickhouse/clickhouse.js");
  const sqliteModule = await import("../db/postgres/postgres.js");

  clickhouse = clickhouseModule.clickhouse as ClickhouseClient;
  initializeDuckDB = clickhouseModule.initializeDuckDB as () => Promise<void>;
  sqlite = sqliteModule.sql as SqliteClient;

  await ensureSqliteSchema(sqlite);
  await initializeDuckDB();
  await seedAnalyticsData();

  app = Fastify({ logger: false });

  app.get("/sites/:siteId/overview", analytics.getOverview);
  app.get("/sites/:siteId/overview-bucketed", analytics.getOverviewBucketed);
  app.get("/sites/:siteId/metric", analytics.getMetric);
  app.get("/sites/:siteId/sessions", analytics.getSessions);
  app.get("/sites/:siteId/retention", analytics.getRetention);
  app.get("/sites/:siteId/events", analytics.getEvents);
  app.get("/sites/:siteId/events/count", analytics.getSiteEventCount);
  app.get("/sites/:siteId/events/bucketed", analytics.getEventBucketed);
  app.get("/sites/:siteId/page-titles", analytics.getPageTitles);
  app.get("/sites/:siteId/journeys", analytics.getJourneys);
  app.get("/sites/:siteId/live-user-count", analytics.getLiveUsercount);

  await app.ready();
}, 60_000);

afterAll(async () => {
  if (sqlite.close) {
    await sqlite.close();
  }
  await app.close();
});

describe("analytics endpoints run against DuckDB", () => {
  it("GET /sites/:id/overview", async () => {
    const response = await app.inject({ method: "GET", url: `/sites/${SITE_ID}/overview` });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { data: Record<string, unknown> };
    expectObjectKeys(body, ["data"]);
    expectObjectKeys(body.data, ["sessions", "pageviews", "users", "bounce_rate", "session_duration"]);
  });

  it("GET /sites/:id/overview-bucketed", async () => {
    const response = await app.inject({ method: "GET", url: `/sites/${SITE_ID}/overview-bucketed?bucket=hour` });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { data: Array<Record<string, unknown>> };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expectObjectKeys(body.data[0], ["time", "sessions", "pageviews", "users", "bounce_rate", "session_duration"]);
  });

  it("GET /sites/:id/metric?parameter=pathname", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/sites/${SITE_ID}/metric?parameter=pathname`,
    });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { data: { data: Array<Record<string, unknown>>; totalCount: number } };
    expectObjectKeys(body, ["data"]);
    expectObjectKeys(body.data, ["data", "totalCount"]);
    expect(Array.isArray(body.data.data)).toBe(true);
  });

  it("GET /sites/:id/metric?parameter=referrer", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/sites/${SITE_ID}/metric?parameter=referrer`,
    });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { data: { data: Array<Record<string, unknown>> } };
    expect(Array.isArray(body.data.data)).toBe(true);
  });

  it("GET /sites/:id/metric?parameter=browser", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/sites/${SITE_ID}/metric?parameter=browser`,
    });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { data: { data: Array<Record<string, unknown>> } };
    expect(Array.isArray(body.data.data)).toBe(true);
  });

  it("GET /sites/:id/metric?parameter=country", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/sites/${SITE_ID}/metric?parameter=country`,
    });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { data: { data: Array<Record<string, unknown>> } };
    expect(Array.isArray(body.data.data)).toBe(true);
  });

  it("GET /sites/:id/sessions", async () => {
    const response = await app.inject({ method: "GET", url: `/sites/${SITE_ID}/sessions?limit=20&page=1` });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { data: Array<Record<string, unknown>> };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expectObjectKeys(body.data[0], ["session_id", "pageviews", "events", "session_duration", "has_replay"]);
  });

  it("GET /sites/:id/retention", async () => {
    const response = await app.inject({ method: "GET", url: `/sites/${SITE_ID}/retention?mode=week&range=90` });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { data: Record<string, unknown> };
    expectObjectKeys(body, ["data"]);
    expectObjectKeys(body.data, ["cohorts", "maxPeriods", "mode", "range"]);
  });

  it("GET /sites/:id/events", async () => {
    const response = await app.inject({ method: "GET", url: `/sites/${SITE_ID}/events?page_size=50` });
    expect(response.statusCode).toBe(200);

    const body = response.json() as {
      data: Array<Record<string, unknown>>;
      cursor: Record<string, unknown>;
    };
    expect(Array.isArray(body.data)).toBe(true);
    expectObjectKeys(body, ["data", "cursor"]);
  });

  it("GET /sites/:id/events/count", async () => {
    const response = await app.inject({ method: "GET", url: `/sites/${SITE_ID}/events/count?bucket=day` });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { data: Array<Record<string, unknown>> };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expectObjectKeys(body.data[0], ["time", "pageview_count", "custom_event_count", "event_count"]);
  });

  it("GET /sites/:id/events/bucketed", async () => {
    const response = await app.inject({ method: "GET", url: `/sites/${SITE_ID}/events/bucketed?bucket=hour` });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { data: Array<Record<string, unknown>> };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expectObjectKeys(body.data[0], ["time", "event_name", "event_count"]);
  });

  it("GET /sites/:id/page-titles", async () => {
    const response = await app.inject({ method: "GET", url: `/sites/${SITE_ID}/page-titles?limit=10` });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { data: Array<Record<string, unknown>> };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expectObjectKeys(body.data[0], ["value", "pathname", "count", "percentage"]);
  });

  it("GET /sites/:id/journeys", async () => {
    const response = await app.inject({ method: "GET", url: `/sites/${SITE_ID}/journeys?steps=3&limit=10` });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { journeys: Array<Record<string, unknown>> };
    expectObjectKeys(body, ["journeys"]);
    expect(Array.isArray(body.journeys)).toBe(true);
  });

  it("GET /sites/:id/live-user-count", async () => {
    const response = await app.inject({ method: "GET", url: `/sites/${SITE_ID}/live-user-count?minutes=10` });
    expect(response.statusCode).toBe(200);

    const body = response.json() as { count: number };
    expectObjectKeys(body as unknown as Record<string, unknown>, ["count"]);
    expect(typeof body.count).toBe("number");
  });

  it("serializes overview without BigInt JSON errors", async () => {
    const response = await app.inject({ method: "GET", url: `/sites/${SITE_ID}/overview` });
    expect(response.statusCode).toBe(200);
    expect(() => JSON.parse(response.body)).not.toThrow();
    expect(response.body).not.toContain("Do not know how to serialize a BigInt");
  });
});
