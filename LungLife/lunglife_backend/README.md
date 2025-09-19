# LungLife Backend (Clean Architecture)

This backend has been simplified and aligned to the Clean Architecture used by lunglife_app.

What remains:
- src/core: interfaces, services (authentication), infrastructure (PostgreSQL connection, repositories, unit-of-work), factories (DatabaseServiceFactory)
- src/controllers/auth.controller.v2.ts: v2 controller using the factory/repository/UoW
- src/routes/auth.routes.ts: minimal routes for login and register
- src/index.ts: Express app using the clean factory for health and startup checks

Removed as obsolete:
- Legacy direct PG pool config (src/config/lunglife_db.ts)
- Legacy controllers (auth.controller.ts, twofa.controller.ts, password.controller.ts)
- Legacy services (jwt, email, rate-limit, security, audit) and duplicate repository
- Test and script folders excluded from compilation (tsconfig.json) to keep prod build clean

How to run:
1. npm ci
2. npm run dev (development with nodemon) or npm run start:prod (build then run)

Environment (defaults exist via core/config/config.ts):
- DB_* (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)
- JWT_* (JWT_SECRET, JWT_REFRESH_SECRET, etc.)

Endpoints:
- POST /api/auth/login
- POST /api/auth/register
- GET  /api/health
- GET  /api/test

Notes:
- Token refresh/logout/2FA/password recovery were removed for now to keep a minimal surface. Re-add later following the patterns in core/ and v2 controller style.
