# FastLEAD Data Flow & Business Processes

## Overview

FastLEAD is a **three-way marketplace**:
- **Anunciantes** (Advertisers) — Buy leads via QR codes on ride-share tablets
- **Motoristas** (Drivers) — Display ads, earn commission per converted lead
- **FastLEAD** (Platform) — Manages campaigns, tablets, and commission payouts

---

## Flow 1: Advertiser Campaign → QR → Lead

### Phase 1: Campaign Creation

**Actor:** Anunciante (advertiser)  
**Precondition:** Account has credit balance

```
1. Anunciante logs in
   └─ User (type=ANUNCIANTE) finds AnuncianteProfile

2. Creates campaign
   POST /campaigns
   ├─ Body: title, image_url, qr_code_data, price_per_lead, target_regions, etc
   └─ Response: campaign_id

3. System validates & creates
   Campaign record:
   ├─ status = DRAFT
   ├─ start_date, end_date set
   ├─ qr_code_data = UNIQUE (no two campaigns with same QR)
   └─ Generates QR image (base64 SVG)

4. System reserves credit
   CompanyCreditTx (type=CAMPAIGN_DEBIT):
   ├─ amount = campaign.total_investment
   ├─ company.credit_balance -= amount
   └─ Locks budget until campaign ends or is cancelled
```

**Data State After:**
- `Campaign.status` = DRAFT (not yet on tablets)
- `Company.credit_balance` -= total_investment (reserved)
- `CompanyCreditTx` created (audit trail)

---

### Phase 2: Campaign Goes Live

**Actor:** FastLEAD admin  
**Trigger:** Anunciante activates campaign or scheduled start_date arrives

```
1. Campaign status → ACTIVE
   ├─ Visible to motoristas in marketplace
   └─ Tablets show ad rotation (if motorista accepts)

2. Motorista sees campaign in marketplace
   POST /campaigns/{campaign_id}/accept
   ├─ Creates CampaignMotorista (source=DRIVER_ACCEPTED)
   └─ Tablet rotation updated

3. Tablet displays ad
   ├─ ImpressionEvent created (showed_at, duration_ms)
   ├─ Campaign.total_impressions += 1
   └─ Driver sees: "Offer scans from 3 campaigns today"
```

**Data State After:**
- `Campaign.status` = ACTIVE
- `CampaignMotorista.status` = ACTIVE (driver opted in)
- `ImpressionEvent` recorded (metrics)

---

### Phase 3: Passenger Scans QR

**Actor:** Passenger (anonymous)  
**Trigger:** Points phone at tablet QR code

```
1. Tablet camera detects QR
   Tablet (browser-based React app):
   ├─ POST /scans (campaign_id, device_token, location, user_agent)
   └─ Backend creates ScanEvent

2. ScanEvent created:
   ├─ scanned_at = NOW()
   ├─ visitor_hash = SHA256(ip + user-agent + date)
   ├─ is_unique = visitor_hash NOT IN (previous scans on this campaign)
   └─ Campaign.unique_scans += 1

3. Passenger redirected
   ├─ destination_url = campaign.destination_url OR FastLEAD landing
   ├─ If destination_url: external site gets traffic
   ├─ If NULL: FastLEAD landing form (capture email, phone)
   └─ Landing page is tracked via referer
```

**Data State After:**
- `ScanEvent` created (visitor_hash, is_unique)
- `Campaign.total_impressions += 1`
- `Campaign.unique_scans += 1` (if first time visitor)

---

### Phase 4: Lead Conversion

**Actor:** Passenger (fills landing form or external site)  
**Trigger:** Completion of action (form submit, purchase confirmation webhook, etc)

#### Case A: FastLEAD Landing Page

```
1. Passenger fills form
   ├─ contact_name (required)
   ├─ contact_email (required)
   ├─ contact_phone (optional)
   └─ Form submits

2. Backend creates Lead
   POST /leads
   {
     campaign_id,
     motorista_id,
     scan_event_id,  // Link to original scan
     contact_name, contact_email, contact_phone,
     status: "PENDING"
   }

3. Lead created
   ├─ status = PENDING (waiting for confirmation)
   ├─ conversion_value = NULL (not yet confirmed)
   └─ DriverEarning NOT created yet

4. Optionally: Backend notifies anunciante
   ├─ Webhook to anunciante.destination_url
   ├─ Body: { lead_id, contact_name, contact_email, contact_phone }
   └─ Anunciante confirms lead is valid
```

**Data State After:**
- `Lead.status` = PENDING
- `Lead.conversion_value` = NULL
- No earning yet

---

#### Case B: External Site (Anunciante's Landing)

```
1. Passenger goes to anunciante.destination_url
   └─ (E.g., "pizzariadelight.com.br?ref=fastlead_campaign_123")

2. Passenger completes action
   ├─ Purchases pizza (external)
   ├─ OR signs up for gym membership
   └─ OR books clinic appointment

3. Anunciante confirms lead value
   POST /leads/{scan_event_id}/convert
   {
     conversion_value: 100.00,  // R$ 100 sale price
     contact_name, contact_email, contact_phone
   }

4. Backend creates Lead + DriverEarning
   Lead:
   ├─ status = CONVERTED (confirmed by anunciante)
   ├─ conversion_value = 100.00
   └─ converted_at = NOW()

   DriverEarning:
   ├─ motorista_id = scan's driver
   ├─ amount = 100.00 * 0.30 = 30.00  // 30% commission
   ├─ commission_rate = 0.3000 (immutable snapshot)
   ├─ status = PENDING
   └─ lead_id = created lead
```

**Data State After:**
- `Lead.status` = CONVERTED
- `Lead.conversion_value` = 100.00
- `DriverEarning` created: amount=30.00, status=PENDING
- `Campaign.conversions += 1`

---

### Phase 5: Deduct from Company Credit

**Actor:** System (async, or immediate)

```
1. When Lead converts:
   CompanyCreditTx (type=LEAD_PAYOUT):
   ├─ amount = -30.00  (negative = debit)
   ├─ lead_id = lead_id
   ├─ company.credit_balance -= 30.00
   ├─ balance_after = new balance
   └─ Audit trail complete

2. If balance goes negative:
   ├─ Log alert
   ├─ Campaign auto-paused (optional policy)
   └─ Anunciante notified: "Insufficient credit"

3. Example balance flow:
   Start:           50000.00
   Campaign debit: -5000.00  (reserved)
   Lead payout:    -  30.00  (actual charge)
   End:            44970.00
```

---

## Flow 2: Driver Pairing → Active → Earning

### Phase 1: Driver Registration

**Actor:** Motorista (driver)  
**Trigger:** Signup form

```
1. Driver signs up
   POST /auth/signup
   ├─ email, password, name, phone
   └─ Creates User (type=MOTORISTA)

2. System creates MotoristProfile
   ├─ status = INATIVO (no tablet yet)
   ├─ ride_apps = [UBER, NOVENOVE]  (driver selects)
   ├─ ride_categories = [UBER_X, NOVENOVE_POP]
   ├─ city, state, region = extracted/entered
   └─ rating = 5.0 (default)

3. Driver completes profile
   ├─ CPF (for payout verification)
   ├─ Vehicle info
   ├─ License plate
   └─ Bank account (DriverBankAccount)
```

**Data State After:**
- `User.type` = MOTORISTA
- `MotoristProfile.status` = INATIVO
- `DriverBankAccount.status` = PENDING_VERIFICATION

---

### Phase 2: Tablet Pairing

**Actor 1:** FastLEAD admin  
**Actor 2:** Motorista (driver)

```
1. Admin generates pairing code
   POST /tablets/generate-pairing
   ├─ Creates TabletDevice
   ├─ Generates 6-digit pairing_code
   ├─ pairing_expires_at = NOW() + 30min
   ├─ status = PENDING_PAIRING
   └─ Returns code to admin (or prints label)

2. Admin gives code to driver
   "Your tablet code is: 123456"
   └─ Code is valid for 30 minutes

3. Driver logs into tablet (React app)
   ├─ Enters pairing code
   └─ POST /tablets/pair (pairing_code)

4. Backend validates & pairs
   TabletDevice:
   ├─ motorista_id = driver's profile
   ├─ device_token = generated unique token
   ├─ pairing_code = NULL (cleared after pairing)
   ├─ status = ACTIVE
   ├─ paired_at = NOW()
   └─ last_seen_at = NOW()

5. Driver profile updated
   MotoristProfile.status = ATIVO (now has active tablet)

6. Tablet now shows campaigns
   ├─ Fetches campaigns driver accepted
   ├─ Auto-rotation begins
   └─ Impressions logged
```

**Data State After:**
- `TabletDevice.status` = ACTIVE
- `TabletDevice.motorista_id` = driver's ID
- `MotoristProfile.status` = ATIVO
- Tablet shows: "Live in X cities, Y offers available"

---

### Phase 3: Tablet Session (Day in Life)

**Actor:** Driver & Tablet

```
1. Driver starts tablet (morning)
   ├─ Bluetooth/WiFi connects
   ├─ App fetches assigned campaigns
   └─ Creates TabletSession
       ├─ started_at = NOW()
       ├─ ended_at = NULL
       └─ Device rotates ads every 10-30 sec

2. Throughout day:
   ├─ ImpressionEvent logged per ad shown
   ├─ ScanEvent logged when passenger scans
   ├─ Driver sees in app: "3 scans today, 1 converted"
   └─ Real-time earnings: "+R$ 30.00"

3. Driver closes tablet (evening)
   PUT /sessions/{session_id}/end
   ├─ TabletSession.ended_at = NOW()
   ├─ Snapshot impressions, scans, leads (cache)
   └─ Session closed

4. Example session:
   started_at: 08:00
   ended_at:   18:00
   impressions_count: 450 (campaign rotations)
   scans_count: 23 (QRs scanned by passengers)
   unique_scans: 18 (unique visitors)
   leads_count: 15 (filled forms/purchases)
```

---

## Flow 3: Earning → Payout (Manual PIX)

### Phase 1: Earning Accumulates

**Source:** DriverEarning records created as leads convert

```
MotoristProfile.total_earnings (cache):
├─ Day 1: 2 leads converted × 30 = +60 → balance 60
├─ Day 2: 1 lead converted × 30 = +30 → balance 90
└─ Day 3: 3 leads converted × 30 = +90 → balance 180

Query for actual balance:
SELECT SUM(amount) FROM driver_earning
WHERE motorista_id = ? AND status = 'PENDING'
-- Returns: 180.00 (current wallet)
```

**Important:**
- `MotoristProfile.total_earnings` = historical cache (never decreases)
- Real balance = SUM(PENDING earnings) (what to actually pay)

---

### Phase 2: Driver Requests Withdrawal

**Actor:** Motorista (driver)  
**Trigger:** Click "Request Payout" in app

```
1. Driver clicks "Request Payout"
   ├─ Sees pending balance: R$ 180.00
   ├─ Confirms bank account on file
   └─ Clicks "Send to my bank"

2. Request created
   POST /wallet/request-payout
   ├─ Validates balance >= minimum (e.g., R$ 100)
   ├─ Checks DriverBankAccount.status == VERIFIED
   ├─ Creates Payment record (legacy, optional)
   └─ Notifies admin: "Driver João Silva requesting R$ 180.00"

3. Driver sees
   ├─ Status: "Payout pending approval"
   ├─ Admin has 1-2 business days to process
   └─ Can check history of past payouts
```

---

### Phase 3: Admin Approves & Pays (Manual PIX)

**Actor:** FastLEAD admin  
**Trigger:** Admin approves in dashboard

```
1. Admin reviews payout request
   ├─ Driver bank account verified
   ├─ Balance matches
   └─ Approves

2. Admin executes manual PIX transfer
   ├─ Opens Mercado Pago/Banco do Brasil
   ├─ Enters driver's account details
   ├─ Transfers R$ 180.00 to driver's bank
   ├─ Gets E2E confirmation number (comprovante)
   └─ CRITICAL: Must save payout_ref

3. Admin marks earnings as PAID
   PATCH /earnings/{earning_id}/mark-paid
   {
     payout_ref: "pix.12345abc"  // E2E number
   }

   Or bulk (all driver's PENDING):
   PATCH /drivers/{motorista_id}/payouts
   {
     payout_refs: {
       earning_id_1: "pix.111",
       earning_id_2: "pix.222"
     }
   }

4. Backend updates DriverEarning
   ├─ status = PAID
   ├─ paid_at = NOW()
   ├─ payout_ref = "pix.12345abc"
   ├─ paid_by = admin_user_id
   └─ MotoristProfile.total_earnings unchanged (cache)

5. Driver sees
   ├─ Wallet now shows: "R$ 0.00 pending"
   ├─ History shows: "R$ 180.00 paid on 2026-08-13 (Pix: ...abc)"
   ├─ Can verify PIX in own bank statement
   └─ Trust restored
```

---

### Phase 4: Refund / Cancellation

**Trigger:** Lead disputed, refund granted

```
1. Admin marks lead as INVALID or cancels it
   PATCH /leads/{lead_id}
   { status: "INVALID" }

2. System cascades:
   DriverEarning:
   ├─ status = CANCELLED (not deleted, audit trail)
   ├─ marked manually by admin
   └─ Removed from wallet calculation

   CompanyCreditTx (type=REFUND):
   ├─ amount = +30.00 (credit back)
   ├─ company.credit_balance += 30.00
   └─ Audit trail: "Lead 123 refunded"

3. Driver sees
   ├─ Wallet drops by 30
   └─ Can see in history: "Earning cancelled (lead disputed)"
```

---

## Flow 4: Hybrid Curation (Driver + Admin)

### Scenario: Driver Accepts + Admin Can Override

```
State Diagram:

Driver Action:
  DRIVER_ACCEPTED  → Driver opted in via marketplace
  DRIVER_REMOVED   → Driver removed from tablet settings

Admin Action:
  MASTER_FORCED    → Admin pushed to driver (overrides removal)
  MASTER_BLOCKED   → Admin excluded driver (blocks new assignments)

Rules:
1. Driver can accept any campaign
   → CampaignMotorista (source=DRIVER_ACCEPTED, status=ACTIVE)

2. Driver can remove any campaign from tablet
   → source = DRIVER_REMOVED (keeps record, stops rotation)
   → Can re-accept later

3. Admin can force campaign to driver
   → source = MASTER_FORCED (override removal)
   → Driver sees it in rotation even if removed

4. Admin can block driver from campaign
   → source = MASTER_BLOCKED (prevents re-acceptance)
   → Driver cannot opt back in

Priority on Tablet Rotation:
├─ MASTER_FORCED (highest priority, admin override)
├─ DRIVER_ACCEPTED (normal marketplace)
└─ MASTER_BLOCKED (hidden, never shown)
```

---

## Key Data Moments (Temporal)

| Model | Key Timestamp | Meaning |
|-------|---|---|
| User | last_login_at | Last auth success |
| MotoristProfile | last_online_at | Tablet last pinged |
| TabletDevice | paired_at | When driver paired tablet |
| TabletDevice | last_seen_at | Tablet last connected |
| TabletSession | started_at / ended_at | Work hours |
| ImpressionEvent | shown_at | Ad display time |
| ScanEvent | scanned_at | QR scan time |
| Lead | qr_scan_time | Original scan (before conversion) |
| Lead | converted_at | When anunciante confirmed |
| DriverEarning | created_at | When earning recorded |
| DriverEarning | paid_at | When admin executed payout |
| DriverBankAccount | verified_at | When account validated |
| Campaign | start_date / end_date | Campaign lifecycle |

---

## Critical Integrity Rules

### 1. No Double-Earning
```
One Lead → One DriverEarning (or none if not converted)
- lead_id has UNIQUE constraint on driver_earning
- Prevents accidental duplicate payouts
```

### 2. Immutable Commission Rate
```
DriverEarning.commission_rate = snapshot at creation
- If company changes rate from 30% → 35% later
- Old earnings keep 30%, new earnings get 35%
- Amount is calculated once, NEVER recalculated
```

### 3. Balance Source of Truth
```
Actual wallet = SUM(DriverEarning WHERE status='PENDING')
- NOT MotoristProfile.total_earnings (which is cache)
- Use SUM() for payout calculations
```

### 4. Credit Pre-Reservation
```
Campaign.create() immediately reserves Company.credit_balance
- Prevents overbooking
- Lead conversion is debit from reservation (not net new debit)
- Refund restores balance
```

### 5. Soft-Delete Audit Trail
```
No hard deletes of data
- Queries default to: WHERE deleted_at IS NULL
- Deleted records still exist for compliance
- Audit logs show all changes
```

---

## Example Scenario: Complete Flow (5-Minute Snapshot)

```
TIME: 14:30 - Motorista João's Shift

14:30 - João logs into tablet
├─ TabletSession created (started_at: 14:30)
├─ Rotation begins: Pizzaria, Gym, Clinic ads

14:32 - Passenger in taxi sees Pizzaria ad
├─ ImpressionEvent created (duration: 23sec)
└─ Campaign.total_impressions += 1

14:35 - Same passenger scans Pizzaria QR
├─ ScanEvent created
├─ Redirected to: pizzariadelight.com.br?ref=fastlead_campaign_123
├─ visitor_hash = SHA256(ip + ua + 20260813)
└─ is_unique = true (first scan by this phone today)

14:36 - Passenger buys pizza (R$ 80)
├─ Pizzaria verifies lead
├─ POST /leads/convert
│  {
│    scan_event_id: xxx,
│    conversion_value: 80.00,
│    contact_name: "Pedro Silva"
│  }

14:36 - Backend creates Lead + Earning
├─ Lead: status=CONVERTED, conversion_value=80
├─ DriverEarning: amount=24.00 (30% of 80), status=PENDING
├─ Campaign.conversions += 1
├─ CompanyCreditTx (LEAD_PAYOUT, -24.00)
└─ João sees in tablet: "+R$ 24.00" ✨

14:40 - João sees 5 more scans, no conversions yet
├─ All ScanEvents logged
├─ Tablet rotates through offers
└─ João's pending balance: +R$ 24.00

15:30 - João stops tablet
├─ TabletSession.ended_at = 15:30
├─ Snapshot: 150 impressions, 12 scans, 5 leads, 1 conversion
└─ João clocks out
```

---

## Testing the Flows

To validate in development:

```bash
# 1. Setup realistic seed
npm run db:dev
# ✅ 100 motoristas, 50 campanhas, 1000 leads

# 2. Manual testing
npm run dev
# Create campaign → Accept as driver → Scan QR → Convert lead

# 3. Automated tests (Phase 2)
npm run test:unit
# Tests for commission calc, payment flow, earning ledger

# 4. E2E tests (Phase 3)
npm run test:e2e
# Full flow: signup → pair tablet → scan → convert → payout
```

