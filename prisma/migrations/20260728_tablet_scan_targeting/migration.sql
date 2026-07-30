-- CreateEnum
CREATE TYPE "Region" AS ENUM ('NORTE', 'NORDESTE', 'CENTRO_OESTE', 'SUDESTE', 'SUL');

-- CreateEnum
CREATE TYPE "RideApp" AS ENUM ('UBER', 'NOVENOVE', 'INDRIVE', 'CABIFY', 'BLABLACAR', 'TAXI', 'OUTRO');

-- CreateEnum
CREATE TYPE "RideCategory" AS ENUM ('UBER_X', 'UBER_COMFORT', 'UBER_BLACK', 'UBER_MOTO', 'UBER_FLASH_MOTO', 'NOVENOVE_POP', 'NOVENOVE_COMFORT', 'NOVENOVE_MOTO', 'NOVENOVE_ENTREGA', 'INDRIVE_ECONOMY', 'INDRIVE_COMFORT', 'CABIFY_LITE', 'CABIFY_EXECUTIVO', 'BLABLACAR_CARONA', 'TAXI_COMUM', 'TAXI_EXECUTIVO');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('PENDING_PAIRING', 'ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('DRIVER_ACCEPTED', 'MASTER_FORCED', 'MASTER_BLOCKED');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "cta_text" VARCHAR(160),
ADD COLUMN     "destination_url" VARCHAR(500),
ADD COLUMN     "target_categories" "RideCategory"[],
ADD COLUMN     "target_cities" TEXT[],
ADD COLUMN     "target_regions" "Region"[],
ADD COLUMN     "target_ride_apps" "RideApp"[],
ADD COLUMN     "target_states" TEXT[],
ADD COLUMN     "total_impressions" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "CampaignMotorista" ADD COLUMN     "assigned_at" TIMESTAMP,
ADD COLUMN     "assigned_by_id" TEXT,
ADD COLUMN     "impressions_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "source" "AssignmentSource" NOT NULL DEFAULT 'DRIVER_ACCEPTED';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "contact_email" VARCHAR(255),
ADD COLUMN     "contact_name" VARCHAR(255),
ADD COLUMN     "contact_phone" VARCHAR(20),
ADD COLUMN     "scan_event_id" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MotoristProfile" ADD COLUMN     "bio" VARCHAR(500),
ADD COLUMN     "region" "Region",
ADD COLUMN     "ride_apps" "RideApp"[],
ADD COLUMN     "ride_categories" "RideCategory"[],
ADD COLUMN     "state" VARCHAR(2);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "avatar_url" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "TabletDevice" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "motorista_id" TEXT,
    "pairing_code" VARCHAR(8) NOT NULL,
    "pairing_expires_at" TIMESTAMP,
    "device_token" VARCHAR(255),
    "status" "DeviceStatus" NOT NULL DEFAULT 'PENDING_PAIRING',
    "label" VARCHAR(120),
    "user_agent" VARCHAR(500),
    "last_seen_at" TIMESTAMP,
    "paired_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "TabletDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpressionEvent" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "motorista_id" TEXT NOT NULL,
    "device_id" TEXT,
    "shown_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpressionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanEvent" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "motorista_id" TEXT NOT NULL,
    "device_id" TEXT,
    "scanned_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visitor_hash" VARCHAR(64) NOT NULL,
    "is_unique" BOOLEAN NOT NULL DEFAULT true,
    "user_device" VARCHAR(500),
    "ip_address" VARCHAR(50),
    "referrer" VARCHAR(500),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TabletDevice_pairing_code_key" ON "TabletDevice"("pairing_code");

-- CreateIndex
CREATE UNIQUE INDEX "TabletDevice_device_token_key" ON "TabletDevice"("device_token");

-- CreateIndex
CREATE INDEX "TabletDevice_company_id_idx" ON "TabletDevice"("company_id");

-- CreateIndex
CREATE INDEX "TabletDevice_motorista_id_idx" ON "TabletDevice"("motorista_id");

-- CreateIndex
CREATE INDEX "TabletDevice_status_idx" ON "TabletDevice"("status");

-- CreateIndex
CREATE INDEX "ImpressionEvent_company_id_idx" ON "ImpressionEvent"("company_id");

-- CreateIndex
CREATE INDEX "ImpressionEvent_campaign_id_idx" ON "ImpressionEvent"("campaign_id");

-- CreateIndex
CREATE INDEX "ImpressionEvent_motorista_id_idx" ON "ImpressionEvent"("motorista_id");

-- CreateIndex
CREATE INDEX "ImpressionEvent_shown_at_idx" ON "ImpressionEvent"("shown_at");

-- CreateIndex
CREATE INDEX "ScanEvent_company_id_idx" ON "ScanEvent"("company_id");

-- CreateIndex
CREATE INDEX "ScanEvent_campaign_id_idx" ON "ScanEvent"("campaign_id");

-- CreateIndex
CREATE INDEX "ScanEvent_motorista_id_idx" ON "ScanEvent"("motorista_id");

-- CreateIndex
CREATE INDEX "ScanEvent_scanned_at_idx" ON "ScanEvent"("scanned_at");

-- CreateIndex
CREATE INDEX "ScanEvent_visitor_hash_idx" ON "ScanEvent"("visitor_hash");

-- CreateIndex
CREATE INDEX "ScanEvent_campaign_id_visitor_hash_idx" ON "ScanEvent"("campaign_id", "visitor_hash");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_scan_event_id_key" ON "Lead"("scan_event_id");

-- CreateIndex
CREATE INDEX "MotoristProfile_state_idx" ON "MotoristProfile"("state");

-- CreateIndex
CREATE INDEX "MotoristProfile_region_idx" ON "MotoristProfile"("region");

-- CreateIndex
CREATE INDEX "MotoristProfile_city_idx" ON "MotoristProfile"("city");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_scan_event_id_fkey" FOREIGN KEY ("scan_event_id") REFERENCES "ScanEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabletDevice" ADD CONSTRAINT "TabletDevice_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabletDevice" ADD CONSTRAINT "TabletDevice_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "MotoristProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpressionEvent" ADD CONSTRAINT "ImpressionEvent_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpressionEvent" ADD CONSTRAINT "ImpressionEvent_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpressionEvent" ADD CONSTRAINT "ImpressionEvent_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "MotoristProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpressionEvent" ADD CONSTRAINT "ImpressionEvent_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "TabletDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "MotoristProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "TabletDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
