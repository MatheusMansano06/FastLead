# Admin Dashboard Testing Guide

**Quick Start:** 5 minutes to test everything

---

## Prerequisites

- [ ] Docker running (PostgreSQL)
- [ ] Backend running on `http://localhost:3000`
- [ ] Frontend running on `http://localhost:5173`
- [ ] Realistic seed data populated (`npm run db:dev` from Phase 1)

---

## Step 1: Start Services

### Terminal 1 — Backend
```bash
npm run dev
# Output: Server running on http://localhost:3000
```

### Terminal 2 — Frontend
```bash
cd frontend
npm run dev
# Output: Local: http://localhost:5173
```

### Terminal 3 — Optional: Prisma Studio (Browse DB)
```bash
npm run db:studio
# Opens http://localhost:5555
```

---

## Step 2: Login as Admin

1. Open http://localhost:5173
2. Click "Entrar como Empresa" → use test account:
   - **Email:** `admin@fastlead.com.br`
   - **Password:** `admin123`
3. Login should redirect to home
4. (We'll add direct /admin link soon, manually navigate to /admin for now)

---

## Step 3: Test Admin Dashboard

### Route: `/admin`

**Expected:**
- KPI cards visible: Companies (50), Motoristas (100), Campanhas (50), Tablets (50)
- 14-day funnel with data
- Conversion rate progress bars (should show >0%)
- 4 quick action buttons at bottom

**Data Should Come From:**
- 100 motoristas in seed
- 50 campanhas in seed
- 1000 leads in seed
- 2000+ scan events in seed

---

## Step 4: Test Companies Page

### Route: `/admin/companies`

**Expected:**
- Table with 50 companies per page
- Columns: Company, Contact, Budget, Spent, Leads, Action button
- Each row clickable or click "Ver" button
- Pagination at bottom (1→1 page since only ~50 companies)

**Test Pagination:**
- If >50 companies, click next → should load page 2

---

## Step 5: Test Company Detail

### Route: `/admin/companies/:id`

Click any company → should show:

#### Tab 1: Overview
- 4 KPI cards (Campanhas, Leads, Conversões, Orçamento)
- 3 detail sections: Contact info, Financial summary, Earnings summary
- Company name + industry + contact email

#### Tab 2: Campaigns
- List of campanhas for that company
- Title, dates, investment amount
- Status (DRAFT, ACTIVE, etc)

#### Tab 3: Financial
- Table of credit transactions
- Columns: Type, Description, Amount, Balance, Date
- Should show CREDIT/DEBIT entries in chronological order

#### Tab 4: Leads
- Table of all leads for company
- Columns: Status, Name, Phone, Email, Campaign, Motorista, Date
- Status colored: green=CONVERTED, yellow=PENDING, red=INVALID

---

## Step 6: Test Drivers Page

### Route: `/admin/drivers`

**Expected:**
- Table with all 100 motoristas (50 per page)
- Columns: Name, Email, City, Apps (UBER/MOTO/99), Rating, Earnings, Status, Action
- Status badges: ATIVO=green, SUSPENSO=red
- Average rating displayed in header

**Test Data:**
- 100 motoristas from seed
- Mix of regions (SP, RJ, MG, RS, BA)
- Various ride apps
- Ratings between 4.0-5.0

---

## Step 7: Test Driver Detail

### Route: `/admin/drivers/:id`

Click any driver → should show:

#### KPI Cards
- Ganhos Totais (from total_earnings)
- Pendentes (PENDING earnings sum)
- Horas Trabalhadas (sum of session durations)
- Leads (count of leads where motorista_id = id)

#### Tab 1: Overview
- 3 sections:
  1. **Informações:** Cidade, Region, Apps, Categorias
  2. **Desempenho:** Conversion rate bar chart, unique leads, scans, earnings/lead
  3. **Métricas:** Sessions count, hours, total scans

#### Tab 2: Earnings
- Table of 10 latest earnings
- Columns: Valor, Taxa, Campanha, Status, Data
- PENDING/PAID status badges

#### Tab 3: Sessions
- Table of 10 latest TabletSessions
- Columns: Device, Start, End, Duration, Scans
- Duration calculated as (end - start) in minutes

#### Tab 4: Actions
- If status = ATIVO:
  - Text area for "Motivo da suspensão"
  - Red "Confirmar Suspensão" button
- If status = SUSPENSO:
  - Message + green "Ativar Motorista" button

---

## Step 8: Test Suspend/Activate

### Suspend Driver
1. Go to driver detail
2. Click "Ações" tab
3. Type reason: "Testing suspension"
4. Click "Confirmar Suspensão"
5. Should show alert "Motorista suspenso com sucesso"
6. Driver status should change to SUSPENSO
7. Tab should now show activate button

### Activate Driver
1. Click "Ativar Motorista"
2. Should show alert "Motorista ativado com sucesso"
3. Status back to ATIVO
4. Suspend section returns

### Verify Audit Log
```bash
# In Terminal with Prisma Studio open
# Go to AuditLog table
# Should see 2 new entries:
# 1. resource_type=MotoristaProfile, action=UPDATE, new_values={status:SUSPENSO}
# 2. resource_type=MotoristaProfile, action=UPDATE, new_values={status:ATIVO}
```

---

## Step 9: API Testing (cURL)

Get your token first:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fastlead.com.br","password":"admin123"}' \
  | jq '.data.token'
# Save token as $TOKEN
```

### Test Overview
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/overview
# Should return: totals, funnel, rates
```

### Test Company Detail
```bash
# First, get a company ID from the table (use db:studio or list companies)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/companies/{company-id}
# Should return: company data, campaigns, credit history
```

### Test Driver Detail
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/drivers/{driver-id}
# Should return: driver data, metrics, earnings summary
```

### Test Driver Stats
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/admin/drivers/{driver-id}/stats
# Should return: totalEarnings, pendingEarnings, rating, stats object
```

### Test Company Leads (Filtered)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/admin/companies/{company-id}/leads?status=CONVERTED&page=1"
# Should return: paginated leads array
```

### Test Suspend Driver
```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Testing API"}' \
  http://localhost:3000/admin/drivers/{driver-id}/suspend
# Should return: {status: "suspended"}
```

---

## Step 10: Data Verification

### Check Seed Data Loaded
```bash
# In Prisma Studio or psql:
SELECT COUNT(*) FROM "MotoristProfile" WHERE deleted_at IS NULL;
-- Expected: 100

SELECT COUNT(*) FROM "Campaign" WHERE deleted_at IS NULL;
-- Expected: 50

SELECT COUNT(*) FROM "Lead" WHERE deleted_at IS NULL;
-- Expected: ~1000

SELECT COUNT(*) FROM "ScanEvent";
-- Expected: 2000+

SELECT COUNT(*) FROM "DriverEarning" WHERE deleted_at IS NULL;
-- Expected: ~300
```

### Check Financial Transactions
```bash
SELECT COUNT(*) FROM "CompanyCreditTx";
-- Expected: Some entries (depends on seed)
```

### Check Audit Logs
```bash
SELECT COUNT(*) FROM "AuditLog" WHERE resource_type = 'MotoristaProfile';
-- Expected: Increases as you suspend/activate drivers
```

---

## Common Issues & Fixes

### Issue: "Acesso Negado"
**Cause:** Not logged in as ADMIN  
**Fix:** Use `admin@fastlead.com.br` / `admin123`

### Issue: Empty tables
**Cause:** Seed data not loaded  
**Fix:** Run `npm run db:dev` to populate database

### Issue: "Motorista não encontrado"
**Cause:** Using invalid driver ID  
**Fix:** Copy ID from drivers list or use Prisma Studio to find valid IDs

### Issue: 404 errors on API
**Cause:** Backend not running  
**Fix:** Ensure `npm run dev` is running in Terminal 1

### Issue: 401 Unauthorized
**Cause:** Token expired or invalid  
**Fix:** Login again to get new token

### Issue: CORS errors
**Cause:** Frontend and backend not on correct ports  
**Fix:** Backend on 3000, Frontend on 5173

---

## Test Data Reference

### Test Admin Account
- **Email:** `admin@fastlead.com.br`
- **Password:** `admin123`
- **Type:** ADMIN
- **ID:** Found in seed, stored in database

### Sample IDs for Testing
Use Prisma Studio to find IDs:
1. Open http://localhost:5555
2. Go to MotoristProfile table
3. Copy an `id` value
4. Use in `/admin/drivers/{id}` routes

---

## Performance Baseline

### Expected Load Times
- `/admin` dashboard: <1s (pre-seeded data)
- Company list: <500ms (50 items per page)
- Company detail: <800ms (3 parallel queries)
- Driver list: <500ms (100 items per page)
- Driver detail: <1.5s (4 parallel queries + calculations)

If slower, check:
1. PostgreSQL connection speed
2. Network latency
3. Browser DevTools → Network tab for bottlenecks

---

## Browser DevTools Tips

### Network Tab
- Watch for API calls
- Check status codes (200, 400, 401, 404)
- Monitor response times
- Verify JSON structure

### Console Tab
- Should be clean (no red errors)
- Log any 404s or auth issues

### Application Tab
- Check localStorage for JWT token
- Verify authStore state

---

## Success Criteria ✅

- [x] Dashboard loads with correct KPIs
- [x] Companies table shows pagination
- [x] Company detail tabs work
- [x] Drivers table shows all drivers
- [x] Driver detail loads stats correctly
- [x] Suspend/activate buttons work
- [x] API returns correct JSON
- [x] Dates formatted in pt-BR
- [x] Currency formatted as BRL
- [x] No console errors
- [x] Navigation between pages works

---

## Next: Manual Testing Scenarios

### Scenario 1: Analyze Company Performance
1. Go to /admin/companies
2. Find high-performing company (many leads)
3. Click to detail
4. View: campaigns, leads (filter by CONVERTED), financial
5. Screenshot for documentation

### Scenario 2: Monitor Driver Activity
1. Go to /admin/drivers
2. Find driver with most hours worked
3. View detail → stats tab
4. Check: conversion rate, earnings, sessions
5. Verify numbers make sense

### Scenario 3: Manage Problematic Driver
1. Find driver with low rating
2. Go to detail → actions tab
3. Suspend with reason: "Low rating"
4. Verify status changed
5. Activate again
6. Check audit log shows 2 entries

### Scenario 4: Financial Review
1. Pick a company
2. Go to detail → financial tab
3. Review transactions (should see CREDIT/DEBIT)
4. Verify balance calculations
5. Check spent vs budget

---

## Bugs Found During Testing?

Document here:
```
Date: YYYY-MM-DD
Route: /admin/...
Issue: [description]
Steps to reproduce: [steps]
Expected: [expected behavior]
Actual: [actual behavior]
Screenshot: [link or attachment]
```

---

## Cleanup

When done testing:

### Stop Services
```bash
# Terminal 1: Ctrl+C
# Terminal 2: Ctrl+C
# Terminal 3: Ctrl+C
```

### Optional: Reset Database
```bash
npm run db:dev
# Wipes and reseeds with fresh data
```

---

**Ready to test?** 🚀  
Start with Step 1 and work through each step. Total time: ~15 minutes.
