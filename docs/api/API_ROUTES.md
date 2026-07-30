# FastLead API Routes Documentation

## Base URL
```
http://localhost:3000
```

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## PUBLIC ENDPOINTS

### Health Check
**GET** `/health`

Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 123.45,
  "environment": "development"
}
```

---

## AUTHENTICATION ENDPOINTS

### Register User
**POST** `/auth/register`

Register a new user (driver, advertiser, or admin).

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "type": "driver",
  "fullName": "João Silva",
  "companyId": "optional-company-id"
}
```

**Parameters:**
- `email` (string, required) - User email
- `password` (string, required) - Minimum 8 characters
- `type` (enum, required) - "driver", "advertiser", or "admin"
- `fullName` (string, optional) - User's full name
- `companyId` (string, optional) - Associated company

**Response (201):**
```json
{
  "message": "User registered successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_1234567890",
      "email": "user@example.com",
      "type": "driver",
      "companyId": null
    }
  }
}
```

### Login User
**POST** `/auth/login`

Authenticate and get access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_1234567890",
      "email": "user@example.com",
      "type": "driver",
      "companyId": null
    }
  }
}
```

### Refresh Token
**POST** `/auth/refresh`

Get a new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "message": "Token refreshed",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user_1234567890",
      "email": "user@example.com",
      "type": "driver",
      "companyId": null
    }
  }
}
```

### Logout
**POST** `/auth/logout`

Logout and blacklist refresh token.

**Headers:** Authorization required

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

### Get Current User
**GET** `/auth/me`

Get information about the authenticated user.

**Headers:** Authorization required

**Response (200):**
```json
{
  "data": {
    "id": "user_1234567890",
    "email": "user@example.com",
    "type": "driver",
    "fullName": "João Silva",
    "companyId": null
  }
}
```

---

## DRIVER ENDPOINTS

All driver endpoints require `type: "driver"` user.

### Get Driver Profile
**GET** `/driver/profile`

**Headers:** Authorization required

**Response (200):**
```json
{
  "message": "Driver profile retrieved",
  "data": {
    "id": "user_1234567890",
    "email": "driver@example.com",
    "type": "driver"
  }
}
```

### Get Driver Earnings
**GET** `/driver/earnings`

**Headers:** Authorization required

**Response (200):**
```json
{
  "message": "Earnings retrieved",
  "data": {
    "totalEarnings": 1250.50,
    "currentMonth": 350.25,
    "trips": 45
  }
}
```

### Update Driver Profile
**PUT** `/driver/profile`

**Headers:** Authorization required

**Request Body:**
```json
{
  "fullName": "João Silva Updated",
  "phone": "+5511999999999",
  "taxiPlate": "ABC-1234"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "data": {
    "id": "user_1234567890",
    "updated": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## ADVERTISER ENDPOINTS

All advertiser endpoints require `type: "advertiser"` user.

### Get Advertiser Profile
**GET** `/advertiser/profile`

**Headers:** Authorization required

**Response (200):**
```json
{
  "message": "Advertiser profile retrieved",
  "data": {
    "id": "user_1234567890",
    "email": "advertiser@example.com",
    "type": "advertiser"
  }
}
```

### List Campaigns
**GET** `/advertiser/campaigns`

**Headers:** Authorization required

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 10)

**Response (200):**
```json
{
  "message": "Campaigns retrieved",
  "data": {
    "campaigns": [
      {
        "id": "campaign_1234567890",
        "name": "Summer Sale",
        "budget": 5000,
        "startDate": "2024-01-20",
        "endDate": "2024-01-31",
        "status": "active"
      }
    ],
    "total": 1
  }
}
```

### Create Campaign
**POST** `/advertiser/campaigns`

**Headers:** Authorization required

**Request Body:**
```json
{
  "name": "Summer Sale 2024",
  "description": "Promotional campaign for summer sale",
  "budget": 5000,
  "startDate": "2024-01-20",
  "endDate": "2024-01-31",
  "targetAudience": ["driver"]
}
```

**Response (201):**
```json
{
  "message": "Campaign created successfully",
  "data": {
    "id": "campaign_1234567890",
    "created": "2024-01-15T10:30:00.000Z"
  }
}
```

### Get Campaign Analytics
**GET** `/advertiser/analytics`

**Headers:** Authorization required

**Query Parameters:**
- `campaignId` (string) - Filter by campaign
- `startDate` (string) - Start date (YYYY-MM-DD)
- `endDate` (string) - End date (YYYY-MM-DD)

**Response (200):**
```json
{
  "message": "Analytics retrieved",
  "data": {
    "impressions": 45000,
    "clicks": 1200,
    "leads": 180,
    "ctr": 0.0267,
    "conversionRate": 0.15
  }
}
```

---

## ADMIN ENDPOINTS

All admin endpoints require `type: "admin"` user.

### Get Dashboard
**GET** `/admin/dashboard`

**Headers:** Authorization required

**Response (200):**
```json
{
  "message": "Dashboard data retrieved",
  "data": {
    "totalUsers": 150,
    "totalDrivers": 100,
    "totalAdvertisers": 40,
    "totalCampaigns": 25,
    "totalLeads": 5000
  }
}
```

### List All Users
**GET** `/admin/users`

**Headers:** Authorization required

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 10)
- `type` (string) - Filter by user type
- `sortBy` (string) - Field to sort by
- `sortOrder` (string) - "asc" or "desc"

**Response (200):**
```json
{
  "message": "Users retrieved",
  "data": {
    "users": [
      {
        "id": "user_1234567890",
        "email": "user@example.com",
        "type": "driver",
        "createdAt": "2024-01-10T00:00:00.000Z"
      }
    ],
    "total": 150,
    "page": 1,
    "limit": 10
  }
}
```

### Delete User
**DELETE** `/admin/users/:userId`

**Headers:** Authorization required

**URL Parameters:**
- `userId` (string, required) - User ID to delete

**Response (200):**
```json
{
  "message": "User deleted successfully",
  "data": {
    "userId": "user_1234567890",
    "deleted": "2024-01-15T10:30:00.000Z"
  }
}
```

### List All Campaigns
**GET** `/admin/campaigns`

**Headers:** Authorization required

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 10)
- `status` (string) - Filter by status

**Response (200):**
```json
{
  "message": "Campaigns retrieved",
  "data": {
    "campaigns": [
      {
        "id": "campaign_1234567890",
        "name": "Summer Sale",
        "advertiser": "advertiser@example.com",
        "status": "active",
        "budget": 5000
      }
    ],
    "total": 25
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "ValidationError",
  "message": "Invalid email format",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 401 Unauthorized
```json
{
  "error": "AuthenticationError",
  "message": "Invalid or expired token",
  "statusCode": 401,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 403 Forbidden
```json
{
  "error": "AuthorizationError",
  "message": "Access denied - insufficient permissions",
  "statusCode": 403,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 404 Not Found
```json
{
  "error": "NotFoundError",
  "message": "User not found",
  "statusCode": 404,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 409 Conflict
```json
{
  "error": "ConflictError",
  "message": "Email already registered",
  "statusCode": 409,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 500 Internal Server Error
```json
{
  "error": "Error",
  "message": "Internal server error",
  "statusCode": 500,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Testing with cURL

### Test Registration
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@fastlead.com",
    "password": "testPassword123",
    "type": "driver",
    "fullName": "Test Driver"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver@fastlead.com",
    "password": "testPassword123"
  }'
```

### Test Protected Endpoint
```bash
curl -X GET http://localhost:3000/driver/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Rate Limiting

The API implements rate limiting to prevent abuse:
- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables

---

## CORS Policy

Default allowed origins:
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:5173`

Configure additional origins in `.env` using `CORS_ORIGIN`.

---

## QR CODE & LEAD TRACKING ENDPOINTS

### Generate QR Code for Campaign
**POST** `/campaigns/:id/generate-qr`

Generate a unique QR code for a campaign. QR points to tracking URL with campaign and motorista IDs.

**Headers:** Authorization required (Advertiser)

**Request Body:**
```json
{
  "motoristaId": "motorista_123"
}
```

**Response (200):**
```json
{
  "message": "QR code gerado com sucesso",
  "data": {
    "qrCodeData": "https://fastlead.com/qr/campaign_123",
    "qrCodeImageUrl": "data:image/png;base64,iVBORw0KG...",
    "campaignId": "campaign_123"
  }
}
```

### Track QR Code Click (CRITICAL - Must be <100ms)
**POST** `/leads/track-qr`

Fast tracking endpoint for QR scans. This is the core of FastLead - records every click!

**Endpoint is PUBLIC (no authentication required for speed)**

**Request Body:**
```json
{
  "campaignId": "campaign_123",
  "motoristaId": "motorista_456",
  "userAgent": "Mozilla/5.0...",
  "latitude": 23.5505,
  "longitude": -46.6333
}
```

**Response (201):**
```json
{
  "leadId": "lead_789",
  "campaignId": "campaign_123",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "status": "PENDING",
  "elapsed": "45ms"
}
```

**Performance Requirements:**
- Response time: < 100ms (critical)
- No data loss (reliability over speed)
- Handles concurrent requests (500+ leads/second)

### List Campaign Leads
**GET** `/leads/campaign/:campaignId`

List all leads from a campaign with pagination and filtering.

**Headers:** Authorization required (Advertiser)

**Query Parameters:**
- `page` (number) - Page number (default: 1)
- `limit` (number) - Items per page (default: 20)
- `status` (string) - Filter by status: PENDING, CONVERTED, INVALID

**Response (200):**
```json
{
  "message": "Leads obtidos com sucesso",
  "data": {
    "data": [
      {
        "id": "lead_123",
        "campaign_id": "campaign_456",
        "motorista_id": "motorista_789",
        "status": "PENDING",
        "qr_scan_time": "2024-01-15T10:30:00.000Z",
        "converted_at": null,
        "conversion_value": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

### Update Lead Status
**PATCH** `/leads/:id`

Mark a lead as converted (customer bought) or invalid (bot/duplicate).

**Headers:** Authorization required (Advertiser)

**Request Body:**
```json
{
  "status": "CONVERTED",
  "conversionValue": 299.90
}
```

**Response (200):**
```json
{
  "message": "Lead atualizado com sucesso",
  "data": {
    "leadId": "lead_123",
    "status": "CONVERTED"
  }
}
```

---

## ANALYTICS & ROI ENDPOINTS

### Get Campaign Analytics
**GET** `/campaigns/:id/analytics`

Detailed analytics for a campaign including ROI, conversion rate, leads per day.

**Headers:** Authorization required (Advertiser)

**Query Parameters:**
- `days` (number) - Number of days to analyze (default: 7)

**Response (200):**
```json
{
  "message": "Analytics da campanha obtidos com sucesso",
  "data": {
    "campaignId": "campaign_123",
    "totalLeads": 1250,
    "conversions": 187,
    "conversionRate": 14.96,
    "roi": 245.5,
    "totalInvestment": 5000.00,
    "totalRevenue": 12275.00,
    "leadsPerDay": [
      {
        "date": "2024-01-09",
        "count": 145
      },
      {
        "date": "2024-01-10",
        "count": 189
      }
    ],
    "topMotoristas": [
      {
        "motoristaId": "motorista_123",
        "leadsGenerated": 345,
        "conversions": 52,
        "conversionRate": 15.07
      }
    ]
  }
}
```

### Get Advertiser Dashboard
**GET** `/analytics/advertiser/dashboard`

Overview of all campaigns, total ROI, and performance metrics.

**Headers:** Authorization required (Advertiser)

**Response (200):**
```json
{
  "message": "Dashboard do anunciante obtido com sucesso",
  "data": {
    "totalLeads": 15480,
    "totalConversions": 2321,
    "overallConversionRate": 15.0,
    "totalInvestment": 50000.00,
    "totalRevenue": 122525.00,
    "roiPercentage": 145.05,
    "bestCampaign": {
      "campaignId": "campaign_456",
      "campaignName": "Summer Sale 2024",
      "leads": 5420,
      "roi": 289.3
    },
    "leadsTimeline": [
      {
        "date": "2024-01-01",
        "count": 450
      },
      {
        "date": "2024-01-02",
        "count": 523
      }
    ]
  }
}
```

---

## PAYMENT & EARNINGS ENDPOINTS

### Get Motorista Earnings
**GET** `/motorista/earnings`

Calculate driver earnings for different time periods.

**Headers:** Authorization required (Driver)

**Response (200):**
```json
{
  "message": "Ganhos do motorista obtidos com sucesso",
  "data": {
    "totalEarnings": 2450.50,
    "currentMonth": 890.25,
    "last7Days": 245.50,
    "today": 45.00,
    "leadsCount": 245,
    "conversionsCount": 37,
    "averagePerLead": 10.00
  }
}
```

### Get Motorista Payment History
**GET** `/motorista/payments`

List payment history with status tracking.

**Headers:** Authorization required (Driver)

**Query Parameters:**
- `status` (string) - Filter by status: PENDING, PROCESSING, COMPLETED, FAILED

**Response (200):**
```json
{
  "message": "Histórico de pagamentos obtido",
  "data": [
    {
      "id": "payment_123",
      "motorista_id": "motorista_456",
      "amount": 1200.50,
      "status": "COMPLETED",
      "period_start": "2024-01-01",
      "period_end": "2024-01-31",
      "paid_at": "2024-02-05T14:30:00.000Z"
    }
  ]
}
```

### Calculate Payments (Admin)
**POST** `/payment/calculate`

Trigger payment calculation for drivers in a period.

**Headers:** Authorization required (Admin)

**Request Body:**
```json
{
  "motoristaId": "motorista_123",
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-31"
}
```

**Response (201):**
```json
{
  "message": "Pagamento calculado e criado com sucesso",
  "data": {
    "paymentId": "payment_xyz",
    "amount": 1250.75,
    "status": "PENDING",
    "motoristaId": "motorista_123",
    "period": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    }
  }
}
```

### Process Payment (Admin)
**PATCH** `/payment/:paymentId/process`

Mark payment as processing (preparing for transfer).

**Headers:** Authorization required (Admin)

**Response (200):**
```json
{
  "message": "Pagamento marcado como em processamento",
  "data": {
    "paymentId": "payment_123",
    "status": "PROCESSING"
  }
}
```

### Complete Payment (Admin)
**PATCH** `/payment/:paymentId/complete`

Mark payment as completed (transferred to driver account).

**Headers:** Authorization required (Admin)

**Response (200):**
```json
{
  "message": "Pagamento completado com sucesso",
  "data": {
    "paymentId": "payment_123",
    "status": "COMPLETED"
  }
}
```

### Reject Payment (Admin)
**PATCH** `/payment/:paymentId/reject`

Reject a payment with reason.

**Headers:** Authorization required (Admin)

**Request Body:**
```json
{
  "reason": "Account verification failed"
}
```

**Response (200):**
```json
{
  "message": "Pagamento rejeitado com sucesso",
  "data": {
    "paymentId": "payment_123",
    "status": "FAILED",
    "reason": "Account verification failed"
  }
}
```

---

## Performance & Reliability Notes

### Lead Tracking Endpoint (<100ms requirement)
- **No authentication required** for speed
- **Minimal validation** - just check campaign exists
- **Returns immediately** - writes to queue in background
- **Guaranteed delivery** - queue persists to storage on failure
- **Monitoring** - tracks response time and queue depth

### Analytics Endpoints
- **Cached for 5-15 minutes** - reduce database load
- **Pre-aggregated daily** - faster computation
- **Supports date ranges** - flexible reporting
- **Conversion accuracy** - depends on lead status updates

### Payment Calculation
- **70/30 split** - 70% to driver, 30% to platform
- **Daily updates** - automatic calculation each day
- **Manual override** - admins can recalculate anytime
- **Immutable records** - all calculations logged for audit

---

## Versioning

Current API Version: 1.0.0
No version prefix in URLs currently. Future versions will use `/api/v2/` pattern.
