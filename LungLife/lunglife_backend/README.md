# LungLife Backend (Clean Architecture)

This backend has been cleaned and aligned to Clean Architecture principles, removing all obsolete and unnecessary files.

## Current Structure
- **src/core**: Clean Architecture components
  - `config/`: Application configuration
  - `interfaces/`: Domain interfaces
  - `services/`: Application services (authentication, logger)
  - `infrastructure/`: Infrastructure layer (PostgreSQL connection, repositories, unit-of-work)
  - `factories/`: Service factories (DatabaseServiceFactory)
- **src/controllers**: `auth.controller.v2.ts` (Clean Architecture controller)
- **src/routes**: `auth.routes.ts` (API routes)
- **src/scripts**: Test and utility scripts
- **src/index.ts**: Express application entry point

## Removed (Legacy/Obsolete)
- Legacy controllers: `auth.controller.ts`, `password.controller.ts`, `twofa.controller.ts`
- Legacy services: `auth.service.ts`, `jwt.service.ts`, `email.service.ts`, `rate-limit.service.ts`, `security.service.ts`, `audit.service.ts`
- Legacy repository: `src/repositories/user.repository.ts`
- Legacy config: `src/config/lunglife_db.ts`, `src/config/emailConfig.ts`
- Legacy DI system: `src/core/bootstrap.ts`, `src/core/di/`
- Build artifacts: No longer using `dist/` - runs directly from `src/`

## How to Run
```bash
# Install dependencies
npm ci

# Development (auto-reload)
npm run dev

# Production
npm run start

# Type checking
npm run typecheck

# Test authentication flow
npm run test:auth
```

## Environment Configuration
Uses environment variables with defaults via `src/core/config/config.ts`:
- **Database**: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- **JWT**: `JWT_SECRET`, `JWT_REFRESH_SECRET`, etc.

## API Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration  
- `POST /api/auth/refresh` - Token refresh
- `GET /api/health` - Health check
- `GET /api/test` - System information

## Port Configuration
- **Default**: 3002 (matches frontend expectation)
- **Auto-bump**: If 3002 is in use, automatically tries 3003, 3004, etc.
- **Override**: Set `PORT` environment variable

## Frontend Integration
- Frontend expects API at: `http://localhost:3002/api`
- Backend now runs on port 3002 by default
- Compatible with lunglife_app authentication strategies

## Architecture Notes
- **Clean Architecture**: Follows SOLID principles and dependency inversion
- **No Build Step**: Runs directly from TypeScript source using `ts-node`
- **Database Agnostic**: Uses repository pattern with PostgreSQL implementation
- **Testable**: Dependency injection via factories enables easy testing
