# syntax=docker/dockerfile:1
# rybbit-lite: SQLite + DuckDB, single-process

FROM node:20-slim AS builder

WORKDIR /app

# Build shared package
COPY shared ./shared
WORKDIR /app/shared
RUN npm install && npm run build

# Install server dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci

# Copy server source and build
COPY server/ .
RUN npm run build

# Runtime image
FROM node:20-slim

WORKDIR /app

# Chromium for Puppeteer PDF generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy built application
COPY --from=builder /app/server/package*.json ./
COPY --from=builder /app/server/GeoLite2-City.mmdb ./GeoLite2-City.mmdb
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/public ./public
COPY --from=builder /app/server/src ./src
COPY --from=builder /app/server/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/shared /app/shared

# Data directory for SQLite + DuckDB
RUN mkdir -p /app/data

ENV SQLITE_DB_PATH=file:/app/data/rybbit.sqlite
ENV DUCKDB_PATH=/app/data/rybbit-analytics.duckdb
ENV PORT=3001
ENV DISABLE_TELEMETRY=true

EXPOSE 3001

# Run drizzle push (idempotent) to create/migrate SQLite tables, then start
CMD sh -c "npx drizzle-kit push 2>/dev/null || true; node dist/index.js"
