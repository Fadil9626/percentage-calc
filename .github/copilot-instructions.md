# Percentage Calculator - Development Guidelines

## Project Overview
A complete Role-Based Access Control (RBAC) system for profit-sharing distribution calculations. Stack: React + Node.js/Express + PostgreSQL with JWT authentication.

## Key Architecture
- **Backend**: Express.js REST API with JWT middleware and role-based authorization
- **Frontend**: React with Auth Context for state management and Protected Routes
- **Database**: PostgreSQL with ENUM types for roles and transaction types
- **Security**: Bcrypt password hashing, JWT tokens (24h expiration), row-level filtering

## Role Definitions
- **ADMIN**: Full access to users, configuration, ledger closing, distribution calculations
- **PARTNER**: Read-only access to own distributions and historical records
- **DATA_ENTRY**: Write access to transactions only, no access to distributions or configuration

## Code Organization
```
backend/src/
  middleware/auth.js      - JWT verify & role check
  controllers/            - Business logic (auth, ledger)
  routes/                 - API endpoint definitions
  config/database.js      - PostgreSQL connection

frontend/src/
  context/AuthContext.jsx - Global auth state
  components/ProtectedRoute.jsx - Route protection
  pages/                  - Login, Dashboard, etc.
  services/api.js         - Axios with token injection
```

## Development Workflow
1. Database changes: Update `backend/database/init.sql`, recreate container
2. Backend routes: Add to `backend/src/routes/`, require auth middleware
3. Frontend pages: Import useAuth, wrap routes with ProtectedRoute
4. UI elements: Hide with `{hasRole('ADMIN') && <Component />}`

## Security Rules (Non-Negotiable)
- Always verify JWT in middleware before handling request
- Check role with `requireRole()` for sensitive operations
- Row-level filtering: Partners can only access their own data
- Passwords hashed with Bcrypt (never store plaintext)
- Token expiration enforced (24 hours)
- CORS configured for localhost development only

## Common Tasks

### Add New Admin-Only Endpoint
1. Create controller method in `ledgerController.js`
2. Add route in `ledgerRoutes.js` with `requireRole(['ADMIN'])`
3. Import and wrap route in `index.js`
4. Test with admin credentials in Postman/Thunder Client

### Add New UI Page with Role Gating
1. Create new page in `frontend/src/pages/`
2. Import useAuth hook
3. Add conditional rendering: `{hasRole('ROLE_NAME') && <Content />}`
4. Add route in App.jsx wrapped with ProtectedRoute
5. Add navigation link in DashboardPage

### Test Different Roles
- **Admin**: admin@percentagecalc.com / admin123
- **Partner**: partner1@example.com / admin123
- **Data Entry**: dataentry@example.com / admin123

## Common Pitfalls to Avoid
- ❌ Forgetting to attach role check middleware to protected endpoints
- ❌ Hiding UI without backend validation (frontend-only security is fake)
- ❌ Storing tokens in global state without localStorage persistence
- ❌ Allowing multiple requests with expired tokens
- ❌ Hard-coding secrets or credentials in code
- ❌ Skipping JWT verification in any protected route

## Debugging Tips
- Backend errors? Check: `docker-compose logs postgres`, backend console
- Frontend can't login? Check: Network tab in DevTools, backend port 5000 running
- Token expired? Check: Auth middleware checks 24h expiry, clear localStorage
- Database schema issues? Recreate: `docker-compose down && docker-compose up -d`

## Performance Notes
- Queries use indexes on email, role, ledger_id
- Trigger updates `updated_at` timestamp automatically
- Distribution calculation uses single transaction (atomic)
- Token verification happens in milliseconds (JWT stateless)

## Deployment Checklist
- [ ] Change JWT_SECRET to random strong value
- [ ] Update CORS_ORIGIN to production domain
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS for all API calls
- [ ] Set up database backups
- [ ] Configure monitoring and error tracking
- [ ] Test with production database size
- [ ] Security audit completed
