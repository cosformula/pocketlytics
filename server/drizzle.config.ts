import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config();

export default defineConfig({
  schema: "./src/db/postgres/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.SQLITE_DB_PATH?.startsWith("file:")
      ? process.env.SQLITE_DB_PATH
      : `file:${process.env.SQLITE_DB_PATH || "./data/pocketlytics.sqlite"}`,
  },
  verbose: true,
});
