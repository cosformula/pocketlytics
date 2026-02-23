import dotenv from "dotenv";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema.js";

dotenv.config();

const sqliteUrl = process.env.SQLITE_DB_PATH?.startsWith("file:")
  ? process.env.SQLITE_DB_PATH
  : `file:${process.env.SQLITE_DB_PATH || "./data/pocketlytics.sqlite"}`;
const sqlitePath = resolve(sqliteUrl.replace(/^file:/, ""));
mkdirSync(dirname(sqlitePath), { recursive: true });

const client = createClient({ url: sqliteUrl });
await client.execute("PRAGMA journal_mode = WAL");
await client.execute("PRAGMA foreign_keys = ON");

// Create drizzle ORM instance
export const db = drizzle(client, { schema });

// For compatibility with raw SQL if needed
export const sql = client;
