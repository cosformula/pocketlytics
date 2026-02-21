import { randomBytes, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

const boolean = (name?: string) =>
  name ? integer(name, { mode: "boolean" }) : integer({ mode: "boolean" });
const jsonb = <T = unknown>(name?: string) =>
  (name ? text(name, { mode: "json" }) : text({ mode: "json" })).$type<T>();
const nowIso = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

// User table (BetterAuth)
export const user = sqliteTable(
  "user",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    username: text(),
    email: text().notNull(),
    emailVerified: boolean().notNull(),
    image: text(),
    createdAt: text().notNull(),
    updatedAt: text().notNull(),
    role: text().default("user").notNull(),
    displayUsername: text(),
    banned: boolean(),
    banReason: text(),
    banExpires: text(),
    // deprecated
    stripeCustomerId: text(),
    // deprecated
    overMonthlyLimit: boolean().default(false),
    // deprecated
    monthlyEventCount: integer().default(0),
    sendAutoEmailReports: boolean().default(true),
    scheduledTipEmailIds: jsonb("scheduled_tip_email_ids").$type<string[]>().default([]),
  },
  table => [unique("user_username_unique").on(table.username), unique("user_email_unique").on(table.email)]
);

// Verification table (BetterAuth)
export const verification = sqliteTable("verification", {
  id: text().primaryKey().notNull(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: text().notNull(),
  createdAt: text(),
  updatedAt: text(),
});

// Sites table
export const sites = sqliteTable("sites", {
  id: text("id").$defaultFn(() => randomBytes(6).toString("hex")),
  // deprecated - keeping as primary key for backwards compatibility
  siteId: integer("site_id").primaryKey({ autoIncrement: true }).notNull(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  createdAt: text("created_at").default(nowIso),
  updatedAt: text("updated_at").default(nowIso),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  organizationId: text("organization_id").references(() => organization.id),
  public: boolean().default(false),
  saltUserIds: boolean().default(false),
  blockBots: boolean().default(true).notNull(),
  excludedIPs: jsonb("excluded_ips").default([]), // Array of IP addresses/ranges to exclude
  excludedCountries: jsonb("excluded_countries").default([]), // Array of ISO country codes to exclude (e.g., ["US", "GB"])
  sessionReplay: boolean().default(false),
  webVitals: boolean().default(false),
  trackErrors: boolean().default(false),
  trackOutbound: boolean().default(true),
  trackUrlParams: boolean().default(true),
  trackInitialPageView: boolean().default(true),
  trackSpaNavigation: boolean().default(true),
  trackIp: boolean().default(false),
  trackButtonClicks: boolean().default(false),
  trackCopy: boolean().default(false),
  trackFormInteractions: boolean().default(false),
  apiKey: text("api_key"), // Format: rb_{64_hex_chars} = 67 chars total
  privateLinkKey: text("private_link_key"),
  tags: jsonb("tags").default([]).$type<string[]>(),
});

// Active sessions table
export const activeSessions = sqliteTable("active_sessions", {
  sessionId: text("session_id").primaryKey().notNull(),
  siteId: integer("site_id"),
  userId: text("user_id"),
  startTime: text("start_time").default(nowIso),
  lastActivity: text("last_activity").default(nowIso),
});

export const funnels = sqliteTable("funnels", {
  reportId: integer("report_id").primaryKey({ autoIncrement: true }).notNull(),
  siteId: integer("site_id").references(() => sites.siteId, { onDelete: "cascade" }),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  data: jsonb(),
  createdAt: text("created_at").default(nowIso),
  updatedAt: text("updated_at").default(nowIso),
});

// Account table (BetterAuth)
export const account = sqliteTable("account", {
  id: text().primaryKey().notNull(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: text(),
  refreshTokenExpiresAt: text(),
  scope: text(),
  password: text(),
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
});

// Organization table (BetterAuth)
export const organization = sqliteTable(
  "organization",
  {
    id: text().primaryKey().notNull(),
    name: text().notNull(),
    slug: text().notNull(),
    logo: text(),
    createdAt: text().notNull(),
    metadata: text(),
    stripeCustomerId: text(),
    monthlyEventCount: integer().default(0),
    overMonthlyLimit: boolean().default(false),
    planOverride: text(), // Plan name override (e.g., "pro1m", "standard500k")
  },
  table => [unique("organization_slug_unique").on(table.slug)]
);

// Member table (BetterAuth)
export const member = sqliteTable("member", {
  id: text().primaryKey().notNull(),
  organizationId: text()
    .notNull()
    .references(() => organization.id),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  role: text().notNull(),
  createdAt: text().notNull(),
  // Site access restriction: false = all sites (default), true = only sites in member_site_access
  hasRestrictedSiteAccess: boolean("has_restricted_site_access").default(false).notNull(),
});

// Invitation table (BetterAuth)
export const invitation = sqliteTable("invitation", {
  id: text().primaryKey().notNull(),
  email: text().notNull(),
  inviterId: text().references(() => user.id, { onDelete: "set null" }),
  organizationId: text()
    .notNull()
    .references(() => organization.id),
  role: text().notNull(),
  status: text().notNull(),
  expiresAt: text().notNull(),
  // Site access restriction for the invited member
  hasRestrictedSiteAccess: boolean("has_restricted_site_access").default(false).notNull(),
  siteIds: jsonb("site_ids").default([]).$type<number[]>(), // Array of site IDs to grant access to
});

// Member site access junction table - stores which sites a member has access to
// Only used when member.hasRestrictedSiteAccess = true
export const memberSiteAccess = sqliteTable(
  "member_site_access",
  {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    memberId: text("member_id")
      .notNull()
      .references(() => member.id, { onDelete: "cascade" }),
    siteId: integer("site_id")
      .notNull()
      .references(() => sites.siteId, { onDelete: "cascade" }),
    createdAt: text("created_at").default(nowIso).notNull(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [
    unique("member_site_access_unique").on(table.memberId, table.siteId),
    index("member_site_access_member_idx").on(table.memberId),
    index("member_site_access_site_idx").on(table.siteId),
  ]
);

// Session table (BetterAuth)
export const session = sqliteTable(
  "session",
  {
    id: text().primaryKey().notNull(),
    expiresAt: text().notNull(),
    token: text().notNull(),
    createdAt: text().notNull(),
    updatedAt: text().notNull(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    impersonatedBy: text(),
    activeOrganizationId: text(),
  },
  table => [unique("session_token_unique").on(table.token)]
);

// API Key table (BetterAuth)
export const apiKey = sqliteTable("apikey", {
  id: text().primaryKey().notNull(),
  name: text(),
  start: text(),
  prefix: text(),
  key: text().notNull(),
  userId: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  refillInterval: integer(),
  refillAmount: integer(),
  lastRefillAt: text(),
  enabled: boolean().notNull().default(true),
  rateLimitEnabled: boolean().notNull().default(false),
  rateLimitTimeWindow: integer(),
  rateLimitMax: integer(),
  requestCount: integer().notNull().default(0),
  remaining: integer(),
  lastRequest: text(),
  expiresAt: text(),
  createdAt: text().notNull(),
  updatedAt: text().notNull(),
  permissions: text(),
  metadata: jsonb(),
});

// Goals table for tracking conversion goals
export const goals = sqliteTable(
  "goals",
  {
    goalId: integer("goal_id").primaryKey({ autoIncrement: true }).notNull(),
    siteId: integer("site_id").notNull(),
    name: text("name"), // Optional, user-defined name for the goal
    goalType: text("goal_type").notNull(), // 'path' or 'event'
    // Configuration specific to the goal type
    config: jsonb("config").notNull().$type<{
      // For 'path' type
      pathPattern?: string; // e.g., "/pricing", "/product/*/view", "/docs/**"
      // For 'event' type
      eventName?: string; // e.g., "signup_completed", "file_downloaded"
      // Property filters (for both path and event types)
      eventPropertyKey?: string; // Deprecated - use propertyFilters instead
      eventPropertyValue?: string | number | boolean; // Deprecated - use propertyFilters instead
      propertyFilters?: Array<{
        key: string;
        value: string | number | boolean;
      }>; // Array of property filters to match (all must match)
    }>(),
    createdAt: text("created_at").default(nowIso),
  },
  table => [
    foreignKey({
      columns: [table.siteId],
      foreignColumns: [sites.siteId],
      name: "goals_site_id_sites_site_id_fk",
    }).onDelete("cascade"),
  ]
);

// Telemetry table for tracking self-hosted instances
export const telemetry = sqliteTable("telemetry", {
  id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
  instanceId: text("instance_id").notNull(),
  timestamp: text("timestamp").notNull().default(nowIso),
  version: text("version").notNull(),
  tableCounts: jsonb("table_counts").notNull().$type<Record<string, number>>(),
  clickhouseSizeGb: real("clickhouse_size_gb").notNull(),
});

// Uptime monitor definitions
export const uptimeMonitors = sqliteTable("uptime_monitors", {
  id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id),
  name: text("name"),
  monitorType: text("monitor_type").notNull(), // 'http', 'tcp'

  // Common settings
  intervalSeconds: integer("interval_seconds").notNull(),
  enabled: boolean("enabled").default(true),

  // HTTP/HTTPS specific configuration
  httpConfig: jsonb("http_config").$type<{
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "OPTIONS" | "PATCH";
    headers?: Record<string, string>;
    body?: string;
    auth?: {
      type: "none" | "basic" | "bearer" | "api_key" | "custom_header";
      credentials?: {
        username?: string;
        password?: string;
        token?: string;
        headerName?: string;
        headerValue?: string;
      };
    };
    followRedirects?: boolean;
    timeoutMs?: number;
    ipVersion?: "any" | "ipv4" | "ipv6";
    userAgent?: string;
  }>(),

  // TCP specific configuration
  tcpConfig: jsonb("tcp_config").$type<{
    host: string;
    port: number;
    timeoutMs?: number;
  }>(),

  // Validation rules
  validationRules: jsonb("validation_rules").notNull().default([]).$type<
    Array<
      | {
          type: "status_code";
          operator: "equals" | "not_equals" | "in" | "not_in";
          value: number | number[];
        }
      | {
          type: "response_time";
          operator: "less_than" | "greater_than";
          value: number;
        }
      | {
          type: "response_body_contains" | "response_body_not_contains";
          value: string;
          caseSensitive?: boolean;
        }
      | {
          type: "header_exists";
          header: string;
        }
      | {
          type: "header_value";
          header: string;
          operator: "equals" | "contains";
          value: string;
        }
      | {
          type: "response_size";
          operator: "less_than" | "greater_than";
          value: number;
        }
    >
  >(),

  // Multi-region configuration
  monitoringType: text("monitoring_type").default("local"), // 'local' or 'global'
  selectedRegions: jsonb("selected_regions").default(["local"]).$type<string[]>(),

  // Metadata
  createdAt: text("created_at").default(nowIso),
  updatedAt: text("updated_at").default(nowIso),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
});

// Monitor status tracking
export const uptimeMonitorStatus = sqliteTable(
  "uptime_monitor_status",
  {
    monitorId: integer("monitor_id")
      .primaryKey()
      .notNull()
      .references(() => uptimeMonitors.id, { onDelete: "cascade" }),
    lastCheckedAt: text("last_checked_at"),
    nextCheckAt: text("next_check_at"),
    currentStatus: text("current_status").default("unknown"), // 'up', 'down', 'unknown'
    consecutiveFailures: integer("consecutive_failures").default(0),
    consecutiveSuccesses: integer("consecutive_successes").default(0),
    uptimePercentage24h: real("uptime_percentage_24h"),
    uptimePercentage7d: real("uptime_percentage_7d"),
    uptimePercentage30d: real("uptime_percentage_30d"),
    averageResponseTime24h: real("average_response_time_24h"),
    updatedAt: text("updated_at").default(nowIso),
  },
  table => [
    foreignKey({
      columns: [table.monitorId],
      foreignColumns: [uptimeMonitors.id],
      name: "uptime_monitor_status_monitor_id_uptime_monitors_id_fk",
    }),
    check("uptime_monitor_status_current_status_check", sql`current_status IN ('up', 'down', 'unknown')`),
    check("uptime_monitor_status_uptime_24h_check", sql`uptime_percentage_24h >= 0 AND uptime_percentage_24h <= 100`),
    check("uptime_monitor_status_uptime_7d_check", sql`uptime_percentage_7d >= 0 AND uptime_percentage_7d <= 100`),
    check("uptime_monitor_status_uptime_30d_check", sql`uptime_percentage_30d >= 0 AND uptime_percentage_30d <= 100`),
    index("uptime_monitor_status_updated_at_idx").on(table.updatedAt),
  ]
);

// Alert configuration (scaffolding)
export const uptimeAlerts = sqliteTable(
  "uptime_alerts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => uptimeMonitors.id, { onDelete: "cascade" }),
    alertType: text("alert_type").notNull(), // 'email', 'webhook', 'slack', etc.
    alertConfig: jsonb("alert_config").notNull(), // Type-specific configuration
    conditions: jsonb("conditions").notNull().$type<{
      consecutiveFailures?: number;
      responseTimeThresholdMs?: number;
      uptimePercentageThreshold?: number;
    }>(),
    enabled: boolean("enabled").default(true),
    createdAt: text("created_at").default(nowIso),
  },
  table => [
    foreignKey({
      columns: [table.monitorId],
      foreignColumns: [uptimeMonitors.id],
      name: "uptime_alerts_monitor_id_uptime_monitors_id_fk",
    }),
  ]
);

// Alert history (scaffolding)
export const uptimeAlertHistory = sqliteTable(
  "uptime_alert_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    alertId: integer("alert_id")
      .notNull()
      .references(() => uptimeAlerts.id, { onDelete: "cascade" }),
    monitorId: integer("monitor_id")
      .notNull()
      .references(() => uptimeMonitors.id, { onDelete: "cascade" }),
    triggeredAt: text("triggered_at").default(nowIso),
    resolvedAt: text("resolved_at"),
    alertData: jsonb("alert_data"), // Context about what triggered the alert
  },
  table => [
    foreignKey({
      columns: [table.alertId],
      foreignColumns: [uptimeAlerts.id],
      name: "uptime_alert_history_alert_id_uptime_alerts_id_fk",
    }),
    foreignKey({
      columns: [table.monitorId],
      foreignColumns: [uptimeMonitors.id],
      name: "uptime_alert_history_monitor_id_uptime_monitors_id_fk",
    }),
  ]
);

// Agent regions for VPS-based monitoring
export const agentRegions = sqliteTable("agent_regions", {
  code: text("code").primaryKey().notNull(), // Region code (e.g., 'us-east', 'europe')
  name: text("name").notNull(), // Region display name
  endpointUrl: text("endpoint_url").notNull(), // Agent endpoint URL
  enabled: boolean("enabled").default(true),
  lastHealthCheck: text("last_health_check"),
  isHealthy: boolean("is_healthy").default(true),
});

// Uptime incidents table
export const uptimeIncidents = sqliteTable("uptime_incidents", {
  id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id),
  monitorId: integer("monitor_id")
    .notNull()
    .references(() => uptimeMonitors.id, { onDelete: "cascade" }),
  region: text("region"), // Region where incident occurred

  // Incident timing
  startTime: text("start_time").notNull(),
  endTime: text("end_time"), // null if ongoing

  // Status
  status: text("status").notNull().default("active"), // 'active', 'acknowledged', 'resolved'

  // Acknowledgement details
  acknowledgedBy: text("acknowledged_by").references(() => user.id, { onDelete: "set null" }),
  acknowledgedAt: text("acknowledged_at"),

  // Resolution details
  resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
  resolvedAt: text("resolved_at"),

  // Error details
  lastError: text("last_error"),
  lastErrorType: text("last_error_type"),
  failureCount: integer("failure_count").default(1),
  createdAt: text("created_at").default(nowIso),
  updatedAt: text("updated_at").default(nowIso),
});

// Notification channels table
export const notificationChannels = sqliteTable("notification_channels", {
  id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
  organizationId: text("organization_id")
    .notNull()
    .references(() => organization.id),
  type: text("type").notNull(), // 'email', 'discord', 'slack', 'sms'
  name: text("name").notNull(),
  enabled: boolean("enabled").default(true),

  // Channel-specific configuration
  config: jsonb("config").notNull().$type<{
    // Email config
    email?: string;

    // Discord config
    webhookUrl?: string;

    // Slack config
    slackWebhookUrl?: string;
    slackChannel?: string;

    // SMS config (placeholder)
    phoneNumber?: string;
    provider?: string;
  }>(),

  // Monitor selection and notification settings
  monitorIds: jsonb("monitor_ids").$type<number[] | null>(), // null = all monitors
  triggerEvents: jsonb("trigger_events").notNull().default(["down", "recovery"]).$type<string[]>(), // 'down', 'recovery', 'degraded'
  cooldownMinutes: integer("cooldown_minutes").default(5), // Minimum time between notifications
  lastNotifiedAt: text("last_notified_at"),

  createdAt: text("created_at").default(nowIso),
  updatedAt: text("updated_at").default(nowIso),
  createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
});

// Google Search Console connections table
export const gscConnections = sqliteTable("gsc_connections", {
  siteId: integer("site_id")
    .primaryKey()
    .notNull()
    .references(() => sites.siteId, { onDelete: "cascade" }),

  // OAuth tokens
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: text("expires_at").notNull(),

  // Which GSC property this connection is for
  gscPropertyUrl: text("gsc_property_url").notNull(),

  createdAt: text("created_at").default(nowIso).notNull(),
  updatedAt: text("updated_at").default(nowIso).notNull(),
});

// User profiles - stores identified user traits (email, name, custom fields)
export const userProfiles = sqliteTable(
  "user_profiles",
  {
    siteId: integer("site_id")
      .notNull()
      .references(() => sites.siteId, { onDelete: "cascade" }),
    userId: text("user_id").notNull(), // The identified user ID from identify() call
    traits: jsonb("traits").$type<Record<string, unknown>>().default({}),
    createdAt: text("created_at").default(nowIso).notNull(),
    updatedAt: text("updated_at").default(nowIso).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.siteId, table.userId] }),
    index("user_profiles_site_idx").on(table.siteId),
  ]
);

// User aliases - maps anonymous IDs to identified users (multi-device support)
export const userAliases = sqliteTable(
  "user_aliases",
  {
    id: integer("id").primaryKey({ autoIncrement: true }).notNull(),
    siteId: integer("site_id")
      .notNull()
      .references(() => sites.siteId, { onDelete: "cascade" }),
    anonymousId: text("anonymous_id").notNull(), // Hash of IP+UserAgent (device fingerprint)
    userId: text("user_id").notNull(), // The identified user ID
    createdAt: text("created_at").default(nowIso).notNull(),
  },
  (table) => [
    unique("user_aliases_site_anon_unique").on(table.siteId, table.anonymousId),
    index("user_aliases_user_idx").on(table.siteId, table.userId),
    index("user_aliases_anon_idx").on(table.siteId, table.anonymousId),
  ]
);

export const importPlatforms = ["umami", "simple_analytics"] as const;

export const importStatus = sqliteTable(
  "import_status",
  {
    importId: text("import_id").primaryKey().notNull().$defaultFn(() => randomUUID()),
    siteId: integer("site_id").notNull(),
    organizationId: text("organization_id").notNull(),
    platform: text("platform", { enum: importPlatforms }).notNull(),
    importedEvents: integer("imported_events").notNull().default(0),
    skippedEvents: integer("skipped_events").notNull().default(0),
    invalidEvents: integer("invalid_events").notNull().default(0),
    startedAt: text("started_at").notNull().default(nowIso),
    completedAt: text("completed_at"),
  },
  table => [
    foreignKey({
      columns: [table.siteId],
      foreignColumns: [sites.siteId],
      name: "import_status_site_id_sites_site_id_fk",
    }),
    foreignKey({
      columns: [table.organizationId],
      foreignColumns: [organization.id],
      name: "import_status_organization_id_organization_id_fk",
    }),
  ]
);
