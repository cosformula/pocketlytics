# Deploy rybbit-lite on Coolify

This repo includes a Coolify-ready compose file at `docker-compose.coolify.yml`.

## 1. Create the application

1. In Coolify, create a new **Docker Compose** application from this repository.
2. Branch: `lite-main` (or your target branch).
3. Compose file path: `docker-compose.coolify.yml`.

## 2. Set environment variables

Copy values from `.env.coolify.example` and set them in Coolify:

- `BASE_URL`: full public URL, e.g. `https://analytics.example.com`
- `RYBBIT_HOST`: hostname only, e.g. `analytics.example.com`
- `BETTER_AUTH_SECRET`: long random secret string
- `DISABLE_SIGNUP`: `false` or `true`
- `DISABLE_TELEMETRY`: recommended `true`
- `SQLITE_DB_PATH`: keep default unless you know why to change
- `DUCKDB_PATH`: keep default unless you know why to change
- `MAPBOX_TOKEN`: optional

## 3. Deploy

1. Trigger deploy in Coolify.
2. Wait until both services are healthy.
3. Open `BASE_URL` and complete sign-in.

## Notes

- This setup uses embedded `SQLite + DuckDB` and a persistent Docker volume (`rybbit-data`).
- Traefik routing in compose sends:
  - `/api` and `/auth` to backend
  - all other paths to client
