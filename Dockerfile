# syntax=docker/dockerfile:1

# Shared package build
FROM node:20-slim AS shared-builder
WORKDIR /app/shared
COPY shared/package*.json ./
RUN npm ci
COPY shared/ .
RUN npm run build

# Backend build
FROM node:20-slim AS backend-builder
WORKDIR /app
COPY --from=shared-builder /app/shared ./shared
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ .
RUN npm run build

# Client build
FROM node:20-slim AS client-builder
WORKDIR /app
COPY --from=shared-builder /app/shared ./shared
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --legacy-peer-deps
COPY client/ .

ARG NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:3001
ARG NEXT_PUBLIC_DISABLE_SIGNUP=false
ARG NEXT_PUBLIC_CLOUD=false
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=
ARG NEXT_PUBLIC_MAPBOX_TOKEN=

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV NEXT_PUBLIC_DISABLE_SIGNUP=${NEXT_PUBLIC_DISABLE_SIGNUP}
ENV NEXT_PUBLIC_CLOUD=${NEXT_PUBLIC_CLOUD}
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}
ENV NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN}

RUN npm run build

# Backend runtime target
FROM node:20-slim AS backend
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    postgresql-client \
    fonts-freefont-ttf \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY --from=backend-builder /app/server/package*.json ./
COPY --from=backend-builder /app/server/GeoLite2-City.mmdb ./GeoLite2-City.mmdb
COPY --from=backend-builder /app/server/dist ./dist
COPY --from=backend-builder /app/server/node_modules ./node_modules
COPY --from=backend-builder /app/server/public ./public
COPY --from=backend-builder /app/server/src ./src
COPY --from=backend-builder /app/server/drizzle.config.ts ./drizzle.config.ts
COPY --from=shared-builder /app/shared /app/shared

RUN mkdir -p /app/data

ENV SQLITE_DB_PATH=file:/app/data/pocketlytics.sqlite
ENV DUCKDB_PATH=/app/data/pocketlytics-analytics.duckdb
ENV PORT=3001
ENV DISABLE_TELEMETRY=true

EXPOSE 3001

CMD sh -c "npx drizzle-kit push 2>/dev/null || true; node dist/index.js"

# Client runtime target
FROM node:20-slim AS client
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=client-builder /app/client/public ./public
COPY --from=client-builder /app/client/.next/standalone ./
COPY --from=client-builder /app/client/.next/static ./.next/static

EXPOSE 3002

ENV PORT=3002
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]

# Default all-in-one runtime (backend + client in one container)
FROM node:20-slim AS all-in-one
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    postgresql-client \
    fonts-freefont-ttf \
    bash \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Backend payload
COPY --from=backend-builder /app/server/package*.json /app/backend/
COPY --from=backend-builder /app/server/GeoLite2-City.mmdb /app/backend/GeoLite2-City.mmdb
COPY --from=backend-builder /app/server/dist /app/backend/dist
COPY --from=backend-builder /app/server/node_modules /app/backend/node_modules
COPY --from=backend-builder /app/server/public /app/backend/public
COPY --from=backend-builder /app/server/src /app/backend/src
COPY --from=backend-builder /app/server/drizzle.config.ts /app/backend/drizzle.config.ts
COPY --from=shared-builder /app/shared /app/shared

# Client payload (Next standalone output)
COPY --from=client-builder /app/client/public /app/client/public
COPY --from=client-builder /app/client/.next/standalone /app/client
COPY --from=client-builder /app/client/.next/static /app/client/.next/static

COPY scripts/docker-start-all.sh /app/docker-start-all.sh
RUN chmod +x /app/docker-start-all.sh && mkdir -p /app/data

ENV SQLITE_DB_PATH=file:/app/data/pocketlytics.sqlite
ENV DUCKDB_PATH=/app/data/pocketlytics-analytics.duckdb
ENV PORT=3001
ENV CLIENT_PORT=3002
ENV HOSTNAME=0.0.0.0
ENV NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:3001
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3001 3002

CMD ["/app/docker-start-all.sh"]
