# 📊 FastLead - Database Design & Documentation

**Version**: 1.0  
**Updated**: 2026-07-09  
**Status**: Production Ready

---

## 📑 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Multi-Tenant Design](#multi-tenant-design)
3. [Schema Entities](#schema-entities)
4. [Relationships Diagram](#relationships-diagram)
5. [Common Queries](#common-queries)
6. [Indexing Strategy](#indexing-strategy)
7. [Setup & Migration](#setup--migration)
8. [Performance Considerations](#performance-considerations)

---

## 🏗️ Architecture Overview

FastLead uses a **relational PostgreSQL database** with a **multi-tenant architecture** where each company is completely isolated at the database level through the `company_id` foreign key present in all tables.

### Key Principles

- **Multi-Tenant First**: Every table has a `company_id` to support multiple FastLead partners
- **Soft Deletes**: All core entities support soft deletes via `deleted_at` timestamp
- **UUIDs**: All primary keys use CUID (Collision-resistant IDs) for better scalability
- **Audit Trail**: Complete audit logging for compliance and debugging
- **Type Safety**: PostgreSQL enums for status fields to prevent invalid states

### Technology Stack

- **Database**: PostgreSQL 14+
- **ORM**: Prisma 5.x
- **Language**: TypeScript
- **Migrations**: Prisma migrations

---

## 🔐 Multi-Tenant Design

Every user interaction is scoped to their company. This prevents cross-company data leaks and enables simple isolation:

```typescript
// ✅ CORRECT: Fetch only motoristas from company ABC
const motoristas = await db.motoristProfile.findMany({
  where: {
    company_id: req.user.company_id,
  },
});

// ❌ WRONG: Missing company_id filter
const motoristas = await db.motoristProfile.findMany();
```

### Unique Constraints

Unique constraints are **always composite** including `company_id`:

- `Company.email` - Global unique (only one FastLead account per email)
- `User(company_id, email)` - Email unique per company
- `Campaign(company_id, qr_code_data)` - QR codes unique per company
- `MotoristProfile(company_id, user_id)` - One profile per motorista per company

---

## 📋 Schema Entities

### 1. **Company** - Tenant Container

Represents a company/organization using FastLead (FastLead itself, partners, franchises).

```sql
CREATE TABLE "Company" (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  website VARCHAR(500),
  logo_url VARCHAR(500),
  document_number VARCHAR(20) UNIQUE,  -- CNPJ for Brazilian companies
  country VARCHAR(2) DEFAULT 'BR',
  timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
  status VARCHAR(50) DEFAULT 'active',  -- active, suspended, deleted
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
);
```

**Key Fields**:
- `document_number`: CNPJ (Cadastro Nacional de Pessoas Jurídicas) for Brazilian companies
- `timezone`: Used for report calculations and scheduling
- `status`: Soft suspension support (no deletion needed)

**Indexes**: status, created_at

---

### 2. **User** - All User Types

Central user table containing motoristas, anunciantes, and admins.

```sql
CREATE TABLE "User" (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type ENUM('MOTORISTA', 'ANUNCIANTE', 'ADMIN'),
  phone VARCHAR(20),
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,  -- Email verification status
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  
  UNIQUE(company_id, email),
  FOREIGN KEY (company_id) REFERENCES Company(id)
);
```

**Key Fields**:
- `type`: MOTORISTA, ANUNCIANTE, or ADMIN - determines app behavior
- `is_verified`: Email verification status (optional 2FA)
- `is_active`: Soft deactivation without deletion

**Indexes**: company_id, email, type

**Relations**:
- 1:1 → `MotoristProfile` (if type = MOTORISTA)
- 1:1 → `AnuncianteProfile` (if type = ANUNCIANTE)

---

### 3. **MotoristProfile** - Motorista Data

Extended profile for motorista-type users (drivers).

```sql
CREATE TABLE "MotoristProfile" (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT UNIQUE NOT NULL,
  vehicle_info VARCHAR(500),      -- Make, model, year
  license_plate VARCHAR(20) UNIQUE,
  phone VARCHAR(20),
  total_earnings DECIMAL(12,2) DEFAULT 0,
  status ENUM('ATIVO', 'INATIVO', 'SUSPENSO'),
  last_online_at TIMESTAMP,
  bank_account VARCHAR(255),      -- Encrypted in production
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  
  UNIQUE(company_id, user_id),
  FOREIGN KEY (company_id) REFERENCES Company(id),
  FOREIGN KEY (user_id) REFERENCES User(id)
);
```

**Key Fields**:
- `vehicle_info`: User-friendly vehicle description (for ad display context)
- `license_plate`: Must be unique to prevent duplicate vehicle registrations
- `total_earnings`: Cached total (updated when payments are made)
- `status`: ATIVO (online, can display ads), INATIVO (offline), SUSPENSO (account frozen)
- `bank_account`: Should be encrypted with field-level encryption in production

**Indexes**: company_id, status

**Relations**:
- 1:1 ← `User`
- 1:N → `CampaignMotorista`
- 1:N → `Lead`
- 1:N → `Payment`

---

### 4. **AnuncianteProfile** - Advertiser Data

Extended profile for anunciante-type users (advertisers).

```sql
CREATE TABLE "AnuncianteProfile" (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT UNIQUE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  document_number VARCHAR(20),     -- CNPJ
  industry VARCHAR(100),           -- Real Estate, Tech, etc.
  total_budget DECIMAL(12,2) DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  contact_person VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  
  UNIQUE(company_id, user_id),
  FOREIGN KEY (company_id) REFERENCES Company(id),
  FOREIGN KEY (user_id) REFERENCES User(id)
);
```

**Key Fields**:
- `total_budget`: Advertiser's monthly/campaign budget
- `total_spent`: Cached total spent (updated when campaigns charge)
- `industry`: For analytics and targeting in the future

**Indexes**: company_id

**Relations**:
- 1:1 ← `User`
- 1:N → `Campaign`

---

### 5. **Campaign** - Advertising Campaign

A campaign is an advertising unit with a unique QR code running on multiple motoristas' vehicles.

```sql
CREATE TABLE "Campaign" (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  anunciante_id TEXT NOT NULL,
  created_by_id TEXT NOT NULL,
  
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),         -- Ad creative image
  qr_code_data VARCHAR(500) UNIQUE,      -- Actual QR data (URL)
  qr_code_image_url VARCHAR(500), -- PNG of QR code
  
  status ENUM('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  target_vehicles INT DEFAULT 1,
  total_investment DECIMAL(12,2) DEFAULT 0,
  price_per_lead DECIMAL(12,2),   -- How much to pay per QR scan
  daily_budget DECIMAL(12,2),
  
  total_leads INT DEFAULT 0,      -- Count of all QR scans
  unique_scans INT DEFAULT 0,     -- Count of unique devices
  conversions INT DEFAULT 0,      -- Count of converted leads
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  
  UNIQUE(company_id, qr_code_data),
  FOREIGN KEY (company_id) REFERENCES Company(id),
  FOREIGN KEY (anunciante_id) REFERENCES AnuncianteProfile(id),
  FOREIGN KEY (created_by_id) REFERENCES User(id)
);
```

**Campaign Lifecycle**:
1. `DRAFT` - Being created, not live yet
2. `ACTIVE` - Currently running, motoristas can see it
3. `PAUSED` - Temporarily paused
4. `COMPLETED` - Campaign period ended
5. `CANCELLED` - Explicitly cancelled

**Key Fields**:
- `qr_code_data`: The actual URL/data encoded in QR (must be unique to track scans)
- `price_per_lead`: Payment to motorista per scan (varies by campaign)
- `total_leads`: Sum of all scans across all motoristas
- `conversions`: How many scans led to confirmed purchases/actions

**Indexes**: company_id, anunciante_id, status, start_date, end_date

**Relations**:
- 1:N ← `AnuncianteProfile`
- 1:N ← `User` (created_by)
- N:N → `CampaignMotorista` (via junction table)
- 1:N → `Lead`
- 1:N → `Payment`

---

### 6. **CampaignMotorista** - Campaign-Motorista Junction

Links campaigns to motoristas (N:N relationship). Tracks if a motorista accepted a campaign.

```sql
CREATE TABLE "CampaignMotorista" (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  motorista_id TEXT NOT NULL,
  
  status ENUM('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'),
  acceptance_date TIMESTAMP,      -- When motorista accepted
  
  scans_count INT DEFAULT 0,      -- How many QR scans this motorista got
  leads_generated INT DEFAULT 0,  -- How many unique leads (for billing)
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  
  UNIQUE(campaign_id, motorista_id),
  FOREIGN KEY (company_id) REFERENCES Company(id),
  FOREIGN KEY (campaign_id) REFERENCES Campaign(id),
  FOREIGN KEY (motorista_id) REFERENCES MotoristProfile(id)
);
```

**Key Fields**:
- `acceptance_date`: When motorista accepted to display this campaign
- `scans_count`: Cached count for fast dashboard queries
- `leads_generated`: May differ from scans_count (duplicates, invalid scans)

**Indexes**: company_id, motorista_id

**Relations**:
- N:1 ← `Campaign`
- N:1 ← `MotoristProfile`

---

### 7. **Lead** - QR Scan Tracking

Records every QR code scan, with conversion tracking.

```sql
CREATE TABLE "Lead" (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  motorista_id TEXT NOT NULL,
  user_id TEXT NOT NULL,          -- The motorista's user record
  
  status ENUM('PENDING', 'CONVERTED', 'INVALID'),
  qr_scan_time TIMESTAMP NOT NULL,
  
  -- Device tracking
  user_device VARCHAR(500),       -- User-Agent string
  ip_address VARCHAR(50),
  latitude FLOAT,                 -- Optional geolocation
  longitude FLOAT,
  
  -- Conversion tracking
  converted_at TIMESTAMP,
  conversion_value DECIMAL(12,2), -- Purchase amount if converted
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  
  FOREIGN KEY (company_id) REFERENCES Company(id),
  FOREIGN KEY (campaign_id) REFERENCES Campaign(id),
  FOREIGN KEY (motorista_id) REFERENCES MotoristProfile(id),
  FOREIGN KEY (user_id) REFERENCES User(id)
);
```

**Lead Lifecycle**:
1. `PENDING` - QR scanned, waiting for conversion
2. `CONVERTED` - Customer took action (purchase, form submission)
3. `INVALID` - Duplicate scan or bot traffic

**Key Fields**:
- `user_device`: Used to identify unique devices vs duplicate scans
- `qr_scan_time`: Exact timestamp of the scan event
- `conversion_value`: For ROI calculation

**Indexes**: company_id, campaign_id, motorista_id, qr_scan_time, status, created_at

**Relations**:
- N:1 ← `Campaign`
- N:1 ← `MotoristProfile`

---

### 8. **Payment** - Motorista Earnings

Records payments/earnings for motoristas based on campaigns or fixed salary.

```sql
CREATE TABLE "Payment" (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  motorista_id TEXT NOT NULL,
  campaign_id TEXT,               -- NULL for monthly salary
  
  amount DECIMAL(12,2) NOT NULL,
  payment_type ENUM('FIXED', 'PER_LEAD', 'HYBRID'),
  status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'),
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  leads_count INT DEFAULT 0,      -- For PER_LEAD calculation
  
  -- Payment gateway integration
  external_id VARCHAR(255),       -- Payment processor ID
  paid_at TIMESTAMP,
  rejected_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  
  FOREIGN KEY (company_id) REFERENCES Company(id),
  FOREIGN KEY (motorista_id) REFERENCES MotoristProfile(id),
  FOREIGN KEY (campaign_id) REFERENCES Campaign(id)
);
```

**Payment Types**:
- `FIXED`: Monthly salary regardless of leads
- `PER_LEAD`: Payment per QR scan or conversion
- `HYBRID`: Base salary + bonus per lead

**Indexes**: company_id, motorista_id, status, period_start, period_end

**Relations**:
- N:1 ← `MotoristProfile`
- N:1 ← `Campaign` (optional)

---

### 9. **AuditLog** - Compliance & Debugging

Complete audit trail of system actions for compliance, debugging, and fraud detection.

```sql
CREATE TABLE "AuditLog" (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  
  action ENUM('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'PAYMENT'),
  resource_type VARCHAR(100),     -- 'Campaign', 'Payment', 'User', etc.
  resource_id VARCHAR(255),       -- ID of the resource
  
  old_values JSONB,               -- Previous state
  new_values JSONB,               -- New state
  description TEXT,
  
  ip_address VARCHAR(50),
  user_agent VARCHAR(500),
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (company_id) REFERENCES Company(id),
  FOREIGN KEY (user_id) REFERENCES User(id)
);
```

**Indexes**: company_id, user_id, action, resource_type, created_at

**Use Cases**:
- Who changed a campaign and when?
- What was the payment before it was updated?
- Did user X login yesterday?
- Full data history for compliance audits

---

## 📊 Relationships Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          COMPANY (Tenant)                           │
│  Contains all data for a single FastLead partner or internal entity │
└──────┬──────────────────────────────────────────────────────────────┘
       │
       ├─── 1:N ──→ USER
       │            (motorista, anunciante, admin)
       │            ├─── 1:1 ──→ MotoristProfile
       │            └─── 1:1 ──→ AnuncianteProfile
       │
       ├─── 1:N ──→ CAMPAIGN
       │            (from AnuncianteProfile.created_by)
       │            ├─── N:N ──→ MOTORISTA (via CampaignMotorista)
       │            │            ├─── 1:N → LEAD
       │            │            └─── 1:N → PAYMENT
       │            │
       │            └─── 1:N ──→ LEAD
       │                         (QR scans, conversion tracking)
       │
       └─── 1:N ──→ AUDITLOG
                    (Compliance trail)


UNIQUE CONSTRAINTS (Multi-Tenant Safe):
  • Company.email - GLOBAL (only once across all companies)
  • User(company_id, email) - Per company
  • Campaign(company_id, qr_code_data) - Per company
  • MotoristProfile(company_id, user_id) - Per company
```

---

## 🔍 Common Queries

### 1. **Get All Leads for a Campaign**

```sql
SELECT l.*, m.user_id, u.name as motorista_name
FROM "Lead" l
JOIN "MotoristProfile" m ON l.motorista_id = m.id
JOIN "User" u ON m.user_id = u.id
WHERE l.company_id = ? 
  AND l.campaign_id = ?
  AND l.deleted_at IS NULL
ORDER BY l.qr_scan_time DESC;
```

### 2. **Calculate Motorista Earnings**

```sql
SELECT 
  m.id,
  m.user_id,
  u.name,
  COUNT(l.id) as total_leads,
  SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) as conversions,
  c.price_per_lead * COUNT(l.id) as estimated_earnings
FROM "MotoristProfile" m
JOIN "User" u ON m.user_id = u.id
LEFT JOIN "CampaignMotorista" cm ON m.id = cm.motorista_id
LEFT JOIN "Campaign" c ON cm.campaign_id = c.id
LEFT JOIN "Lead" l ON l.motorista_id = m.id AND l.campaign_id = c.id
WHERE m.company_id = ?
  AND c.status = 'ACTIVE'
  AND l.qr_scan_time >= ?
  AND l.qr_scan_time <= ?
GROUP BY m.id, u.name
ORDER BY estimated_earnings DESC;
```

### 3. **Get Campaign ROI**

```sql
SELECT 
  c.id,
  c.title,
  c.total_investment,
  COUNT(DISTINCT l.id) as total_scans,
  SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) as conversions,
  SUM(CASE WHEN l.status = 'CONVERTED' THEN l.conversion_value ELSE 0 END) as total_revenue,
  (SUM(CASE WHEN l.status = 'CONVERTED' THEN l.conversion_value ELSE 0 END) / c.total_investment) as roi_multiple
FROM "Campaign" c
LEFT JOIN "Lead" l ON c.id = l.campaign_id
WHERE c.company_id = ? 
  AND c.id = ?
GROUP BY c.id;
```

### 4. **Get Motorista Dashboard Data**

```sql
SELECT 
  m.id,
  u.name,
  m.total_earnings,
  m.status,
  COUNT(DISTINCT cm.campaign_id) as active_campaigns,
  COUNT(DISTINCT l.id) as total_scans_this_month,
  SUM(CASE WHEN l.status = 'CONVERTED' THEN 1 ELSE 0 END) as conversions
FROM "MotoristProfile" m
JOIN "User" u ON m.user_id = u.id
LEFT JOIN "CampaignMotorista" cm ON m.id = cm.motorista_id AND cm.status = 'ACTIVE'
LEFT JOIN "Lead" l ON m.id = l.motorista_id 
  AND DATE_TRUNC('month', l.qr_scan_time) = DATE_TRUNC('month', CURRENT_DATE)
WHERE m.company_id = ? 
  AND m.user_id = ?
GROUP BY m.id, u.name;
```

### 5. **Audit Trail for Compliance**

```sql
SELECT *
FROM "AuditLog"
WHERE company_id = ?
  AND resource_type = 'Payment'
  AND created_at >= ? 
  AND created_at <= ?
ORDER BY created_at DESC;
```

---

## 🔑 Indexing Strategy

All indexes follow this pattern for multi-tenant safety:

```
Composite indexes: (company_id, [other fields])
Single indexes: Common filter fields
```

### Primary Key Indexes (Automatic)
- All `id` fields (PRIMARY KEY)

### Foreign Key Indexes (Required)
- `User.company_id`
- `MotoristProfile(company_id, user_id)`
- `Campaign(company_id, anunciante_id)`
- `Lead.motorista_id`, `Lead.campaign_id`
- `Payment.motorista_id`

### Query Performance Indexes
- `Campaign(status, start_date, end_date)` - Dashboard filtering
- `Lead(qr_scan_time, status)` - Conversion tracking
- `Payment(period_start, period_end)` - Reports
- `AuditLog(action, created_at)` - Compliance queries

### Example: Campaign Queries
```sql
-- Gets campaign status for active ads (most common)
CREATE INDEX idx_campaign_company_status ON Campaign(company_id, status);

-- Gets campaigns by date range
CREATE INDEX idx_campaign_dates ON Campaign(company_id, start_date, end_date);
```

**Index Size Estimates** (at scale with 1M leads):
- Campaign: ~50KB
- Lead: ~2MB
- Payment: ~500KB
- Audit: ~5MB

---

## 🚀 Setup & Migration

### Prerequisites
```bash
# Install dependencies
npm install @prisma/client bcryptjs

# Install dev dependencies
npm install -D prisma typescript ts-node
```

### Environment Setup
```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/fastlead_db"
NODE_ENV="development"
JWT_SECRET="your-secret-here"
```

### Initial Migration
```bash
# Create PostgreSQL database
createdb fastlead_db

# Run migration
npx prisma migrate deploy

# (Or generate migration from schema.prisma)
npx prisma migrate dev --name initial_schema
```

### Seed Database
```bash
# Run seeds with test data
npx prisma db seed

# Or manually:
npx ts-node prisma/seed.ts
```

### Generate Prisma Client
```bash
# Auto-generate type-safe client
npx prisma generate

# View schema in visual format
npx prisma studio
```

---

## ⚡ Performance Considerations

### Optimization Rules

1. **Always filter by company_id first**
   ```typescript
   // ✅ Good: Uses company index first
   await db.campaign.findMany({
     where: { company_id, status: 'ACTIVE' }
   });
   
   // ❌ Bad: Scans all campaigns
   await db.campaign.findMany({
     where: { status: 'ACTIVE' }
   });
   ```

2. **Batch Lead Inserts**
   ```typescript
   // ✅ Good: 1000s of leads in single transaction
   await db.lead.createMany({
     data: leads,
     skipDuplicates: true
   });
   ```

3. **Use Pagination for Large Results**
   ```typescript
   // ✅ Good: Get first 50 leads
   const leads = await db.lead.findMany({
     where: { campaign_id },
     take: 50,
     skip: 0,
     orderBy: { qr_scan_time: 'desc' }
   });
   ```

4. **Cache Aggregate Results**
   ```typescript
   // Use MATERIALIZED VIEW for daily/monthly reports
   CREATE MATERIALIZED VIEW campaign_daily_summary AS
   SELECT 
     DATE(qr_scan_time) as date,
     campaign_id,
     COUNT(*) as scans,
     COUNT(DISTINCT ip_address) as unique_visitors
   FROM "Lead"
   GROUP BY DATE(qr_scan_time), campaign_id;
   ```

5. **Soft Delete Strategy**
   ```typescript
   // Always exclude deleted records
   const campaigns = await db.campaign.findMany({
     where: {
       company_id,
       deleted_at: null  // ← Important!
     }
   });
   ```

### Query Performance Tips

- **Leads table will be largest** (1M+ rows per year)
  - Index heavily on `company_id, campaign_id, qr_scan_time`
  - Archive old leads to separate table monthly
  
- **Payment processing** needs transactions
  - Lock motorista record during payment creation
  - Use `skipDuplicates` when creating batch payments

- **Real-time dashboard** should use denormalized columns
  - `Campaign.total_leads` (updated by trigger)
  - `MotoristProfile.total_earnings` (updated when payment completes)

---

## 🔒 Data Security

### Field-Level Encryption (Production)

Fields that should be encrypted with field-level encryption:
- `MotoristProfile.bank_account`
- `User.password_hash` (already hashed with bcryptjs)

### Row-Level Security (Future)

For very strict multi-tenancy, implement PostgreSQL RLS:

```sql
-- Example: Only show leads from your company
CREATE POLICY lead_isolation ON "Lead"
  USING (company_id = current_setting('app.current_company_id'));
```

### Audit Trail Compliance

Every data modification is logged in `AuditLog`:
- User who made the change
- Timestamp
- IP address
- Old and new values

---

## 📞 Support & Troubleshooting

### Common Issues

**"Unique constraint violation on email"**
```
→ The email exists in another company. Use (company_id, email) check.
```

**"Foreign key constraint failed"**
```
→ Deleting a campaign with active leads. Use soft delete (deleted_at).
```

**"Slow queries on Lead table"**
```
→ Add index: CREATE INDEX idx_lead_campaign_date ON Lead(campaign_id, qr_scan_time);
```

---

## 📚 References

- **Prisma Documentation**: https://www.prisma.io/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs
- **Multi-Tenant Patterns**: https://www.prisma.io/docs/guides/database/multi-tenancy
- **Performance Tuning**: https://wiki.postgresql.org/wiki/Performance_Optimization

---

**Last Updated**: 2026-07-09  
**Maintainer**: FastLead Database Team  
**License**: MIT
