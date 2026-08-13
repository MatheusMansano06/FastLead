# FastLEAD Project Structure - Complete Overview

**Date:** 2026-08-13 | **Version:** v1.0 (Post-PHASE-1) | **Status:** Ready for Phase 2 (Testing)

---

## 1. Directory Structure

```
/Users/Matheus/Desktop/FastLead/
│
├── 📦 Backend (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── routes/           (11 Express route files)
│   │   ├── services/         (11 business logic services)
│   │   ├── middleware/       (5 Express middleware)
│   │   ├── config/           (Logger, JWT, Mercado Pago)
│   │   ├── utils/            (Validators, JWT, Password, Segmentation)
│   │   ├── lib/              (Prisma Client initialization)
│   │   ├── types/            (TypeScript type definitions)
│   │   ├── app.ts            (Express app initialization)
│   │   └── server.ts         (Entry point - starts server on port 3000)
│   │
│   ├── prisma/
│   │   ├── schema.prisma     (32 Prisma models definition)
│   │   ├── migrations/       (5 versioned migrations)
│   │   └── seed*.ts          (5 seed scripts + seedRealistic.ts)
│   │
│   ├── dist/                 (Compiled JavaScript output)
│   ├── node_modules/
│   ├── package.json          (Backend + root dependencies)
│   ├── package-lock.json
│   ├── tsconfig.json         (TypeScript compiler config)
│   ├── nodemon.json          (Dev auto-reload config)
│   ├── .eslintrc.js          (ESLint rules)
│   └── .prettierrc.json      (Code formatter)
│
├── 🎨 Frontend (React + Vite + TypeScript)
│   ├── src/
│   │   ├── components/       (Reusable React components)
│   │   ├── pages/            (Page-level components)
│   │   ├── hooks/            (Custom React hooks)
│   │   ├── services/         (API client - fetch calls to backend)
│   │   ├── stores/           (State management)
│   │   ├── styles/           (CSS Modules)
│   │   ├── types/            (TypeScript interfaces)
│   │   ├── App.tsx           (Root component)
│   │   └── main.tsx          (React entry point)
│   │
│   ├── public/               (Static assets)
│   ├── dist/                 (Built production bundle)
│   ├── node_modules/
│   ├── package.json          (Frontend dependencies)
│   ├── package-lock.json
│   ├── vite.config.ts        (Vite bundler config)
│   ├── tsconfig.json         (TypeScript config)
│   ├── .oxlintrc.json        (Linter rules)
│   └── railway.json          (Railway deployment config)
│
├── 📚 Documentation (NEW - PHASE 1)
│   ├── docs/
│   │   ├── DATABASE.md       (1000+ lines: 32 models, schema design, rules)
│   │   ├── DATA_FLOW.md      (1200+ lines: 5 business flows, examples)
│   │   └── api/              (Postman collection)
│   │
│   ├── SETUP.md              (500 lines: setup guide, 16 sections)
│   ├── PHASE1_SUMMARY.md     (Deliverables summary)
│   ├── PHASE1_DELIVERABLES.txt (Detailed status)
│   ├── PROJECT_STRUCTURE.md  (This file)
│   └── QUICKSTART.sh         (One-command setup script)
│
├── ⚙️ CI/CD & Configuration
│   ├── .github/
│   │   └── workflows/
│   │       └── ci.yml        (GitHub Actions: lint, build, format check)
│   │
│   ├── .claude/
│   │   ├── launch.json       (Claude Code dev server config)
│   │   ├── settings.json     (Claude Code hooks)
│   │   ├── settings.local.json
│   │   ├── projects/         (Memory/context storage)
│   │   └── plans/            (Planning documents)
│   │
│   ├── docker-compose.yml    (PostgreSQL 15 + PgAdmin for local dev)
│   ├── .gitignore
│   ├── .railwayignore        (Railway deployment exclusions)
│   └── .env files
│       ├── .env              (Dev environment - local)
│       ├── .env.example      (Template for new developers)
│       ├── .env.test         (Test environment - isolated DB)
│       └── .env.production   (Production - Railway hosted)
│
├── 📄 Root Configuration Files
│   ├── package.json          (Root workspace config + dev scripts)
│   ├── package-lock.json
│   ├── tsconfig.json         (Base TypeScript config)
│   ├── README.md             (Project description)
│   └── node_modules/         (Shared dev dependencies)
│
└── 📁 Other
    ├── logs/                 (Runtime logs)
    ├── .worktrees/           (Git worktree experiments)
    └── .git/                 (Git version control)
```

---

## 2. Technology Stack

### Backend
- **Framework:** Express 5.2.1
- **Language:** TypeScript 6.0.3
- **ORM:** Prisma 5.19.0
- **Database:** PostgreSQL 15 (docker locally, Railway managed in prod)
- **Authentication:** JWT (jsonwebtoken 9.0.3)
- **Password:** bcryptjs 3.0.3
- **Validation:** Zod 4.4.3
- **Logging:** Winston 3.19.0
- **Payment Gateway:** Mercado Pago SDK
- **QR Code:** qrcode 1.5.4
- **Utilities:** cors, dotenv

### Frontend
- **Framework:** React 18+ (with TypeScript)
- **Bundler:** Vite 5.x
- **Language:** TypeScript 5.x
- **Styling:** CSS Modules
- **HTTP Client:** Fetch API
- **State Management:** Custom hooks / context (TBD)
- **Linting:** OXLint (oxlintrc)
- **Package Manager:** npm

### Development Tools
- **Version Control:** Git + GitHub
- **CI/CD:** GitHub Actions (.github/workflows/ci.yml)
- **Dev Server:** Nodemon (auto-reload)
- **Code Quality:** ESLint, Prettier
- **Deployment:** Railway (2 services: api + frontend)
- **Local DB:** Docker Compose (PostgreSQL 15 + PgAdmin)

---

## 3. Code Organization

### Backend Routes (11 files)
```
src/routes/
├── auth.ts              (Login, signup, JWT token)
├── campaigns.ts         (Create, list, update campaigns)
├── leads.ts             (Lead creation, conversion, tracking)
├── driver.ts            (Driver profile, status, earnings)
├── tablet.ts            (Device pairing, sessions, configuration)
├── advertiser.ts        (Advertiser profile, budget, campaigns)
├── admin.ts             (Admin panel, system management)
├── driver-wallet.ts     (Driver earnings balance, payout requests)
├── driver-bank.ts       (Bank account management)
├── billing.ts           (Company credit, invoicing)
├── payments.ts          (Payment processing)
├── health.ts            (Health check endpoint)
├── webhook-mercadopago.ts (Payment webhooks)
├── public.ts            (Public endpoints, landing)
└── (others)
```

### Backend Services (11 files)
```
src/services/
├── authService.ts           (Authentication logic)
├── campaignService.ts       (Campaign management)
├── motoristaService.ts      (Driver-specific logic)
├── anuncianteService.ts     (Advertiser-specific logic)
├── paymentService.ts        (Payment processing, Mercado Pago integration)
├── tabletService.ts         (Tablet pairing, device management)
├── marketplaceService.ts    (Campaign marketplace logic)
├── trackingService.ts       (Scan, impression, lead tracking)
├── qrService.ts             (QR code generation, management)
├── adminService.ts          (Admin operations)
└── reviewService.ts         (Campaign reviews, ratings)
```

### Middleware (5 files)
```
src/middleware/
├── auth.ts              (JWT verification)
├── errorHandler.ts      (Global error handling)
├── validation.ts        (Request validation - Zod)
├── logging.ts           (Request/response logging)
└── index.ts             (Middleware exports)
```

### Database Models (32 in Prisma)
**Core:**
- Company, User, MotoristProfile, AnuncianteProfile

**Campaigns & Leads:**
- Campaign, CampaignMotorista, Lead, ScanEvent, ImpressionEvent

**Devices & Sessions:**
- TabletDevice, TabletSession

**Payments & Earnings:**
- Payment, DriverEarning, DriverBankAccount, CompanyCreditTx

**Audit & Compliance:**
- AuditLog, CampaignReview

**Enums:** UserType, MotoristStatus, CampaignStatus, LeadStatus, RideApp, RideCategory, Region, etc.

---

## 4. Current Implementation Status

### ✅ COMPLETE (v1.0 Ready)

**Backend:**
- ✅ 11 route handlers (all CRUD endpoints)
- ✅ 11 service classes (business logic)
- ✅ 5 middleware functions
- ✅ JWT authentication
- ✅ Zod validation
- ✅ Error handling
- ✅ Prisma ORM + 32 models
- ✅ 5 migrations (versioned)
- ✅ Mercado Pago integration
- ✅ QR code generation
- ✅ Winston logging

**Frontend:**
- ✅ React setup (Vite)
- ✅ Login/Signup UI
- ✅ Dashboard (3 role-based versions: Admin, Anunciante, Motorista)
- ✅ Component library
- ✅ API client hooks
- ✅ TypeScript types
- ✅ ~9.6K LOC

**Database:**
- ✅ PostgreSQL 15 (local docker + Railway managed prod)
- ✅ 32 Prisma models
- ✅ All migrations applied
- ✅ 5 seed scripts (including 1000+ leads seed - NEW)
- ✅ Soft deletes
- ✅ Audit logging

**Documentation:**
- ✅ DATABASE.md (1000+ lines)
- ✅ DATA_FLOW.md (1200+ lines)
- ✅ SETUP.md (500 lines)
- ✅ QUICKSTART.sh
- ✅ Prisma schema well-commented

**Infrastructure:**
- ✅ Docker Compose (PostgreSQL 15 + PgAdmin)
- ✅ GitHub Actions CI (lint, build, format check)
- ✅ Railway deployment (2 services)
- ✅ Environment config (.env, .env.test, .env.production)
- ✅ Nodemon dev server

### 🔄 IN PROGRESS / PARTIAL

**CI/CD:**
- 🟡 GitHub Actions runs (lint, build, format check)
- 🟡 CI does NOT run tests (0 tests exist)
- 🟡 Deploy is MANUAL (`railway up` command)
- 🟡 No auto-deploy on push (security feature)

**Frontend Polish:**
- 🟡 State management (custom hooks, may need Redux/Zustand)
- 🟡 Form handling (basic, may need react-hook-form)
- 🟡 Error boundaries (basic)

### ❌ NOT IMPLEMENTED (Planned for Phase 2+)

**Testing:**
- ❌ Jest (unit tests) - 0 tests
- ❌ Supertest (integration tests) - 0 tests
- ❌ Playwright (E2E tests) - 0 tests
- ❌ Coverage reports - N/A
- ❌ Test database isolation - Structure ready, implementation pending

**Monitoring & Analytics:**
- ❌ Error tracking (Sentry, etc.)
- ❌ Performance monitoring
- ❌ Analytics dashboard
- ❌ Uptime monitoring

**Advanced Features:**
- ❌ Real-time updates (WebSockets)
- ❌ Caching layer (Redis)
- ❌ File uploads (S3)
- ❌ Email notifications
- ❌ SMS notifications

---

## 5. Key Patterns & Conventions

### Backend Architecture
```
Request → Route Handler → Service → Prisma (DB)
   ↓
Middleware (Auth, Validation, Logging, Error Handling)
```

**Service Pattern:**
Each service encapsulates one domain (Campaign, Driver, Payment, etc.)
Services contain business logic, validation, and DB queries

**Validation:**
Zod schemas in middleware validate requests before reaching routes

**Error Handling:**
Global errorHandler middleware catches all exceptions
Returns structured error responses with status codes

### Frontend Architecture
```
Page Component → Hooks (API calls) → Service (fetch) → Backend API
   ↓
State (Context / Hooks) → Child Components → UI
```

**Component Structure:**
Pages (routing) → Components (reusable UI) → Hooks (logic)

**API Communication:**
Fetch-based service layer (easy to replace with axios/swr)
Custom hooks wrap service calls for React integration

---

## 6. Database Schema Highlights

### 32 Prisma Models organized by domain:

| Domain | Models | Purpose |
|--------|--------|---------|
| **Auth & Profiles** | User, Company, MotoristProfile, AnuncianteProfile | User management, tenant isolation |
| **Campaigns** | Campaign, CampaignMotorista | Ad campaigns, driver assignments |
| **Leads & Tracking** | Lead, ScanEvent, ImpressionEvent | Lead generation, metrics |
| **Devices** | TabletDevice, TabletSession | Device pairing, sessions |
| **Payments** | Payment, DriverEarning, DriverBankAccount, CompanyCreditTx | Financial transactions |
| **Audit** | AuditLog, CampaignReview | Compliance, feedback |

### Key Business Rules Implemented:
- ✅ Commission calculated at lead conversion (immutable)
- ✅ Company credit reserved upfront (no overbooking)
- ✅ Soft deletes (no data loss)
- ✅ Audit logging (all changes tracked)
- ✅ Tablet pairing with 6-digit codes
- ✅ Manual PIX payout tracking

---

## 7. Deployment Architecture

### Local Development
```
Developer Machine:
├── Docker (PostgreSQL 15)
├── npm run dev (backend on port 3000)
├── cd frontend && npm run dev (frontend on port 5173)
└── npm run db:studio (visual DB browser on port 5555)
```

### Production (Railway)
```
Railway Project "FastLEAD":
├── Service 1: fastlead-api (Node backend)
│   └── Env: DATABASE_URL (managed PostgreSQL)
│
├── Service 2: FastLEAD (React frontend)
│   └── Domain: fastlead-production.up.railway.app
│
└── PostgreSQL (managed by Railway)
    └── Backups: Automatic
```

### CI/CD Pipeline
```
Push to GitHub
     ↓
GitHub Actions CI (.github/workflows/ci.yml)
     ├── ESLint (lint check)
     ├── Prettier (format check)
     ├── tsc --noEmit (type check)
     └── Build (npm run build)
     ↓
Manual Deploy (user runs: railway up)
     ├── Backend: railway up --service fastlead-api
     └── Frontend: cd frontend && railway up
```

**Important:** Push does NOT automatically deploy (manual process)

---

## 8. Environment Configuration

| File | Purpose | Example Value |
|------|---------|---|
| `.env` | Local dev | DATABASE_URL=postgresql://localhost:5432/fastlead_db |
| `.env.test` | Test (isolated) | DATABASE_URL=postgresql://localhost:5432/fastlead_test_db |
| `.env.example` | Template | Template for new developers |
| `.env.production` | Railway prod | DATABASE_URL=postgresql://...railway.app/... |

**Key Variables:**
- NODE_ENV, PORT
- DATABASE_URL
- JWT_SECRET, JWT_REFRESH_SECRET
- CORS_ORIGIN
- LOG_LEVEL
- MASTER_PASSWORD (for seed scripts)

---

## 9. Scripts & Commands

### Backend
```bash
npm run dev              # Start dev server with auto-reload
npm run build            # Compile TypeScript to dist/
npm run start            # Run compiled server
npm run lint             # ESLint check
npm run lint:fix         # ESLint fix
npm run format           # Prettier format
npm run format:check     # Prettier check only
npm run check            # All checks (format + lint + type)
npm run db:dev           # Setup database + seed
npm run db:test          # Setup test database
npm run db:studio        # Visual database browser
npm run test             # Jest (when Phase 2)
```

### Database
```bash
npm run db:migrate       # Apply migrations (production)
npm run db:migrate:dev   # Apply migrations (development)
npm run db:seed:realistic # Seed 1000+ leads
npm run db:reset:master  # Reset metrics, keep users
```

### Frontend
```bash
cd frontend
npm run dev              # Vite dev server (port 5173)
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Lint check
```

---

## 10. File Sizes & Metrics

| Component | LOC | Files | Status |
|-----------|-----|-------|--------|
| Backend | ~2K | 30+ | ✅ Complete |
| Frontend | ~9.6K | 50+ | ✅ Complete (no tests) |
| Database Schema | ~1K | 1 (schema.prisma) | ✅ Complete |
| Migrations | - | 5 | ✅ Complete |
| Documentation | 3000+ | 3 docs | ✅ Complete (NEW - Phase 1) |
| **TOTAL** | **~15.6K** | **100+** | **✅ v1.0 Ready** |

---

## 11. Dependencies Summary

### Backend (package.json root)
**Production:**
- Express 5.2.1
- Prisma 5.19.0
- TypeScript 6.0.3
- JWT, bcryptjs, Zod, Winston, QRCode

**Dev:**
- ESLint, Prettier
- ts-node, Nodemon
- Prisma CLI

### Frontend (frontend/package.json)
**Production:**
- React 18+
- Vite 5.x

**Dev:**
- TypeScript
- OXLint (or similar)

---

## 12. Next Steps (Phase 2: Testing)

### Immediate (Dias 3-5)
- [ ] Install Jest + Supertest
- [ ] Install Playwright
- [ ] Create test structure (src/__tests__/)
- [ ] Setup test database isolation
- [ ] Add 30+ unit tests (backend routes, services)
- [ ] Add 5 E2E tests (critical flows)
- [ ] CI/CD integration

### Phase 3 (Dias 5-10)
- [ ] Commission calculation tests (70%+ coverage)
- [ ] Lead conversion tests
- [ ] Payout process tests
- [ ] E2E: scan → earn flow

### Phase 4-5 (Dias 10-14)
- [ ] Docs: TESTING.md, DEPLOYMENT.md
- [ ] ONBOARD.md (new developer in 15 min)
- [ ] Coverage reports

---

## Summary

**FastLEAD v1.0** is a **mature, production-ready monorepo** with:
- ✅ Full backend API (11 routes, 11 services)
- ✅ React frontend (9.6K LOC, 3 role-based UIs)
- ✅ PostgreSQL database (32 models, 5 migrations)
- ✅ Complete documentation (PHASE 1 - NEW!)
- 🔄 Zero tests (starting Phase 2)
- 🔄 Manual deployment (safe, not automated)

**Ready for:** Phase 2 (Testing & CI/CD Automation)

