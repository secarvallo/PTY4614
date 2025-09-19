## LungLife – AI coding agent guide

This repo is a full‑stack project with an Ionic/Angular frontend and a Node.js/TypeScript/Express backend, plus SQL scripts. Use these notes to be productive fast and follow existing patterns.

### Big picture architecture
- Frontend: Ionic 8 + Angular 20, standalone components (no NgModules). App config in `src/app/app.config.ts` wires Ionic, router preloading, and an HTTP Auth interceptor.
- Auth domain (frontend) is a modular package under `src/app/auth` with Facade + Strategy + Observer patterns:
  - Facade: `auth/core/services/auth-facade.service.ts` is the single entry point used by pages.
  - Strategies: `auth/core/services/strategies/*-strategy.service.ts` implement login/register/2FA/forgot flows.
  - State/side effects: `auth/core/services/core/auth-observer.service` (observables), `token.service.ts` (JWT storage/refresh), `core/interceptors/auth.interceptor.ts` (adds Bearer, handles 401/403).
  - Guards: `auth/core/guards` exposes `AuthGuard`, `GuestGuard`, `TwoFAGuard` via barrel `index.ts`.
- Routing: `src/app/app.routes.ts` lazily loads auth pages under `/auth/*` and protects app routes with guards.
- Backend: `lunglife_backend/src/index.ts` runs Express, mounts `/api/auth/*` from `src/routes/auth.routes.ts` backed by controllers (`src/controllers/*.ts`). DB is PostgreSQL via `pg` (`src/config/lunglife_db.ts`). Health at `/api/health`, test at `/api/test`.
- Data flow: Frontend uses `environment.apiUrl` (`src/environments/*`) as base; strategies call `${apiUrl}/auth/...`. Interceptor attaches JWT from `TokenService` except for public auth endpoints. Backend returns tokens or 2FA challenge; DB stores users and security metadata (see `lunglife_bd/enhanced_auth_schema.sql`).

### Dev workflows (Windows, PowerShell)
- Frontend (Angular dev server): from `lunglife_app`
  - Install once: npm ci
  - Run: npm start (ng serve) → http://localhost:4200 (CORS allows 4200 and 8100)
  - Build: npm run build (outputs to `www/` per `angular.json`)
  - Test/Lint: npm test (Karma), npm run lint (ESLint)
- Backend (Express + nodemon): from `lunglife_backend`
  - Configure `.env` (DB_*, JWT_*, PORT). Defaults exist; PORT is typically 3002
  - Install once: npm ci
  - Dev: npm run dev (nodemon src/index.ts)
  - Prod: npm run start:prod (tsc → node dist/index.js)
- Database: apply schemas in `lunglife_bd/*`. Note casing differences: code default DB_NAME is `LungLife_db`, `.env` uses `lunglife_db`—keep them consistent.

### Project conventions and patterns
- Angular is fully standalone: add new pages/components with standalone flag; wire them in `app.routes.ts`.
- Barrel exports: the auth module exposes public APIs via `src/app/auth/index.ts` and sub‑barrels; prefer importing from those.
- HTTP usage: Use `HttpClient` with `${environment.apiUrl}`; do not hardcode URLs. Interceptor already attaches tokens and handles 401 refresh attempt via `TokenService.refreshToken()`.
- Auth flow responses: Backend `AuthController.login` may return either tokens or `{ requiresTwoFA: true, sessionId }`. Strategies handle both. Keep this shape in any new endpoints.
- CORS/ports: Backend permits origins 8100 and 4200. Frontend default dev is 4200; Ionic CLI can run at 8100 too. Update backend CORS if you introduce new origins.

### Integration points and gotchas
- Token refresh: Frontend expects POST `${apiUrl}/auth/refresh` in `TokenService`. Backend currently has no `/refresh` route; either implement it under `src/routes/auth.routes.ts` + controller, or disable/avoid refresh usage.
- Environment management: `angular.json` swaps `src/environments/environment.ts` with `.prod.ts` on production builds. Update only those files when changing API URLs or feature flags.
- Guards naming: both `auth-guard.ts` and `auth.guard.ts` exist; imports use the barrel `auth/core/guards`. Prefer that to avoid path confusion.
- Capacitor: `capacitor.config.ts` sets `webDir: 'www'` for mobile builds; web builds emit there as well.

### Concrete examples
- Call a backend endpoint in a strategy (pattern): see `auth/core/services/strategies/login-strategy.service.ts` using `this.http.post<AuthResult>(
  \\`${environment.apiUrl}/auth/login\\`
)` and delegating state changes to `AuthObserverService`.
- Add a new auth action: create `auth/core/services/strategies/<feature>-strategy.service.ts`, expose via barrel, and have `AuthFacadeService` call it; backend should add the route in `src/routes/auth.routes.ts` and a matching controller method.
- Add an API client outside auth: add a service under `src/app/shared/` using `HttpClient`; interceptor will add Authorization automatically.

If any section feels incomplete (e.g., exact refresh flow, 2FA endpoints), tell me which part you’re extending and I’ll refine this guide with the missing specifics.
