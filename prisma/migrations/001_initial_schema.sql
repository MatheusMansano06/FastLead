-- CreateEnum for UserType
CREATE TYPE "UserType" AS ENUM ('MOTORISTA', 'ANUNCIANTE', 'ADMIN');

-- CreateEnum for MotoristStatus
CREATE TYPE "MotoristStatus" AS ENUM ('ATIVO', 'INATIVO', 'SUSPENSO');

-- CreateEnum for CampaignStatus
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum for LeadStatus
CREATE TYPE "LeadStatus" AS ENUM ('PENDING', 'CONVERTED', 'INVALID');

-- CreateEnum for PaymentStatus
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum for PaymentType
CREATE TYPE "PaymentType" AS ENUM ('FIXED', 'PER_LEAD', 'HYBRID');

-- CreateEnum for AuditAction
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'LOGOUT', 'PAYMENT');

-- CreateTable Company
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "website" VARCHAR(500),
    "logo_url" VARCHAR(500),
    "document_number" VARCHAR(20),
    "country" VARCHAR(2) NOT NULL DEFAULT 'BR',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'America/Sao_Paulo',
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,
    "deleted_at" TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex Company
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");
CREATE UNIQUE INDEX "Company_document_number_key" ON "Company"("document_number");
CREATE INDEX "Company_status_idx" ON "Company"("status");
CREATE INDEX "Company_created_at_idx" ON "Company"("created_at");

-- CreateTable User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" "UserType" NOT NULL,
    "phone" VARCHAR(20),
    "avatar_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,
    "deleted_at" TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex User
CREATE UNIQUE INDEX "User_company_id_email_key" ON "User"("company_id", "email");
CREATE INDEX "User_company_id_idx" ON "User"("company_id");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_type_idx" ON "User"("type");

-- CreateTable MotoristProfile
CREATE TABLE "MotoristProfile" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vehicle_info" VARCHAR(500),
    "license_plate" VARCHAR(20),
    "phone" VARCHAR(20),
    "total_earnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "MotoristStatus" NOT NULL DEFAULT 'INATIVO',
    "last_online_at" TIMESTAMP,
    "bank_account" VARCHAR(255),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,
    "deleted_at" TIMESTAMP,

    CONSTRAINT "MotoristProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex MotoristProfile
CREATE UNIQUE INDEX "MotoristProfile_user_id_key" ON "MotoristProfile"("user_id");
CREATE UNIQUE INDEX "MotoristProfile_license_plate_key" ON "MotoristProfile"("license_plate");
CREATE UNIQUE INDEX "MotoristProfile_company_id_user_id_key" ON "MotoristProfile"("company_id", "user_id");
CREATE INDEX "MotoristProfile_company_id_idx" ON "MotoristProfile"("company_id");
CREATE INDEX "MotoristProfile_status_idx" ON "MotoristProfile"("status");

-- CreateTable AnuncianteProfile
CREATE TABLE "AnuncianteProfile" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "document_number" VARCHAR(20),
    "industry" VARCHAR(100),
    "total_budget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_spent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "contact_person" VARCHAR(255),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,
    "deleted_at" TIMESTAMP,

    CONSTRAINT "AnuncianteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex AnuncianteProfile
CREATE UNIQUE INDEX "AnuncianteProfile_user_id_key" ON "AnuncianteProfile"("user_id");
CREATE UNIQUE INDEX "AnuncianteProfile_company_id_user_id_key" ON "AnuncianteProfile"("company_id", "user_id");
CREATE INDEX "AnuncianteProfile_company_id_idx" ON "AnuncianteProfile"("company_id");

-- CreateTable Campaign
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "anunciante_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "image_url" VARCHAR(500),
    "qr_code_data" VARCHAR(500) NOT NULL,
    "qr_code_image_url" VARCHAR(500),
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "target_vehicles" INTEGER NOT NULL DEFAULT 1,
    "total_investment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "price_per_lead" DECIMAL(12,2),
    "daily_budget" DECIMAL(12,2),
    "total_leads" INTEGER NOT NULL DEFAULT 0,
    "unique_scans" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,
    "deleted_at" TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex Campaign
CREATE UNIQUE INDEX "Campaign_qr_code_data_key" ON "Campaign"("qr_code_data");
CREATE UNIQUE INDEX "Campaign_company_id_qr_code_data_key" ON "Campaign"("company_id", "qr_code_data");
CREATE INDEX "Campaign_company_id_idx" ON "Campaign"("company_id");
CREATE INDEX "Campaign_anunciante_id_idx" ON "Campaign"("anunciante_id");
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
CREATE INDEX "Campaign_start_date_idx" ON "Campaign"("start_date");
CREATE INDEX "Campaign_end_date_idx" ON "Campaign"("end_date");

-- CreateTable CampaignMotorista
CREATE TABLE "CampaignMotorista" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "motorista_id" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "acceptance_date" TIMESTAMP,
    "scans_count" INTEGER NOT NULL DEFAULT 0,
    "leads_generated" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "CampaignMotorista_pkey" PRIMARY KEY ("id")
);

-- CreateIndex CampaignMotorista
CREATE UNIQUE INDEX "CampaignMotorista_campaign_id_motorista_id_key" ON "CampaignMotorista"("campaign_id", "motorista_id");
CREATE INDEX "CampaignMotorista_company_id_idx" ON "CampaignMotorista"("company_id");
CREATE INDEX "CampaignMotorista_motorista_id_idx" ON "CampaignMotorista"("motorista_id");

-- CreateTable Lead
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "motorista_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'PENDING',
    "qr_scan_time" TIMESTAMP NOT NULL,
    "user_device" VARCHAR(500),
    "ip_address" VARCHAR(50),
    "latitude" FLOAT8,
    "longitude" FLOAT8,
    "converted_at" TIMESTAMP,
    "conversion_value" DECIMAL(12,2),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,
    "deleted_at" TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex Lead
CREATE INDEX "Lead_company_id_idx" ON "Lead"("company_id");
CREATE INDEX "Lead_campaign_id_idx" ON "Lead"("campaign_id");
CREATE INDEX "Lead_motorista_id_idx" ON "Lead"("motorista_id");
CREATE INDEX "Lead_qr_scan_time_idx" ON "Lead"("qr_scan_time");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_created_at_idx" ON "Lead"("created_at");

-- CreateTable Payment
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "motorista_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_type" "PaymentType" NOT NULL DEFAULT 'PER_LEAD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "leads_count" INTEGER NOT NULL DEFAULT 0,
    "external_id" VARCHAR(255),
    "paid_at" TIMESTAMP,
    "rejected_reason" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex Payment
CREATE INDEX "Payment_company_id_idx" ON "Payment"("company_id");
CREATE INDEX "Payment_motorista_id_idx" ON "Payment"("motorista_id");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_period_start_idx" ON "Payment"("period_start");
CREATE INDEX "Payment_period_end_idx" ON "Payment"("period_end");

-- CreateTable AuditLog
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "resource_type" VARCHAR(100) NOT NULL,
    "resource_id" VARCHAR(255) NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "description" TEXT,
    "ip_address" VARCHAR(50),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex AuditLog
CREATE INDEX "AuditLog_company_id_idx" ON "AuditLog"("company_id");
CREATE INDEX "AuditLog_user_id_idx" ON "AuditLog"("user_id");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_resource_type_idx" ON "AuditLog"("resource_type");
CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog"("created_at");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MotoristProfile" ADD CONSTRAINT "MotoristProfile_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MotoristProfile" ADD CONSTRAINT "MotoristProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnuncianteProfile" ADD CONSTRAINT "AnuncianteProfile_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnuncianteProfile" ADD CONSTRAINT "AnuncianteProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_anunciante_id_fkey" FOREIGN KEY ("anunciante_id") REFERENCES "AnuncianteProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMotorista" ADD CONSTRAINT "CampaignMotorista_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignMotorista" ADD CONSTRAINT "CampaignMotorista_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignMotorista" ADD CONSTRAINT "CampaignMotorista_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "MotoristProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "MotoristProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "MotoristProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
