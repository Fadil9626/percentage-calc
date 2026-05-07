# Percentage Calculator - RBAC System

A complete Role-Based Access Control (RBAC) system for profit-sharing distribution calculations with JWT authentication, built with React, Node.js/Express, and PostgreSQL.

## Features

- **JWT Authentication**: Secure token-based authentication with 24-hour expiration
- **Role-Based Access Control (RBAC)**:
  - **ADMIN**: Full read/write access, user management, ledger closing, distribution configuration
  - **PARTNER**: Read-only access to their distributions and historical closed ledgers
  - **DATA_ENTRY**: Restricted write access to add transactions, no access to distributions
- **Waterfall Distribution Logic**: 
  - Priority partners receive full profit percentage
  - Non-priority partners share remaining profit proportionally
- **Ledger Management**: 
  - Open ledger for current month transactions
  - Close ledger to finalize and calculate distributions
  - Track historical distributions
- **Responsive UI**: Modern, user-friendly dashboard with role-based navigation
- **Secure Database**: PostgreSQL with encrypted passwords and audit trails

## Architecture

```
Percentage-Calculator/
├── backend/
│   ├── database/
│   │   └── init.sql           # Database schema with RBAC
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT authentication & role verification
│   │   ├── controllers/
│   │   │   ├── authController.js     # User login & management
│   │   │   └── ledgerController.js   # Ledger & transaction logic
│   │   ├── routes/
│   │   │   ├── authRoutes.js         # Auth endpoints
│   │   │   └── ledgerRoutes.js       # Ledger endpoints
│   │   ├── config/
│   │   │   └── database.js    # PostgreSQL connection pool
│   │   └── index.js           # Express server setup
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.jsx       # Global auth state management
│   │   ├── components/
│   │   │   └── ProtectedRoute.jsx    # Route protection wrapper
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   └── DashboardPage.jsx
│   │   ├── services/
│   │   │   └── api.js                # Axios API client
│   │   ├── App.jsx
│   │   ├── index.js
│   │   └── index.css
│   ├── public/
│   │   └── index.html
│   ├── .env
│   └── package.json
├── docker-compose.yml         # PostgreSQL container setup
└── README.md
```

## Prerequisites

- Docker & Docker Compose (for PostgreSQL)
- Node.js 16+
- npm

## Installation

### 1. Start PostgreSQL with Docker

```bash
docker-compose up -d
```

This will:
- Start a PostgreSQL 15 container
- Initialize the database with schema and sample data
- Expose the database on `localhost:5432`

Verify the database is running:
```bash
docker-compose ps
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
```

## Running the Application

### Start Backend (Terminal 1)

```bash
cd backend
npm run dev
```

The backend will run on `http://localhost:5000`

### Start Frontend (Terminal 2)

```bash
cd frontend
npm start
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication (Public)
- `POST /api/auth/login` - Login with email and password
- `GET /api/auth/me` - Get current user profile (protected)

### User Management (Admin Only)
- `GET /api/auth/users` - List all users
- `POST /api/auth/users` - Create new user
- `PUT /api/auth/users/:id` - Update user (percentages, role, status)

### Ledger Management
- `GET /api/ledgers/current` - Get current month's ledger (all authenticated users)
- `POST /api/ledgers/current/transactions` - Add transaction (DATA_ENTRY & ADMIN)
- `GET /api/ledgers/:ledger_id/transactions` - View transactions (all authenticated users)
- `POST /api/ledgers/:id/close` - Close ledger & calculate distributions (ADMIN ONLY)
- `GET /api/ledgers/distributions/:user_id` - View distributions (role-based filtering)

## Demo Credentials

Use these credentials to test different roles:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@percentagecalc.com | admin123 |
| Partner | partner1@example.com | admin123 |
| Data Entry | dataentry@example.com | admin123 |

## Database Schema

### Users Table
- Roles: ADMIN, PARTNER, DATA_ENTRY
- Includes: email, password_hash, share_percentage, is_priority flag
- Authentication: Bcrypt hashed passwords

### Ledgers Table
- Tracks monthly income, expenses, and net profit
- Status: OPEN or CLOSED
- Stores closing user and timestamp for audit

### Transactions Table
- Records individual income/expense items
- Type: INCOME or EXPENSE
- Tracks creator for audit purposes

### Distributions Table
- Records partner profit shares from closed months
- Stores calculation method (priority vs. proportional)
- Immutable historical records

## Security Features

### Backend
1. **JWT Authentication**: All protected endpoints require valid token
2. **Role-Based Authorization**: Middleware checks user role before allowing operations
3. **Password Hashing**: Bcrypt with salt rounds for secure storage
4. **Token Expiration**: Tokens expire after 24 hours
5. **Database Isolation**: Row-level filtering (partners can only see their own data)
6. **Audit Trails**: Created_by and created_at tracked for all transactions

### Frontend
1. **Protected Routes**: Components wrapped with ProtectedRoute checker
2. **Token Storage**: JWT stored in localStorage
3. **Conditional Rendering**: UI elements hidden based on user role
4. **Auto-Redirect**: Unauthorized users redirected to login
5. **Request Interceptor**: Automatically handles 401 responses

## How RBAC Works

### Authentication Flow
1. User submits email/password on login page
2. Backend verifies credentials against bcrypt hash
3. If valid, JWT token generated and returned
4. Frontend stores token in localStorage
5. Token automatically attached to all subsequent requests

### Authorization Flow
1. Protected route checks if user is authenticated
2. If not, redirects to login
3. If authenticated, checks allowedRoles parameter
4. Backend middleware `requireRole()` validates on each request
5. 403 Forbidden returned if user lacks required role

### Profit Distribution Logic (Waterfall)
1. **First Pass**: Priority partners receive full percentage of net profit
2. **Second Pass**: Non-priority partners share remaining profit proportionally
3. Example:
   - Net Profit: $10,000
   - Priority Partner A (40%): $4,000
   - Remaining: $6,000
   - Non-Priority Partner B (30%), C (20%):
     - Partner B: $3,600 (60% of remaining)
     - Partner C: $2,400 (40% of remaining)

## Environment Variables

### Backend (.env)
```
PORT=5000
DB_HOST=postgres
DB_PORT=5432
DB_USER=rbac_user
DB_PASSWORD=rbac_password
DB_NAME=percentage_calc
JWT_SECRET=your-secret-key-change-in-production
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Testing

### Test Admin Functions
1. Login as admin@percentagecalc.com
2. Go to "Manage Users" to add/edit partners
3. Go to "Partner Configuration" to set percentages
4. Go to "View Transactions" to see data
5. Go to "Close & Distribute" to finalize month

### Test Data Entry
1. Login as dataentry@example.com
2. Go to "Add Transactions"
3. Add income/expense items
4. Note: Cannot see partner percentages or close ledger

### Test Partner View
1. Login as partner1@example.com
2. Can only see "View Distributions"
3. Cannot see transactions or configuration

## Troubleshooting

### Database Connection Failed
```bash
# Check if PostgreSQL container is running
docker-compose ps

# View container logs
docker-compose logs postgres
```

### Backend Won't Start
```bash
# Install dependencies
cd backend && npm install

# Check Node.js version
node --version  # Should be 16+
```

### Frontend Won't Start
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# Check if port 3000 is available
# Try different port: npm start -- --port 3001
```

### Cannot Login
1. Verify database initialized: `docker-compose ps`
2. Check backend is running on port 5000
3. Verify credentials match demo table above
4. Check browser console for errors

## Production Deployment

### Security Checklist
- [ ] Change JWT_SECRET to strong random value
- [ ] Use environment variables (never hardcode secrets)
- [ ] Enable HTTPS for all API calls
- [ ] Use managed PostgreSQL (AWS RDS, Azure DB, etc.)
- [ ] Implement rate limiting on login endpoint
- [ ] Add logging and monitoring
- [ ] Regular security audits
- [ ] Database backups configured
- [ ] CORS properly configured for production domain

### Deployment Steps
1. Set production environment variables
2. Build frontend: `npm run build`
3. Deploy backend to server (AWS, Heroku, DigitalOcean, etc.)
4. Deploy frontend to CDN (Netlify, Vercel, AWS S3, etc.)
5. Configure database connection strings
6. Set up SSL certificates
7. Configure monitoring and alerting

## License

ISC

## Support

For issues or questions, please refer to the project documentation or create an issue in the repository.
