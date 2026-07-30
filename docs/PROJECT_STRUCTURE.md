# FastLead Backend - Project Structure

## Directory Tree

```
FastLead/
├── src/
│   ├── config/
│   │   ├── config.ts              # Central configuration from environment variables
│   │   └── logger.ts              # Winston logger setup for production & development
│   │
│   ├── middleware/
│   │   ├── auth.ts                # JWT verification and role-based authorization
│   │   ├── validation.ts          # Zod request validation middleware
│   │   ├── logging.ts             # Request logging middleware
│   │   ├── errorHandler.ts        # Global error handler with custom error classes
│   │   └── index.ts               # Middleware exports
│   │
│   ├── routes/
│   │   ├── health.ts              # Health check endpoint
│   │   ├── auth.ts                # Authentication: register, login, refresh, logout
│   │   ├── driver.ts              # Driver endpoints: profile, earnings
│   │   ├── advertiser.ts          # Advertiser endpoints: campaigns, analytics
│   │   └── admin.ts               # Admin endpoints: users, campaigns management
│   │
│   ├── services/
│   │   └── authService.ts         # Authentication business logic (ready for DB integration)
│   │
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces and enums
│   │
│   ├── utils/
│   │   ├── jwt.ts                 # JWT token generation and verification
│   │   ├── password.ts            # Password hashing with bcryptjs
│   │   ├── validators.ts          # Zod schemas for request validation
│   │   └── errors.ts              # Custom error classes (AppError, ValidationError, etc.)
│   │
│   ├── app.ts                     # Express app setup with middleware and routes
│   └── server.ts                  # Server entry point with graceful shutdown
│
├── dist/                           # Compiled JavaScript (gitignored)
├── node_modules/                   # Dependencies (gitignored)
│
├── .env                            # Local environment variables (gitignored)
├── .env.example                    # Environment variables template
├── .gitignore                      # Git ignore rules
│
├── tsconfig.json                   # TypeScript configuration
├── .eslintrc.json                  # ESLint configuration
├── .prettierrc.json                # Prettier configuration
├── .prettierignore                 # Prettier ignore rules
├── nodemon.json                    # Nodemon configuration for development
│
├── package.json                    # NPM dependencies and scripts
├── package-lock.json               # Lock file (gitignored)
│
├── README.md                       # Full documentation
├── API_ROUTES.md                   # Detailed API endpoints documentation
├── QUICKSTART.md                   # Quick start guide
└── PROJECT_STRUCTURE.md            # This file
```

## File Descriptions

### Configuration (`src/config/`)
- **config.ts** - Loads environment variables and exports centralized configuration object
- **logger.ts** - Sets up Winston logger with console transport and file logging in production

### Middleware (`src/middleware/`)
- **auth.ts** - Verifies JWT tokens and enforces role-based access control
- **validation.ts** - Validates request body using Zod schemas
- **logging.ts** - Logs incoming requests and response status codes
- **errorHandler.ts** - Catches errors and returns formatted error responses
- **index.ts** - Re-exports all middleware for cleaner imports

### Routes (`src/routes/`)
- **health.ts** - Public endpoint for health checks (no authentication)
- **auth.ts** - User registration, login, token refresh, logout
- **driver.ts** - Driver-specific endpoints (protected, requires driver role)
- **advertiser.ts** - Advertiser-specific endpoints (protected, requires advertiser role)
- **admin.ts** - Admin-specific endpoints (protected, requires admin role)

### Services (`src/services/`)
- **authService.ts** - Authentication logic: register, login, token refresh, logout
  - Currently uses in-memory storage (Map) for quick prototyping
  - Ready to be integrated with Prisma + PostgreSQL

### Types (`src/types/`)
- **index.ts** - TypeScript interfaces and enums
  - UserType enum (driver, advertiser, admin)
  - AuthPayload, AuthResponse interfaces
  - Error response types
  - Pagination types

### Utilities (`src/utils/`)
- **jwt.ts** - JWT token generation and verification using jsonwebtoken
- **password.ts** - Password hashing and comparison using bcryptjs
- **validators.ts** - Zod schemas for request validation
- **errors.ts** - Custom error classes:
  - AppError (base class)
  - ValidationError (400)
  - AuthenticationError (401)
  - AuthorizationError (403)
  - NotFoundError (404)
  - ConflictError (409)

### Application (`src/`)
- **app.ts** - Express app configuration:
  - Body parser middleware
  - CORS setup
  - Request logging
  - Route mounting
  - 404 and error handlers
- **server.ts** - HTTP server setup:
  - Starts listening on configured PORT
  - Handles SIGTERM and SIGINT gracefully
  - Catches unhandled exceptions

## Technology Stack

### Runtime & Language
- **Node.js** 20+
- **TypeScript** 6.0.3
- **JavaScript Target** ES2020

### Web Framework
- **Express.js** 5.2.1
- **CORS** 2.8.6

### Authentication & Security
- **JWT (jsonwebtoken)** 9.0.3
- **bcryptjs** 3.0.3

### Data Validation
- **Zod** 4.4.3

### Logging
- **Winston** 3.19.0

### Development Tools
- **ts-node** 10.9.2
- **nodemon** 3.1.14
- **ESLint** 10.6.0
- **Prettier** 3.9.5
- **@typescript-eslint** 8.63.0

### Type Definitions
- @types/express
- @types/node
- @types/jsonwebtoken
- @types/bcryptjs
- @types/cors

## Build Process

```
TypeScript (src/*.ts)
    ↓
tsc compiler (tsconfig.json)
    ↓
JavaScript (dist/*.js)
    ↓
Node.js runtime (npm start)
```

## Development Workflow

1. **Write TypeScript** in `src/` directory
2. **Run dev server**: `npm run dev` (with hot reload via nodemon)
3. **Check linting**: `npm run lint`
4. **Format code**: `npm run format`
5. **Build for production**: `npm run build`
6. **Run production**: `npm start`

## Environment Variables

See `.env.example` for all available configuration options:
- Server: `NODE_ENV`, `PORT`, `API_URL`
- JWT: `JWT_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN`
- Database: `DATABASE_URL`
- CORS: `CORS_ORIGIN`
- Logging: `LOG_LEVEL`

## Testing the API

All endpoints are documented in `API_ROUTES.md`. Quick examples:

```bash
# Health check
curl http://localhost:3000/health

# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","type":"driver"}'

# Protected request (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/driver/profile
```

## Database Integration (Future)

The project is ready for database integration:

1. Install Prisma: `npm install @prisma/client && npm install -D prisma`
2. Set DATABASE_URL in .env
3. Create Prisma schema
4. Generate client: `npx prisma generate`
5. Replace authService.ts in-memory storage with Prisma queries

## Deployment

For production deployment:
1. Build: `npm run build`
2. Set environment variables
3. Run: `npm start` or use PM2/Docker
4. Monitor logs from `logs/` directory

---

**Last Updated**: 2024-01-15
**Project Version**: 0.1.0
**Status**: Backend Foundation Complete ✓
