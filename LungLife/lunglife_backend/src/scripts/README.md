# Scripts Overview

## Current Scripts
- `test_registration_http.ts`: HTTP test for user registration endpoint
- `complete_auth_test.ts`: Comprehensive test for health, registration, and login flow

## Usage
```bash
# Test registration endpoint specifically
npm run test:registration

# Test complete authentication flow
npm run test:auth
```

## Removed Scripts
According to cleanup (from conversation):
- `db_verify_structure.ts`: Database schema verification (removed as part of cleanup)
- `verify_clean_architecture.ts`: Architecture verification (removed as part of cleanup)  
- `smoke_auth_test.ts`: Superseded by `complete_auth_test.ts`
- `test_connection.ts`: Database connectivity test (removed)
- `test_user_creation.ts`: Database user creation test (removed)
- `test_registration.ts`: Redundant with `test_registration_http.ts`
- `test_simple_connection.ts`: Superseded by other tests
- `seed_user.ts`: No longer relevant to current architecture
- `init_db.ts` & `init_db.sql`: Database initialization (removed during cleanup)

## Notes
- Tests expect backend running on localhost:3002
- Database connectivity tests removed since they're not essential for minimal Clean Architecture
- Focus is on API-level testing without database dependency
