-- AlterTable
ALTER TABLE "ImpressionEvent" ADD COLUMN     "session_id" TEXT;

-- AlterTable
ALTER TABLE "ScanEvent" ADD COLUMN     "session_id" TEXT;

-- CreateTable
CREATE TABLE "TabletSession" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "motorista_id" TEXT NOT NULL,
    "device_id" TEXT,
    "started_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP,
    "impressions_count" INTEGER NOT NULL DEFAULT 0,
    "scans_count" INTEGER NOT NULL DEFAULT 0,
    "unique_scans_count" INTEGER NOT NULL DEFAULT 0,
    "leads_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL,

    CONSTRAINT "TabletSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TabletSession_motorista_id_idx" ON "TabletSession"("motorista_id");

-- CreateIndex
CREATE INDEX "TabletSession_company_id_idx" ON "TabletSession"("company_id");

-- CreateIndex
CREATE INDEX "TabletSession_started_at_idx" ON "TabletSession"("started_at");

-- CreateIndex
CREATE INDEX "TabletSession_motorista_id_ended_at_idx" ON "TabletSession"("motorista_id", "ended_at");

-- CreateIndex
CREATE INDEX "ImpressionEvent_session_id_idx" ON "ImpressionEvent"("session_id");

-- CreateIndex
CREATE INDEX "ScanEvent_session_id_idx" ON "ScanEvent"("session_id");

-- AddForeignKey
ALTER TABLE "TabletSession" ADD CONSTRAINT "TabletSession_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabletSession" ADD CONSTRAINT "TabletSession_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "MotoristProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TabletSession" ADD CONSTRAINT "TabletSession_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "TabletDevice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImpressionEvent" ADD CONSTRAINT "ImpressionEvent_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "TabletSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanEvent" ADD CONSTRAINT "ScanEvent_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "TabletSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
