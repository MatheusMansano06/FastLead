# 📊 Prisma Database Setup

This directory contains the Prisma schema, migrations, and seed data for FastLead.

## 📁 Files

- **`schema.prisma`** - Database schema definition (9 tables + enums)
- **`migrations/001_initial_schema.sql`** - PostgreSQL migration script
- **`seed.ts`** - Test data seeder

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install @prisma/client
npm install -D prisma typescript ts-node
```

### 2. Setup Database

```bash
# Create PostgreSQL database
createdb fastlead_db

# Copy environment file
cp .env.example .env

# Update DATABASE_URL in .env with your credentials
# Example: postgresql://postgres:password@localhost:5432/fastlead_db
```

### 3. Run Migration

```bash
# Apply migration
npx prisma migrate deploy

# OR generate from schema.prisma (development)
npx prisma migrate dev --name initial_schema
```

### 4. Seed Test Data

```bash
# Populate database with test data
npx prisma db seed

# Or manually:
npx ts-node prisma/seed.ts
```

### 5. Explore Schema (Optional)

```bash
# Open visual schema explorer
npx prisma studio
```

## 📋 Database Schema Overview

```
Company (1 tenant/partner)
├── Users (admin, motoristas, anunciantes)
│   ├── MotoristProfile (driver data)
│   └── AnuncianteProfile (advertiser data)
├── Campaigns (ad campaigns)
│   ├── CampaignMotorista (N:N junction)
│   ├── Leads (QR scan tracking)
│   └── Payments (motorista earnings)
└── AuditLog (compliance trail)
```

## 🔑 Test Credentials

After seeding, use these accounts:

```
Admin:
  Email: admin@fastlead.com.br
  Password: admin123

Motorista:
  Email: joao.silva@motorista.com
  Password: motorista123

Anunciante:
  Email: vendas@patriani.com.br
  Password: anunciante123
```

## 📝 Common Commands

### Development

```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Open Prisma Studio (visual DB explorer)
npx prisma studio

# Show pending migrations
npx prisma migrate status
```

### Migrations

```bash
# Create a new migration from schema changes
npx prisma migrate dev --name add_new_field

# Apply pending migrations to production
npx prisma migrate deploy

# Reset database (warning: deletes data)
npx prisma migrate reset

# Create migration without running it
npx prisma migrate create --name add_new_field
```

### Utilities

```bash
# Format schema.prisma
npx prisma format

# Validate schema
npx prisma validate

# Show database structure
npx prisma db pull
```

## 🔒 Multi-Tenant Architecture

Every table includes `company_id` to support multiple FastLead partners:

```typescript
// Always filter by company_id
const campaigns = await prisma.campaign.findMany({
  where: {
    company_id: userCompanyId,  // ← Required for data isolation
    status: 'ACTIVE'
  }
});
```

## 📊 Key Features

✅ **9 Core Tables**
- Company, User, MotoristProfile, AnuncianteProfile
- Campaign, CampaignMotorista, Lead, Payment, AuditLog

✅ **Multi-Tenant Design**
- Complete data isolation per company
- Composite unique constraints with company_id
- Row-level security ready

✅ **Soft Deletes**
- `deleted_at` timestamp on all core entities
- Preserve historical data for compliance

✅ **Audit Trail**
- Complete logging of all changes
- User, timestamp, IP, before/after values

✅ **Type Safety**
- Enums for status fields
- Generated Prisma types
- TypeScript support

## 🔧 Production Setup

### Backup Strategy

```bash
# Backup database
pg_dump fastlead_db > backup_$(date +%Y%m%d).sql

# Restore from backup
psql fastlead_db < backup_20240709.sql
```

### Performance

- Indexed on `company_id`, foreign keys, and common filters
- Composite indexes for multi-tenant queries
- Materialized views for reporting (future)

### Security

- Field-level encryption for sensitive data (bank_account)
- Password hashed with bcryptjs
- Audit trail for compliance
- PostgreSQL RLS ready (not enabled yet)

## 📚 Documentation

- **Main Guide**: See `DATABASE.md` in project root
- **Schema Details**: See `schema.prisma` comments
- **Queries**: See DATABASE.md → "Common Queries" section

## 🐛 Troubleshooting

### Database Connection Failed

```bash
# Check PostgreSQL is running
psql postgres -c "SELECT 1"

# Verify DATABASE_URL in .env
echo $DATABASE_URL

# Test connection
npx prisma db execute --stdin < /dev/null
```

### Migration Conflicts

```bash
# Reset migrations (dev only)
npx prisma migrate reset

# Manually resolve
npx prisma migrate resolve --rolled-back 001_initial_schema
```

### Type Generation Issues

```bash
# Force regenerate Prisma Client
npx prisma generate --force
```

## 📞 Support

For database design questions, see `DATABASE.md` in the project root.

---

**Status**: Production Ready ✅  
**Updated**: 2026-07-09  
**PostgreSQL Version**: 14+
