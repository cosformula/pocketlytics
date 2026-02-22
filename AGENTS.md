# AGENTS.md

## 项目定位
- 项目：`rybbit-lite`（基于 `rybbit` 的 fork）。
- 目标：用 `SQLite + DuckDB` 替代 `Postgres + ClickHouse`，实现简易单机部署和最小资源占用。
- 现状：迁移已完成核心路径，但还没完全收尾，仓库中仍有不少历史命名与旧部署配置。

## 先看这几个关键事实
1. 文件名是历史命名，但实现已替换：
- `server/src/db/postgres/postgres.ts` 实际是 `libsql(SQLite)` 连接。
- `server/src/db/postgres/schema.ts` 使用 `drizzle-orm/sqlite-core`。
- `server/src/db/clickhouse/clickhouse.ts` 实际封装的是 `DuckDB`。

2. 启动入口已走 lite 数据层：
- `server/src/index.ts` 启动时执行 `initializeDuckDB()` 与 `initPostgres()`（后者实际上初始化 SQLite 数据）。

3. 部署入口以 lite 为默认：
- 根目录 `Dockerfile` 已是 lite 单进程路径（内置 `SQLITE_DB_PATH`、`DUCKDB_PATH`）。
- `docker-compose.yml` 已移除 `postgres` 服务并持久化 `/app/data`。
- `.env.example` 和 `setup.sh` 已改为 `SQLite + DuckDB` 默认参数。
- docs 仍有大量 `postgres/clickhouse` 旧表述待清理。

## 当前完成度（2026-02-22）
### 已完成
- DuckDB 适配层：在 `server/src/db/clickhouse/clickhouse.ts` 提供 ClickHouse 风格 API（`query/exec/insert/command`）并做 SQL 兼容转换。
- SQLite 适配层：`server/src/db/postgres/postgres.ts` + `server/src/db/postgres/schema.ts` 已落地。
- 服务启动初始化：DuckDB 表结构与 SQLite 初始化已经接入主启动流程。
- 回归测试：`server/src/__tests__/analytics-duckdb.test.ts` 覆盖一批核心 analytics 接口。
- 单容器镜像：根目录 `Dockerfile` 支持 SQLite/DuckDB 单机运行。
- 默认部署入口：`docker-compose.yml`、`.env.example`、`setup.sh` 已切换到 lite 路线。

### 未完成（重点）
- docs 自托管与故障排查内容大量引用 `postgres/clickhouse`。
- 代码与字段命名仍有历史残留（例如 `clickhouseSizeGb` 等）。
- `server/Dockerfile` 与根 `Dockerfile` 仍存在双入口，需要后续统一策略并清理冗余。

## 迭代优先级（建议）
1. P0：把默认部署路径切到 lite
- 完成，后续仅做回归与稳定性修正。

2. P1：清理文档与运维说明
- 更新 `README.md` 与 `docs/content/docs/self-hosting-guides/*`、`troubleshooting.mdx`、`managing-your-installation.mdx`。

3. P2：命名去历史包袱（谨慎）
- 优先改文案和注释；目录重命名（`postgres`/`clickhouse`）放在单独 PR，避免大面积冲突。

## 开发约束
- 不要新增真实 `Postgres` 或 `ClickHouse` 运行依赖。
- 新增 analytics SQL 时，必须保证 DuckDB 可执行；若用了 ClickHouse 语法，需要在 `server/src/db/clickhouse/clickhouse.ts` 补转换并加测试。
- 数据模型变更统一改 `server/src/db/postgres/schema.ts`（SQLite dialect）。
- 任何部署入口改动都要同步更新对应文档与示例环境变量。
- 非明确需求下，不要顺手重命名全项目历史路径（会放大风险）。

## 本地开发与最小验证
### Server
```bash
cd server
npm install
npm run db:push
npm run build
npm run test:run -- src/__tests__/analytics-duckdb.test.ts
```

### 环境变量（lite 关键）
```bash
SQLITE_DB_PATH=file:./data/rybbit.sqlite
DUCKDB_PATH=./data/rybbit-analytics.duckdb
```

## 每次改动的完成标准
- 变更说明包含：改了什么、为什么、影响路径、兼容性影响。
- 至少完成一条可执行验证（构建/测试/接口 smoke 之一）。
- 若改部署或文档入口，保证新用户按文档能走通 lite 路径。
