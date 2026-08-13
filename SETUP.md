# FastLEAD Setup Guide (v1.1)

Quick start for **local development** and **testing** infrastructure.

---

## Prerequisites

- **Node.js 18+** — `node --version`
- **npm 9+** — `npm --version`
- **Docker & Docker Compose** — For PostgreSQL
  ```bash
  docker --version
  docker compose version
  ```

---

## 1. Environment Setup

### Clone & Install

```bash
cd /Users/Matheus/Desktop/FastLead
npm install
```

### Environment Variables

Copy template and configure:

```bash
cp .env.example .env
cp .env.example .env.test
```

**Edit `.env` (dev database):**
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://fastlead_user:fastlead_password_dev@localhost:5432/fastlead_db
JWT_SECRET=fastlead-super-secret-dev-key-2024
MASTER_PASSWORD=dev_master_password_123
```

**Edit `.env.test` (isolated test database):**
```env
NODE_ENV=test
PORT=3001
DATABASE_URL=postgresql://fastlead_user:fastlead_password_dev@localhost:5432/fastlead_test_db
DATABASE_TEST_URL=postgresql://fastlead_user:fastlead_password_dev@localhost:5432/fastlead_test_db
MASTER_PASSWORD=test_master_password_123
```

---

## 2. PostgreSQL Local Setup

### Start Containers

```bash
docker compose up -d
```

**Verify:**
```bash
docker compose ps
# Output:
# fastlead_postgres  postgres:15-alpine  Up (5432)
# fastlead_pgadmin   pgadmin4            Up (5050)
```

### Create Test Database

```bash
# Connect to postgres
docker exec -it fastlead_postgres psql -U fastlead_user -d fastlead_db

# In psql:
CREATE DATABASE fastlead_test_db;
\q
```

---

## 3. Database Migrations & Seed

### Dev Database (with realistic data)

```bash
npm run db:dev
```

**What it does:**
1. `prisma migrate deploy` — Applies all migrations
2. `npm run db:seed:realistic` — Populates with:
   - 1 company (FastLead)
   - 100 motoristas (drivers)
   - 50 campanhas (campaigns)
   - 1000 leads (historical)
   - 300 earnings
   - Tablets, impressions, scans

**Output:**
```
✨ Seed complete!

📊 Database state:
  company             1
  users             111  (100 motoristas + 10 anunciantes + 1 admin)
  motoristas        100
  anunciantes        10
  campanhas          50
  leads            1000
  earnings           300
  tablets             50
  scans            2000+

✅ Test credentials:
  Admin:     admin@fastlead.com.br / admin123
  Motorista: motorista1@driver.com / driver123
  Anunciante: anunciante1@company.com / password123
```

### Test Database (isolated)

```bash
npm run db:test
```

**What it does:**
- Runs migrations against `fastlead_test_db`
- **Does NOT seed** (testes seed their own data)
- Keeps dev and test databases separate

---

## 4. Verify Setup

### Prisma Studio (Visual Browser)

```bash
npm run db:studio
```

Opens http://localhost:5555

**Try:**
- Browse 32 tables
- View seed data
- Run raw queries
- Edit records directly

### Direct Query Check

```bash
docker exec -it fastlead_postgres psql \
  -U fastlead_user \
  -d fastlead_db \
  -c "SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema='public';"

# Expected: 32 tables
```

---

## 5. Start Development Server

### Backend API

```bash
npm run dev
```

**Logs:**
```
Server running on http://localhost:3000
✓ Connected to database: fastlead_db
✓ All 32 tables migrated
✓ Seed data loaded (100 motoristas, 50 campanhas, 1000 leads)
```

### Test Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Login as admin
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@fastlead.com.br",
    "password": "admin123"
  }'

# Response:
# {
#   "token": "eyJhbGciOiJIUzI1NiIs...",
#   "user": { "id": "...", "email": "admin@fastlead.com.br", "type": "ADMIN" }
# }
```

---

## 6. Frontend Development

Open separate terminal:

```bash
cd frontend
npm install
npm run dev
```

**Logs:**
```
  VITE v5.x ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

Visit http://localhost:5173 → Login with test credentials

---

## 7. Database Scripts Reference

### Common Commands

```bash
# ✅ Setup fresh dev database
npm run db:dev

# ✅ Prepare test database
npm run db:test

# View all data (Prisma Studio)
npm run db:studio

# Wipe & reset everything (⚠️ DANGEROUS)
npm run db:migrate:reset

# Reset metrics only, keep users (demo mode)
CONFIRM_WIPE=SIM MASTER_PASSWORD=dev_master_password_123 npm run db:reset:master
```

---

## 8. Validation Checklist

After setup, verify:

### ✅ PostgreSQL Running
```bash
docker compose ps | grep postgres
# Should show: fastlead_postgres  postgres:15  Up
```

### ✅ Database Tables Created
```bash
npm run db:studio
# Browse tables, should see 32 models
```

### ✅ Seed Data Loaded
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "motorista1@driver.com", "password": "driver123"}'
# Should return valid JWT
```

### ✅ Migrations Applied
```bash
npm run db:validate
# Should output: ✅ All migrations applied
```

### ✅ Frontend Loads
Visit http://localhost:5173 → See login form

---

## 9. Quick Reference: Test Accounts

| Role | Email | Password | Use |
|------|-------|----------|-----|
| **Admin** | admin@fastlead.com.br | admin123 | Manage platform, approve payouts |
| **Motorista** | motorista1@driver.com | driver123 | Pair tablet, view earnings |
| **Motorista** | motorista2@driver.com | driver123 | (50 motoristas available) |
| **Anunciante** | anunciante1@company.com | password123 | Create campaigns |
| **Anunciante** | anunciante2@company.com | password123 | (10 anunciantes available) |

---

## 10. Troubleshooting

### PostgreSQL Won't Start

```bash
# Check logs
docker compose logs postgres

# Restart
docker compose down
docker compose up -d postgres --build
```

### Database Already Exists

```bash
# Drop & recreate
docker exec -it fastlead_postgres dropdb -U fastlead_user fastlead_db
docker exec -it fastlead_postgres createdb -U fastlead_user fastlead_db
npm run db:dev
```

### Port Already in Use

```bash
# Check what's using 5432 (PostgreSQL)
lsof -i :5432

# If conflicts, change in docker-compose.yml:
# ports: ["5432:5432"] → ["5433:5432"]
# Then update DATABASE_URL to port 5433
```

### Migrations Fail

```bash
# Check migration status
prisma migrate status

# View Prisma logs
PrismaLogLevel=debug npm run db:migrate:dev

# Reset migrations (⚠️ wipes data)
npm run db:migrate:reset
```

---

## 11. Next Steps

### Phase 1: Database ✅ (You are here)
- [x] PostgreSQL running locally
- [x] 32 models migrated
- [x] Realistic seed data (1000 leads)
- [x] Test accounts configured

### Phase 2: Testing (Next)
- [ ] Setup Jest + Supertest (backend unit tests)
- [ ] Setup Playwright (frontend E2E tests)
- [ ] Test database isolation
- [ ] CI/CD integration

### Phase 3: Critical Tests
- [ ] Commission calculation (30% logic)
- [ ] Lead conversion flow
- [ ] Payment/payout process
- [ ] Tablet pairing + scanning

### Phase 4: Documentation & Onboard
- [ ] Docs complete (DATABASE.md, DATA_FLOW.md ✅)
- [ ] ONBOARD.md for new developers
- [ ] Deployment checklist

---

## 12. Performance Notes

### Seed Time
```
Seed realistic (1000 leads): ~30-60 seconds
├─ Depends on machine specs
├─ Network latency to QR code generation
└─ Typical: 45 seconds
```

### Query Performance
```
Lead lookup (indexed): <10ms
Motorista balance (SUM query): <50ms
Campaign metrics: <100ms
```

If slow, check:
```sql
-- Verify indexes
\d lead
\d driver_earning
\d scan_event

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 13. Backing Up Data

```bash
# Export to SQL file
docker exec fastlead_postgres pg_dump \
  -U fastlead_user \
  -d fastlead_db \
  > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
docker exec -i fastlead_postgres psql \
  -U fastlead_user \
  -d fastlead_db \
  < backup_20260813_143000.sql
```

---

## 14. Cleanup (When Done)

```bash
# Stop containers (keep volumes)
docker compose down

# Stop & remove volumes (full wipe)
docker compose down -v

# Remove all fastlead containers
docker compose down -v --rmi all
```

---

## 15. Production Deployment

Once v1.1 testing is done:

```bash
# On Railway console:
npm run db:migrate
# ✅ Migrations applied to production database

# Verify production
curl https://fastlead-api-production.up.railway.app/health
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full checklist.

---

## 16. Getting Help

**Database Questions:** See [docs/DATABASE.md](docs/DATABASE.md)  
**Data Flows:** See [docs/DATA_FLOW.md](docs/DATA_FLOW.md)  
**Testing:** See [docs/TESTING.md](docs/TESTING.md) (coming Phase 2)  
**New Developer Onboarding:** See [ONBOARD.md](ONBOARD.md) (coming Phase 5)

---

## Summary

```bash
# ONE-LINE SETUP (after Node + Docker installed)
npm install && cp .env.example .env && docker compose up -d && npm run db:dev

# Start coding
npm run dev  # Backend
cd frontend && npm run dev  # Frontend (new terminal)
```

Welcome to FastLEAD development! 🚀

