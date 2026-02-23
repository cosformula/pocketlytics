import { DuckDBConnection, DuckDBInstance } from "@duckdb/node-api";
import fs from "fs";
import path from "path";
import SqlString from "sqlstring";

type QueryParams = Record<string, unknown>;
type JsonRow = Record<string, any>;

type ClickhouseQueryOptions = {
  query: string;
  query_params?: QueryParams;
  format?: string;
};

type ClickhouseExecOptions = {
  query: string;
  query_params?: QueryParams;
};

type ClickhouseInsertOptions = {
  table: string;
  values: any[];
  format?: string;
};

const analyticsDataDir = path.resolve(process.cwd(), "data");
const configuredDuckDbPath = process.env.DUCKDB_PATH?.trim();
const analyticsDbPath =
  configuredDuckDbPath && configuredDuckDbPath.length > 0
    ? configuredDuckDbPath
    : process.env.NODE_ENV === "test"
      ? ":memory:"
      : path.join(analyticsDataDir, "rybbit-analytics.duckdb");

if (analyticsDbPath !== ":memory:") {
  fs.mkdirSync(analyticsDataDir, { recursive: true });
}

let connectionPromise: Promise<DuckDBConnection> | null = null;
let operationQueue: Promise<void> = Promise.resolve();

const getConnection = async (): Promise<DuckDBConnection> => {
  if (!connectionPromise) {
    connectionPromise = DuckDBInstance.create(analyticsDbPath)
      .then(instance => instance.connect())
      .catch(error => {
        connectionPromise = null;
        throw error;
      });
  }
  return connectionPromise;
};

// DuckDB Node API is not safe for concurrent statements on the same connection.
// Queue all DB operations to avoid "Failed to execute prepared statement" under load.
const queueDuckDbOperation = async <T>(operation: () => Promise<T>): Promise<T> => {
  const queuedOperation = operationQueue.then(operation, operation);
  operationQueue = queuedOperation.then(
    () => undefined,
    () => undefined
  );
  return queuedOperation;
};

const normalizeDuckDbValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (Array.isArray(value)) {
    return value.map(item => normalizeDuckDbValue(item));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const ctorName = (value as { constructor?: { name?: string } }).constructor?.name ?? "";

    if (Array.isArray(objectValue.items)) {
      return objectValue.items.map(item => normalizeDuckDbValue(item));
    }

    if (objectValue.entries && typeof objectValue.entries === "object") {
      return Object.fromEntries(
        Object.entries(objectValue.entries as Record<string, unknown>).map(([key, entryValue]) => [
          key,
          normalizeDuckDbValue(entryValue),
        ])
      );
    }

    if (ctorName.startsWith("DuckDB")) {
      return typeof (value as { toString?: () => string }).toString === "function" ? String(value) : null;
    }

    return Object.fromEntries(
      Object.entries(objectValue).map(([key, nestedValue]) => [key, normalizeDuckDbValue(nestedValue)])
    );
  }

  return value;
};

const mapRowsToObjects = (columnNames: string[], rows: unknown[][]): JsonRow[] =>
  rows.map(row => {
    const mappedRow: JsonRow = {};
    for (let index = 0; index < columnNames.length; index++) {
      mappedRow[columnNames[index]] = normalizeDuckDbValue(row[index]);
    }
    return mappedRow;
  });

const queryRows = async (query: string, params: unknown[] = []): Promise<JsonRow[]> => {
  const connection = await getConnection();
  const result = await connection.run(query, params as any[]);
  const rows = await result.getRows();
  const columnNames = result.columnNames();
  return mapRowsToObjects(columnNames, rows as unknown[][]);
};

const runStatement = async (query: string, params: unknown[] = []): Promise<void> => {
  const connection = await getConnection();
  await connection.run(query, params as any[]);
};

class DuckDBQueryResult<T extends JsonRow = JsonRow> {
  constructor(
    private readonly rows: T[],
    private readonly format?: string
  ) {}

  async json<T = any>(): Promise<any> {
    const payload = this.format === "JSONEachRow" ? this.rows : { data: this.rows };
    return payload;
  }
}

const toJsonPath = (arg: string): string => {
  const trimmed = arg.trim();
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    const unquoted = trimmed.slice(1, -1).replace(/''/g, "'");
    return unquoted.startsWith("$") ? unquoted : `$.${unquoted}`;
  }
  return "$";
};

const splitTopLevelArgs = (args: string): string[] => {
  if (!args.trim()) {
    return [];
  }

  const result: string[] = [];
  let current = "";
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < args.length; i++) {
    const char = args[i];

    if (inSingleQuote) {
      current += char;
      if (char === "'" && args[i + 1] === "'") {
        current += "'";
        i++;
        continue;
      }
      if (char === "'") {
        inSingleQuote = false;
      }
      continue;
    }

    if (inDoubleQuote) {
      current += char;
      if (char === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (char === "'") {
      inSingleQuote = true;
      current += char;
      continue;
    }

    if (char === '"') {
      inDoubleQuote = true;
      current += char;
      continue;
    }

    if (char === "(") {
      depth++;
      current += char;
      continue;
    }

    if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (char === "," && depth === 0) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
};

const replaceFunctionCalls = (
  sql: string,
  functionName: string,
  replacer: (args: string[]) => string
): string => {
  let output = "";
  let searchFrom = 0;
  const needle = functionName.toLowerCase();
  const lowerSql = sql.toLowerCase();

  while (searchFrom < sql.length) {
    const index = lowerSql.indexOf(needle, searchFrom);
    if (index === -1) {
      output += sql.slice(searchFrom);
      break;
    }

    const before = index > 0 ? lowerSql[index - 1] : "";
    const afterIndex = index + needle.length;
    const after = lowerSql[afterIndex];

    if ((before && /[a-z0-9_]/.test(before)) || after !== "(") {
      output += sql.slice(searchFrom, afterIndex);
      searchFrom = afterIndex;
      continue;
    }

    let cursor = afterIndex + 1;
    let depth = 1;
    let inSingleQuote = false;
    let inDoubleQuote = false;

    while (cursor < sql.length && depth > 0) {
      const char = sql[cursor];

      if (inSingleQuote) {
        if (char === "'" && sql[cursor + 1] === "'") {
          cursor += 2;
          continue;
        }
        if (char === "'") {
          inSingleQuote = false;
        }
        cursor++;
        continue;
      }

      if (inDoubleQuote) {
        if (char === '"') {
          inDoubleQuote = false;
        }
        cursor++;
        continue;
      }

      if (char === "'") {
        inSingleQuote = true;
        cursor++;
        continue;
      }

      if (char === '"') {
        inDoubleQuote = true;
        cursor++;
        continue;
      }

      if (char === "(") {
        depth++;
      } else if (char === ")") {
        depth--;
      }

      cursor++;
    }

    if (depth !== 0) {
      output += sql.slice(searchFrom);
      break;
    }

    const argsString = sql.slice(afterIndex + 1, cursor - 1);
    const args = splitTopLevelArgs(argsString);
    const replacement = replacer(args);

    output += sql.slice(searchFrom, index);
    output += replacement;
    searchFrom = cursor;
  }

  return output;
};

const previousNonWhitespaceChar = (value: string, index: number): string | null => {
  for (let i = index; i >= 0; i--) {
    if (!/\s/.test(value[i])) {
      return value[i];
    }
  }
  return null;
};

const nextNonWhitespaceChar = (value: string, index: number): string | null => {
  for (let i = index; i < value.length; i++) {
    if (!/\s/.test(value[i])) {
      return value[i];
    }
  }
  return null;
};

const normalizeSql = (input: string): string => {
  let sql = input;

  sql = sql.replace(/\bFINAL\b/gi, "");
  sql = sql.replace(/\bmonitor_events\b/gi, "uptime_monitor_events");
  sql = sql.replace(
    /\bARRAY\s+JOIN\s+JSONExtractKeysAndValuesRaw\(([\s\S]*?)\)\s+AS\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi,
    ", json_each($1) AS $2"
  );
  sql = sql.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\.1\b/g, "$1.key");
  sql = sql.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\.2\b/g, "$1.value");
  sql = sql.replace(
    /\bWITH\s+FILL\b[\s\S]*?\bSTEP\s+INTERVAL\s+[0-9A-Z_ ']+/gi,
    ""
  );
  sql = sql.replace(/quantile\s*\(\s*([0-9]*\.?[0-9]+)\s*\)\s*\(\s*([^)]+?)\s*\)/gi, "quantile_cont($2, $1)");
  sql = sql.replace(/\bargMin\b/gi, "arg_min");
  sql = sql.replace(/\bargMax\b/gi, "arg_max");
  sql = sql.replace(/\bCAST\(([\s\S]*?)\s+AS\s+String\)/gi, "CAST($1 AS VARCHAR)");
  sql = sql.replace(/replaceRegexpAll/gi, "regexp_replace");
  sql = sql.replace(/url_parameters\s*\[\s*'([^']+)'\s*\]/gi, "json_extract_string(url_parameters, '$.$1')");

  sql = replaceFunctionCalls(sql, "toStartOfMinute", args => `date_trunc('minute', ${args[0] ?? "NULL"})`);
  sql = replaceFunctionCalls(sql, "toStartOfFiveMinutes", args => `time_bucket(INTERVAL '5 minutes', ${args[0] ?? "NULL"})`);
  sql = replaceFunctionCalls(sql, "toStartOfTenMinutes", args => `time_bucket(INTERVAL '10 minutes', ${args[0] ?? "NULL"})`);
  sql = replaceFunctionCalls(sql, "toStartOfFifteenMinutes", args => `time_bucket(INTERVAL '15 minutes', ${args[0] ?? "NULL"})`);
  sql = replaceFunctionCalls(sql, "toStartOfHour", args => `date_trunc('hour', ${args[0] ?? "NULL"})`);
  sql = replaceFunctionCalls(sql, "toStartOfDay", args => `date_trunc('day', ${args[0] ?? "NULL"})`);
  sql = replaceFunctionCalls(sql, "toStartOfWeek", args => `date_trunc('week', ${args[0] ?? "NULL"})`);
  sql = replaceFunctionCalls(sql, "toStartOfMonth", args => `date_trunc('month', ${args[0] ?? "NULL"})`);
  sql = replaceFunctionCalls(sql, "toStartOfYear", args => `date_trunc('year', ${args[0] ?? "NULL"})`);
  sql = replaceFunctionCalls(sql, "toDateTime", args => `CAST(${args[0] ?? "NULL"} AS TIMESTAMP)`);
  sql = replaceFunctionCalls(sql, "toDateTime64", args => `CAST(${args[0] ?? "NULL"} AS TIMESTAMP)`);
  sql = replaceFunctionCalls(sql, "toDate", args => `CAST(${args[0] ?? "NULL"} AS DATE)`);
  sql = replaceFunctionCalls(sql, "toTimeZone", args => `${args[0] ?? "NULL"}`);
  sql = replaceFunctionCalls(sql, "addDays", args => `(${args[0] ?? "NULL"} + ((${args[1] ?? "0"}) * INTERVAL 1 DAY))`);
  sql = replaceFunctionCalls(sql, "toString", args => `CAST(${args[0] ?? "NULL"} AS VARCHAR)`);
  sql = replaceFunctionCalls(sql, "toFloat64", args => `CAST(${args[0] ?? "NULL"} AS DOUBLE)`);
  sql = replaceFunctionCalls(sql, "leadInFrame", args => `LEAD(${args.join(", ") || "NULL"})`);
  sql = replaceFunctionCalls(sql, "isNull", args => `(${args[0] ?? "NULL"} IS NULL)`);
  sql = replaceFunctionCalls(sql, "parseDateTimeBestEffort", args => `CAST(${args[0] ?? "NULL"} AS TIMESTAMP)`);
  sql = replaceFunctionCalls(sql, "dateDiff", args => `date_diff(${args.join(", ")})`);
  sql = replaceFunctionCalls(sql, "formatDateTime", args => {
    const formatArg = args[1] ? SqlString.escape(toJsonPath(args[1]).replace(/^\$\./, "").replace(/%F/g, "%Y-%m-%d")) : "'%Y-%m-%d'";
    return `strftime(${args[0] ?? "NULL"}, ${formatArg})`;
  });
  sql = replaceFunctionCalls(sql, "domainWithoutWWW", args =>
    `regexp_replace(regexp_extract(COALESCE(${args[0] ?? "''"}, ''), '^(?:https?://)?([^/]+)', 1), '^www\\\\.', '')`
  );
  sql = replaceFunctionCalls(sql, "match", args => `regexp_matches(${args[0] ?? "''"}, ${args[1] ?? "''"})`);
  sql = replaceFunctionCalls(sql, "empty", args => `(${args[0] ?? "''"} = '' OR ${args[0] ?? "''"} IS NULL)`);
  sql = replaceFunctionCalls(sql, "notEmpty", args => `(${args[0] ?? "''"} <> '' AND ${args[0] ?? "''"} IS NOT NULL)`);
  sql = replaceFunctionCalls(sql, "argMinIf", args => {
    if (args.length < 3) {
      return `arg_min(${args[0] ?? "NULL"}, ${args[1] ?? "NULL"})`;
    }
    return `arg_min(${args[0]}, ${args[1]}) FILTER (WHERE ${args[2]})`;
  });
  sql = replaceFunctionCalls(sql, "argMaxIf", args => {
    if (args.length < 3) {
      return `arg_max(${args[0] ?? "NULL"}, ${args[1] ?? "NULL"})`;
    }
    return `arg_max(${args[0]}, ${args[1]}) FILTER (WHERE ${args[2]})`;
  });
  sql = replaceFunctionCalls(sql, "uniqExact", args => `COUNT(DISTINCT ${args[0] ?? "NULL"})`);
  sql = replaceFunctionCalls(sql, "uniq", args => `COUNT(DISTINCT ${args[0] ?? "NULL"})`);
  sql = replaceFunctionCalls(sql, "any", args => `any_value(${args[0] ?? "NULL"})`);
  sql = replaceFunctionCalls(sql, "countIf", args => {
    if (args.length === 1) {
      return `COUNT_IF(${args[0]})`;
    }
    if (args.length === 2 && /^distinct\s+/i.test(args[0])) {
      const expr = args[0].replace(/^distinct\s+/i, "").trim();
      return `COUNT(DISTINCT CASE WHEN ${args[1]} THEN ${expr} END)`;
    }
    if (args.length === 2) {
      return `COUNT(CASE WHEN ${args[1]} THEN ${args[0]} END)`;
    }
    return `COUNT_IF(${args[args.length - 1] ?? "TRUE"})`;
  });
  sql = replaceFunctionCalls(sql, "sumIf", args => {
    if (args.length < 2) {
      return `SUM(${args[0] ?? "0"})`;
    }
    return `SUM(CASE WHEN ${args[1]} THEN ${args[0]} ELSE 0 END)`;
  });
  sql = replaceFunctionCalls(sql, "avgIf", args => {
    if (args.length < 2) {
      return `AVG(${args[0] ?? "NULL"})`;
    }
    return `AVG(CASE WHEN ${args[1]} THEN ${args[0]} END)`;
  });
  sql = replaceFunctionCalls(sql, "groupArray", args => `array_agg(${args[0] ?? "NULL"})`);
  sql = replaceFunctionCalls(sql, "arrayCompact", args => `array_distinct(${args[0] ?? "[]"})`);
  sql = replaceFunctionCalls(sql, "arraySlice", args => `list_slice(${args.join(", ")})`);
  sql = replaceFunctionCalls(sql, "arrayJoin", args => `unnest(${args[0] ?? "[]"})`);
  sql = replaceFunctionCalls(sql, "JSONExtractString", args => {
    if (args.length < 2) {
      return `json_extract_string(${args[0] ?? "NULL"})`;
    }
    return `json_extract_string(${args[0]}, ${SqlString.escape(toJsonPath(args[1]))})`;
  });
  sql = replaceFunctionCalls(sql, "JSONExtractInt", args => {
    if (args.length < 2) {
      return `CAST(json_extract(${args[0] ?? "NULL"}) AS INTEGER)`;
    }
    return `CAST(json_extract(${args[0]}, ${SqlString.escape(toJsonPath(args[1]))}) AS INTEGER)`;
  });
  sql = replaceFunctionCalls(sql, "JSONHas", args => {
    if (args.length < 2) {
      return "FALSE";
    }
    return `(json_extract(${args[0]}, ${SqlString.escape(toJsonPath(args[1]))}) IS NOT NULL)`;
  });

  return sql;
};

const normalizeTableName = (table: string): string => {
  if (table === "monitor_events") {
    return "uptime_monitor_events";
  }
  return table;
};

const isSafeIdentifier = (identifier: string): boolean => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);

const normalizeInsertValue = (value: unknown): unknown => {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
};

const applyClickHouseParams = (query: string, queryParams: QueryParams = {}): string => {
  const pattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^}]+)\}/g;

  return query.replace(pattern, (placeholder, name: string, rawType: string, offset: number) => {
    if (!(name in queryParams)) {
      throw new Error(`Missing query parameter: ${name}`);
    }

    const value = queryParams[name];
    const type = rawType.trim();
    const isArrayType = /^Array\s*\(/i.test(type);

    if (isArrayType) {
      const arrayValues = Array.isArray(value) ? value : [];
      const serialized = (arrayValues.length > 0 ? arrayValues : [null]).map(item => SqlString.escape(item)).join(", ");

      const left = previousNonWhitespaceChar(query, offset - 1);
      const right = nextNonWhitespaceChar(query, offset + placeholder.length);
      const surroundedByParens = left === "(" && right === ")";

      return surroundedByParens ? serialized : `(${serialized})`;
    }

    return SqlString.escape(value as any);
  });
};

export const clickhouse = {
  async query<T extends JsonRow = JsonRow>(options: ClickhouseQueryOptions) {
    return queueDuckDbOperation(async () => {
      const normalizedSql = normalizeSql(options.query);
      const sql = applyClickHouseParams(normalizedSql, options.query_params);
      const rows = (await queryRows(sql)) as T[];
      return new DuckDBQueryResult<T>(rows, options.format);
    });
  },

  async exec(options: ClickhouseExecOptions) {
    await queueDuckDbOperation(async () => {
      const normalizedSql = normalizeSql(options.query);
      const sql = applyClickHouseParams(normalizedSql, options.query_params);
      await runStatement(sql);
    });
  },

  async command(options: ClickhouseExecOptions) {
    await queueDuckDbOperation(async () => {
      const normalizedSql = normalizeSql(options.query);
      const sql = applyClickHouseParams(normalizedSql, options.query_params);
      await runStatement(sql);
    });
  },

  async insert(options: ClickhouseInsertOptions) {
    await queueDuckDbOperation(async () => {
      const tableName = normalizeTableName(options.table);
      if (!isSafeIdentifier(tableName)) {
        throw new Error(`Unsafe table name: ${tableName}`);
      }

      if (!options.values.length) {
        return;
      }

      const allColumns = Array.from(
        new Set(options.values.flatMap(row => Object.keys(row)).filter(column => isSafeIdentifier(column)))
      );

      if (!allColumns.length) {
        return;
      }

      const columnSql = allColumns.map(column => `"${column}"`).join(", ");
      const placeholderSql = allColumns.map(() => "?").join(", ");
      const insertSql = `INSERT INTO ${tableName} (${columnSql}) VALUES (${placeholderSql})`;

      if (tableName === "session_replay_metadata") {
        for (const row of options.values) {
          const siteId = row.site_id;
          const sessionId = row.session_id;
          if (siteId !== undefined && sessionId !== undefined) {
            await runStatement("DELETE FROM session_replay_metadata WHERE site_id = ? AND session_id = ?", [
              siteId,
              sessionId,
            ]);
          }

          const values = allColumns.map(column => normalizeInsertValue(row[column]));
          await runStatement(insertSql, values);
        }
        return;
      }

      await runStatement("BEGIN TRANSACTION");
      try {
        for (const row of options.values) {
          const values = allColumns.map(column => normalizeInsertValue(row[column]));
          await runStatement(insertSql, values);
        }
        await runStatement("COMMIT");
      } catch (error) {
        await runStatement("ROLLBACK");
        throw error;
      }
    });
  },
};

export const initializeDuckDB = async () => {
  await queueDuckDbOperation(async () => {
    await runStatement(`
    CREATE TABLE IF NOT EXISTS events (
      site_id INTEGER,
      timestamp TIMESTAMP,
      session_id VARCHAR,
      user_id VARCHAR,
      anonymous_id VARCHAR,
      hostname VARCHAR,
      pathname VARCHAR,
      querystring VARCHAR,
      url_parameters JSON,
      page_title VARCHAR,
      referrer VARCHAR,
      channel VARCHAR,
      browser VARCHAR,
      browser_version VARCHAR,
      operating_system VARCHAR,
      operating_system_version VARCHAR,
      language VARCHAR,
      country VARCHAR,
      region VARCHAR,
      city VARCHAR,
      lat DOUBLE,
      lon DOUBLE,
      screen_width INTEGER,
      screen_height INTEGER,
      device_type VARCHAR,
      type VARCHAR DEFAULT 'pageview',
      event_name VARCHAR,
      props JSON,
      lcp DOUBLE,
      cls DOUBLE,
      inp DOUBLE,
      fcp DOUBLE,
      ttfb DOUBLE,
      ip VARCHAR,
      timezone VARCHAR DEFAULT '',
      identified_user_id VARCHAR DEFAULT '',
      import_id VARCHAR,
      company VARCHAR DEFAULT '',
      company_domain VARCHAR DEFAULT '',
      company_type VARCHAR DEFAULT '',
      company_abuse_score DOUBLE,
      asn INTEGER,
      asn_org VARCHAR DEFAULT '',
      asn_domain VARCHAR DEFAULT '',
      asn_type VARCHAR DEFAULT '',
      asn_abuse_score DOUBLE,
      vpn VARCHAR DEFAULT '',
      crawler VARCHAR DEFAULT '',
      datacenter VARCHAR DEFAULT '',
      is_proxy BOOLEAN,
      is_tor BOOLEAN,
      is_satellite BOOLEAN
    )
  `);

    await runStatement(`
    CREATE TABLE IF NOT EXISTS session_replay_events (
      site_id INTEGER,
      session_id VARCHAR,
      user_id VARCHAR,
      identified_user_id VARCHAR DEFAULT '',
      timestamp TIMESTAMP,
      event_type VARCHAR,
      event_data VARCHAR,
      event_data_key VARCHAR,
      batch_index INTEGER,
      sequence_number INTEGER,
      event_size_bytes INTEGER,
      viewport_width INTEGER,
      viewport_height INTEGER,
      is_complete INTEGER DEFAULT 0
    )
  `);

    await runStatement(`
    CREATE TABLE IF NOT EXISTS session_replay_metadata (
      site_id INTEGER,
      session_id VARCHAR,
      user_id VARCHAR,
      identified_user_id VARCHAR DEFAULT '',
      start_time TIMESTAMP,
      end_time TIMESTAMP,
      duration_ms INTEGER,
      event_count INTEGER,
      compressed_size_bytes INTEGER,
      page_url VARCHAR,
      country VARCHAR,
      region VARCHAR,
      city VARCHAR,
      lat DOUBLE,
      lon DOUBLE,
      browser VARCHAR,
      browser_version VARCHAR,
      operating_system VARCHAR,
      operating_system_version VARCHAR,
      language VARCHAR,
      screen_width INTEGER,
      screen_height INTEGER,
      device_type VARCHAR,
      channel VARCHAR,
      hostname VARCHAR,
      referrer VARCHAR,
      has_replay_data INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT current_timestamp
    )
  `);

    await runStatement(`
    CREATE TABLE IF NOT EXISTS uptime_monitor_events (
      monitor_id INTEGER,
      organization_id VARCHAR,
      timestamp TIMESTAMP,
      monitor_type VARCHAR,
      monitor_url VARCHAR,
      monitor_name VARCHAR,
      region VARCHAR DEFAULT 'local',
      status VARCHAR,
      status_code INTEGER,
      response_time_ms INTEGER,
      dns_time_ms INTEGER,
      tcp_time_ms INTEGER,
      tls_time_ms INTEGER,
      ttfb_ms INTEGER,
      transfer_time_ms INTEGER,
      validation_errors JSON,
      response_headers JSON,
      response_size_bytes INTEGER,
      port INTEGER,
      error_message VARCHAR,
      error_type VARCHAR
    )
  `);

    await runStatement(`
    CREATE VIEW IF NOT EXISTS hourly_events_by_site_mv_target AS
    SELECT
      date_trunc('hour', timestamp) AS event_hour,
      site_id,
      COUNT(*) AS event_count
    FROM events
    GROUP BY 1, 2
  `);
  });
};

export const initializeClickhouse = initializeDuckDB;
