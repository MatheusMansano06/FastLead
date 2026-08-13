# FastLEAD Database Documentation

## Overview

FastLEAD uses **PostgreSQL 15** with **Prisma ORM**. The database is designed for a **multi-tenant marketplace** connecting:
- **Anunciantes** (Advertisers) — pay upfront for leads via tablet QR codes
- **Motoristas** (Drivers) — earn commission on converted leads
- **FastLEAD** (Platform) — manages campaigns, tablets, and payments

---

## Schema Architecture (32 Models)

### Core Models

#### 1. **Company** (`company`)
Tenant/workspace container. FastLEAD itself is one company; future partners would have their own.

```sql
id          CUID (primary key)
name        VARCHAR(255)
email       VARCHAR(255) [UNIQUE]
document_number VARCHAR(20) [UNIQUE] -- CNPJ
credit_balance  DECIMAL(12,2) -- Pre-paid balance for campaigns
status      VARCHAR(50) -- 'active', 'suspended'
created_at  TIMESTAMP
updated_at  TIMESTAMP
deleted_at  TIMESTAMP [nullable] -- Soft delete
```

**Relations:**
- 1 → many Users, Campaigns, Leads, Tablets, Payments

---

#### 2. **User** (`user`)
Authentication entity. One user per email + company.

```sql
id              CUID
company_id      CUID [FK]
email           VARCHAR(255)
password_hash   VARCHAR(255)
name            VARCHAR(255)
type            ENUM -- ADMIN, MOTORISTA, ANUNCIANTE
is_active       BOOLEAN
is_verified     BOOLEAN
last_login_at   TIMESTAMP [nullable]
created_at      TIMESTAMP
updated_at      TIMESTAMP
deleted_at      TIMESTAMP [nullable]

UNIQUE(company_id, email)
INDEX(type)
```

**User Types:**
- `ADMIN` — Platform admins (access all companies)
- `MOTORISTA` — Drivers (have MotoristProfile)
- `ANUNCIANTE` — Advertisers (have AnuncianteProfile)

---

#### 3. **MotoristProfile** (`motorist_profile`)
Driver profile and metrics.

```sql
id              CUID
user_id         CUID [UNIQUE, FK]
company_id      CUID [FK]

-- Vehicle & Location
vehicle_info    VARCHAR(500) -- "Corolla Prata, Placa ABC-1234"
license_plate   VARCHAR(20) [UNIQUE]
cpf             VARCHAR(14)
city            VARCHAR(120)
state           VARCHAR(2) -- UF (SP, RJ, etc)
region          ENUM -- Derived from state

-- Ride Apps & Categories
ride_apps       ENUM[] -- UBER, NOVENOVE, INDRIVE, CABIFY, TAXI
ride_categories ENUM[] -- UBER_X, UBER_COMFORT, NOVENOVE_POP, etc

-- Metrics
rating          DECIMAL(3,2) -- 0.00 to 5.00
ratings_count   INT
total_earnings  DECIMAL(12,2) -- Cache (source of truth: DriverEarning.PENDING sum)
status          ENUM -- ATIVO, INATIVO, SUSPENSO

created_at      TIMESTAMP
updated_at      TIMESTAMP
deleted_at      TIMESTAMP [nullable]

INDEX(status)
INDEX(region)
INDEX(state)
INDEX(city)
```

**Status Meaning:**
- `INATIVO` — Registered but no active tablet
- `ATIVO` — Has tablet paired and active
- `SUSPENSO` — Admin suspended account

---

#### 4. **AnuncianteProfile** (`anunciante_profile`)
Advertiser profile and budget tracking.

```sql
id              CUID
user_id         CUID [UNIQUE, FK]
company_id      CUID [FK]

company_name    VARCHAR(255)
trade_name      VARCHAR(255) -- Marketing name
document_number VARCHAR(20) -- CNPJ
industry        VARCHAR(100)
total_budget    DECIMAL(12,2)
total_spent     DECIMAL(12,2) -- Cache (source of truth: CompanyCreditTx sum)

created_at      TIMESTAMP
updated_at      TIMESTAMP
deleted_at      TIMESTAMP [nullable]
```

---

### Campaign Models

#### 5. **Campaign** (`campaign`)
Advertisement/promotion running on tablets.

```sql
id                  CUID
company_id          CUID [FK]
anunciante_id       CUID [FK]
created_by_id       CUID [FK User]

-- Content
title               VARCHAR(255)
description         TEXT [nullable]
image_url           TEXT -- Data-URL (base64)

-- QR Configuration
show_qr             BOOLEAN -- If false, full-screen banner only
qr_position         ENUM -- TOP_LEFT, TOP_CENTER, ... BOTTOM_RIGHT
show_text           BOOLEAN
qr_code_data        VARCHAR(500) [UNIQUE] -- URL or identifier
qr_code_image_url   TEXT [nullable] -- Base64 SVG/PNG

-- Landing Destination
destination_url     VARCHAR(500) [nullable] -- Custom redirect (optional)
cta_text            VARCHAR(160) [nullable] -- "Scan to win 20% off"

-- Status & Timeline
status              ENUM -- DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED
start_date          DATE
end_date            DATE

-- Budget & Targeting
target_vehicles     INT -- How many drivers to reach
total_investment    DECIMAL(12,2)
price_per_lead      DECIMAL(12,2) [nullable]
daily_budget        DECIMAL(12,2) [nullable]

-- Segmentation (empty = no restriction)
target_regions      ENUM[] -- NORTE, NORDESTE, SUDESTE, SUL, CENTRO_OESTE
target_states       VARCHAR[] -- "SP", "RJ", etc
target_cities       VARCHAR[]
target_ride_apps    ENUM[] -- UBER, NOVENOVE, etc
target_categories   ENUM[] -- UBER_X, UBER_COMFORT, etc

-- Metrics (cache, source of truth is ScanEvent/ImpressionEvent)
total_leads         INT
unique_scans        INT
total_impressions   INT
conversions         INT

created_at          TIMESTAMP
updated_at          TIMESTAMP
deleted_at          TIMESTAMP [nullable]

INDEX(status)
INDEX(start_date)
INDEX(end_date)
UNIQUE(company_id, qr_code_data)
```

---

#### 6. **CampaignMotorista** (`campaign_motorista`)
N:N junction: Which drivers can show which campaigns (hybrid curation).

```sql
id              CUID
campaign_id     CUID [FK]
motorista_id    CUID [FK]
company_id      CUID [FK]

status          ENUM -- ACTIVE, PAUSED
source          ENUM -- DRIVER_ACCEPTED, MASTER_FORCED, MASTER_BLOCKED, DRIVER_REMOVED
assigned_by_id  CUID [nullable] -- Admin user if forced/blocked
assigned_at     TIMESTAMP [nullable]
priority        INT -- Higher = more frequent rotation on tablet

-- Metrics
scans_count     INT
leads_generated INT
impressions_count INT

created_at      TIMESTAMP
updated_at      TIMESTAMP

UNIQUE(campaign_id, motorista_id)
```

**Source Meaning:**
- `DRIVER_ACCEPTED` — Driver opted in via marketplace
- `MASTER_FORCED` — Admin pushed campaign to driver
- `MASTER_BLOCKED` — Admin excluded driver from campaign
- `DRIVER_REMOVED` — Driver removed campaign from tablet (can override MASTER_FORCED)

---

### Lead & Conversion Models

#### 7. **Lead** (`lead`)
Generated by QR scan → eventual conversion → commission.

```sql
id              CUID
company_id      CUID [FK]
campaign_id     CUID [FK]
motorista_id    CUID [FK]
user_id         CUID [nullable, FK] -- NULL if anonymous scan
scan_event_id   CUID [nullable, UNIQUE, FK]

-- Status
status          ENUM -- PENDING, CONVERTED, INVALID
qr_scan_time    TIMESTAMP -- When QR was scanned

-- Contact Info (from landing page)
contact_name    VARCHAR(255) [nullable]
contact_email   VARCHAR(255) [nullable]
contact_phone   VARCHAR(20) [nullable]

-- Device Info
user_device     VARCHAR(500) [nullable] -- User-Agent
ip_address      VARCHAR(50) [nullable]
latitude        FLOAT [nullable]
longitude       FLOAT [nullable]

-- Conversion
converted_at    TIMESTAMP [nullable]
conversion_value DECIMAL(12,2) [nullable] -- Amount that driver earns from

-- Payout
payment_id      CUID [nullable, FK]
payout_status   ENUM -- PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED
payout_at       TIMESTAMP [nullable]

created_at      TIMESTAMP
updated_at      TIMESTAMP
deleted_at      TIMESTAMP [nullable]

INDEX(status)
INDEX(qr_scan_time)
INDEX(campaign_id)
INDEX(motorista_id)
```

---

### Tablet & Event Models

#### 8. **TabletDevice** (`tablet_device`)
Physical tablet in vehicle, paired to motorista.

```sql
id              CUID
company_id      CUID [FK]
motorista_id    CUID [nullable, FK] -- NULL until paired

-- Pairing
pairing_code    VARCHAR(8) [UNIQUE, nullable] -- 6-digit code, NULL after pairing
pairing_expires_at TIMESTAMP [nullable]
device_token    VARCHAR(255) [UNIQUE, nullable]
status          ENUM -- PENDING_PAIRING, ACTIVE, BLOCKED

-- Metadata
label           VARCHAR(120) [nullable] -- "Tablet do João Silva"
user_agent      VARCHAR(500) [nullable]
last_seen_at    TIMESTAMP [nullable]
paired_at       TIMESTAMP [nullable]

created_at      TIMESTAMP
updated_at      TIMESTAMP

INDEX(status)
INDEX(motorista_id)
```

---

#### 9. **TabletSession** (`tablet_session`)
A period during which tablet is running (pairing to unpaired).

```sql
id                  CUID
company_id          CUID [FK]
motorista_id        CUID [FK]
device_id           CUID [nullable, FK]

started_at          TIMESTAMP
ended_at            TIMESTAMP [nullable]

-- Metrics (cache at session end)
impressions_count   INT
scans_count         INT
unique_scans_count  INT
leads_count         INT

created_at          TIMESTAMP
updated_at          TIMESTAMP

INDEX(motorista_id)
INDEX(started_at)
```

---

#### 10. **ImpressionEvent** (`impression_event`)
Ad displayed on tablet screen (attribution).

```sql
id              CUID
company_id      CUID [FK]
campaign_id     CUID [FK]
motorista_id    CUID [FK]
device_id       CUID [nullable, FK]
session_id      CUID [nullable, FK]

shown_at        TIMESTAMP
duration_ms     INT -- How long visible

created_at      TIMESTAMP

INDEX(campaign_id)
INDEX(motorista_id)
INDEX(shown_at)
```

---

#### 11. **ScanEvent** (`scan_event`)
QR code scanned by passenger.

```sql
id              CUID
company_id      CUID [FK]
campaign_id     CUID [FK]
motorista_id    CUID [FK]
device_id       CUID [nullable, FK]
session_id      CUID [nullable, FK]

scanned_at      TIMESTAMP

-- Unique Visitor Detection (no PII stored)
visitor_hash    VARCHAR(64) -- SHA256(ip + user-agent + date)
is_unique       BOOLEAN -- First scan by this visitor on this campaign

-- Device Info
user_device     VARCHAR(500) [nullable]
ip_address      VARCHAR(50) [nullable]
referrer        VARCHAR(500) [nullable]
latitude        FLOAT [nullable]
longitude       FLOAT [nullable]

created_at      TIMESTAMP

INDEX(campaign_id)
INDEX(scanned_at)
INDEX(visitor_hash)
INDEX([campaign_id, visitor_hash])
```

---

### Payment & Commission Models

#### 12. **DriverEarning** (`driver_earning`)
Commission ledger: one row per lead converted.

```sql
id              CUID
motorista_id    CUID [FK]
company_id      CUID [FK]
lead_id         CUID [nullable, FK]

-- Amount & Rate (immutable at creation)
amount          DECIMAL(12,2) -- Calculated once, never recalculated
commission_rate DECIMAL(5,4) -- 0.3000 = 30% (recorded for audit)
status          ENUM -- PENDING, PAID, CANCELLED

-- Description
description     VARCHAR(255) [nullable]

-- Manual Payout (PIX)
paid_at         TIMESTAMP [nullable]
payout_ref      VARCHAR(120) [nullable] -- Prova/E2E do PIX
paid_by         CUID [nullable] -- User who marked as paid

created_at      TIMESTAMP
updated_at      TIMESTAMP

-- **Critical**: amount is immutable. Changing commission rate doesn't affect old earnings.
-- Motorista.total_earnings is cache; true balance = SUM(DriverEarning.PENDING).

INDEX([motorista_id, status])
INDEX(created_at)
```

**Status Flow:**
```
PENDING  --[payout manually triggered]--> PAID
       ↓
    CANCELLED (lead refunded or voided)
```

---

#### 13. **CompanyCreditTx** (`company_credit_tx`)
Company pre-paid balance ledger.

```sql
id              CUID
company_id      CUID [FK]

type            ENUM -- DEPOSIT, CAMPAIGN_DEBIT, LEAD_PAYOUT, REFUND, ADJUSTMENT
amount          DECIMAL(12,2)

-- Reference
campaign_id     CUID [nullable, FK]
lead_id         CUID [nullable, FK]

-- Idempotence
mercadopago_id  VARCHAR(255) [UNIQUE, nullable] -- Webhook dedup

metadata        JSON [nullable] -- Extra data
description     VARCHAR(255) [nullable]

-- Snapshot after transaction
balance_after   DECIMAL(12,2)

created_at      TIMESTAMP [immutable]

INDEX(type)
INDEX(created_at)
```

**Type Meaning:**
- `DEPOSIT` — Company recharged balance (Mercado Pago payment)
- `CAMPAIGN_DEBIT` — Campaign created, pre-paid balance reserved
- `LEAD_PAYOUT` — Lead converted, 30% of value deducted
- `REFUND` — Lead cancelled, balance restored
- `ADJUSTMENT` — Admin manual correction

---

#### 14. **Payment** (`payment`)
Periodic payout to motorista (legacy; mostly replaced by DriverEarning).

```sql
id              CUID
company_id      CUID [FK]
motorista_id    CUID [FK]
campaign_id     CUID [nullable, FK]

amount          DECIMAL(12,2)
payment_type    ENUM -- FIXED, PER_LEAD, HYBRID
status          ENUM -- PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED

period_start    DATE
period_end      DATE
leads_count     INT

-- Gateway
external_id     VARCHAR(255) [nullable] -- Payment ID from gateway
paid_at         TIMESTAMP [nullable]
rejected_reason TEXT [nullable]

created_at      TIMESTAMP
updated_at      TIMESTAMP

INDEX([motorista_id, status])
```

---

#### 15. **DriverBankAccount** (`driver_bank_account`)
Bank account for manual PIX transfers.

```sql
id              CUID
motorista_id    CUID [UNIQUE, FK]
company_id      CUID [FK]

-- Account Data (encrypted in prod)
cpf             VARCHAR(14)
bank_code       VARCHAR(3) -- "001" Banco do Brasil, "033" Santander
agency          VARCHAR(10)
account         VARCHAR(20)
account_type    VARCHAR(20) -- CHECKING, SAVINGS
holder_name     VARCHAR(255)

status          ENUM -- PENDING_VERIFICATION, VERIFIED, BLOCKED

-- Mercado Pago Reference
mercadopago_id  VARCHAR(255) [nullable]
verified_at     TIMESTAMP [nullable]

created_at      TIMESTAMP
updated_at      TIMESTAMP

INDEX(status)
```

---

### Audit & Review Models

#### 16. **AuditLog** (`audit_log`)
Compliance: track all sensitive actions.

```sql
id              CUID
company_id      CUID [FK]
user_id         CUID [FK]

action          ENUM -- CREATE, UPDATE, DELETE, VIEW, LOGIN, LOGOUT, PAYMENT
resource_type   VARCHAR(100) -- "Campaign", "DriverEarning", etc
resource_id     VARCHAR(255)

old_values      JSON [nullable]
new_values      JSON [nullable]
description     TEXT [nullable]

ip_address      VARCHAR(50) [nullable]
user_agent      VARCHAR(500) [nullable]

created_at      TIMESTAMP [immutable]

INDEX(action)
INDEX([company_id, created_at])
```

---

#### 17. **CampaignReview** (`campaign_review`)
Driver feedback on completed campaigns.

```sql
id              CUID
campaign_id     CUID [FK]
motorista_id    CUID [FK]

rating          ENUM -- ONE, TWO, THREE, FOUR, FIVE
comment         TEXT [nullable]

created_at      TIMESTAMP
updated_at      TIMESTAMP

UNIQUE(campaign_id, motorista_id)
```

---

## Enums Reference

### UserType
```
MOTORISTA   -- Driver
ANUNCIANTE  -- Advertiser
ADMIN       -- Platform admin
```

### MotoristStatus
```
ATIVO       -- Has active tablet
INATIVO     -- No active tablet
SUSPENSO    -- Account suspended
```

### CampaignStatus
```
DRAFT       -- Not published
ACTIVE      -- Running
PAUSED      -- Temporarily stopped
COMPLETED   -- Ended (reached end_date)
CANCELLED   -- Aborted
```

### LeadStatus
```
PENDING     -- Scanned, not converted yet
CONVERTED   -- Completed action, earning awarded
INVALID     -- Fraud/spam
```

### PaymentStatus
```
PENDING     -- Awaiting payout
PROCESSING  -- In transit
COMPLETED   -- Delivered
FAILED      -- Error
REFUNDED    -- Reversed
```

### DriverEarningStatus
```
PENDING     -- In wallet, awaiting manual PIX
PAID        -- Transferred to bank account
CANCELLED   -- Lead refunded or voided
```

### RideApp
```
UBER, NOVENOVE (99), INDRIVE, CABIFY, BLABLACAR, TAXI, OUTRO
```

### RideCategory
```
-- Uber
UBER_X, UBER_COMFORT, UBER_BLACK, UBER_MOTO, UBER_FLASH_MOTO

-- 99
NOVENOVE_POP, NOVENOVE_COMFORT, NOVENOVE_MOTO, NOVENOVE_ENTREGA

-- inDrive
INDRIVE_ECONOMY, INDRIVE_COMFORT

-- Cabify
CABIFY_LITE, CABIFY_EXECUTIVO

-- BlaBlaCar
BLABLACAR_CARONA

-- Táxi
TAXI_COMUM, TAXI_EXECUTIVO
```

### Region
```
NORTE, NORDESTE, CENTRO_OESTE, SUDESTE, SUL
```

### DeviceStatus
```
PENDING_PAIRING -- Waiting for driver to scan pairing code
ACTIVE          -- Paired and operational
BLOCKED         -- Admin disabled
```

### QrPosition
```
TOP_LEFT, TOP_CENTER, TOP_RIGHT,
MIDDLE_LEFT, CENTER, MIDDLE_RIGHT,
BOTTOM_LEFT, BOTTOM_CENTER, BOTTOM_RIGHT
```

---

## Key Business Rules

### 1. Commission (Never Recalculated)
```typescript
// When lead converts:
const commission_rate = 0.30; // Immutable snapshot
const amount = conversion_value * commission_rate;
// Store both in DriverEarning; NEVER recalculate if rate changes
```

**Why:** If commission changes from 30% → 35% in future, old leads keep 30%.

### 2. Motorista Status Flow
```
INATIVO (signup) → ATIVO (tablet paired) → SUSPENSO (admin block) → INATIVO (unpair)
```

### 3. Balance Source of Truth
```
MotoristProfile.total_earnings          = cache (historical sum)
SUM(DriverEarning WHERE status=PENDING) = actual wallet balance
```

Use the latter for deciding "how much to pay."

### 4. Campaign Quota
```
Company has pre-paid credit balance
Campaign.create() reserves total_investment upfront
Lead.convert() deducts 30% of conversion_value
Remaining budget = balance - reserved - deducted
```

### 5. Soft Deletes
All main entities have `deleted_at`:
- `NULL` = active
- `TIMESTAMP` = logically deleted (still in DB for audit)

Query active records: `WHERE deleted_at IS NULL`

---

## Indexes Strategy

**High-Volume Queries:**
- `Lead.campaign_id, status, qr_scan_time` — Analytics dashboards
- `ScanEvent.campaign_id, visitor_hash` — Unique visitor detection
- `DriverEarning.motorista_id, status` — Wallet balance
- `ImpressionEvent.shown_at` — Session replay
- `MotoristProfile.state, region, city` — Segmentation

**Unique Constraints:**
- `(company_id, email)` on User — No duplicate emails per company
- `(campaign_id, motorista_id)` on CampaignMotorista — One link per driver+campaign
- `(campaign_id, motorista_id)` on CampaignReview — One review per driver+campaign
- `qr_code_data` on Campaign — QR uniqueness

---

## Migrations

Located in `prisma/migrations/`:
1. `001_initial_schema.sql` — All 32 models, relations, indexes
2. `20260728_tablet_scan_targeting` — Segmentation arrays
3. `20260728b_pairing_code_nullable` — Post-pairing nullification
4. `20260728c_banner_qr_opcoes` — QR position options
5. `20260728d_driver_removed` — DRIVER_REMOVED enum state
6. `20260728e_jornadas` — TabletSession model

To apply:
```bash
npm run db:migrate:dev      # With prompts
npm run db:migrate          # Production (silent)
npm run db:migrate:reset    # Dangerous: wipe + recreate
```

---

## Local Development Setup

### 1. Start PostgreSQL
```bash
docker compose up -d
# Creates: fastlead_db (dev), fastlead_test_db (tests)
```

### 2. Setup Dev Database
```bash
npm run db:dev
# Runs: prisma migrate deploy && npm run db:seed:realistic
# Results: 100 motoristas, 50 campanhas, 1000 leads
```

### 3. Verify
```bash
npm run db:studio
# Opens Prisma Studio at http://localhost:5555
# Browse all tables, run queries
```

### 4. Test Database (isolated)
```bash
# Before running tests:
DATABASE_URL=$DATABASE_TEST_URL npm run db:test
# Then: npm run test:unit
```

---

## Production Database

On Railway:
```
DATABASE_URL=postgresql://user:pass@fastlead-pg.railway.app:5432/railway
```

**Before any production change:**
1. Create backup: `pg_dump $DATABASE_URL > backup.sql`
2. Test migration locally: `npm run db:migrate:dev`
3. Run on production: `npm run db:migrate` (from Railway console)
4. Verify: Connect and query sample tables

