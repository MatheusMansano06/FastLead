-- Telemetria do tablet: posição e movimento da jornada, e o veredito de fraude.
--
-- O estado vivo mora em TabletSession (reescrito a cada ping, sem crescer) e a
-- trilha detalhada em TelemetryPing (só marco notável). Guardar todo ping como
-- linha encheria o banco: a 1 ping/8s são ~5 mil linhas por turno por tablet.

-- AlterTable
ALTER TABLE "TabletSession"
    ADD COLUMN "last_ping_at"           TIMESTAMP,
    ADD COLUMN "last_latitude"          DOUBLE PRECISION,
    ADD COLUMN "last_longitude"         DOUBLE PRECISION,
    ADD COLUMN "last_moving_at"         TIMESTAMP,
    ADD COLUMN "distance_meters"        DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "recent_distance_meters" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN "is_suspect"             BOOLEAN          NOT NULL DEFAULT false,
    ADD COLUMN "suspect_reason"         VARCHAR(40),
    ADD COLUMN "suspect_since"          TIMESTAMP,
    ADD COLUMN "mock_location_seen"     BOOLEAN          NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TelemetryPing" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "device_id" TEXT,
    "motorista_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP NOT NULL,
    "received_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy_m" DOUBLE PRECISION,
    "speed_mps" DOUBLE PRECISION,
    "is_moving" BOOLEAN NOT NULL DEFAULT false,
    "motion_gforce" DOUBLE PRECISION,
    "orientation" VARCHAR(12),
    "is_mocked" BOOLEAN NOT NULL DEFAULT false,
    "reason" VARCHAR(12) NOT NULL DEFAULT 'HEARTBEAT',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryPing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelemetryPing_session_id_recorded_at_idx" ON "TelemetryPing"("session_id", "recorded_at");

-- CreateIndex
CREATE INDEX "TelemetryPing_recorded_at_idx" ON "TelemetryPing"("recorded_at");

-- CreateIndex
CREATE INDEX "TabletSession_is_suspect_idx" ON "TabletSession"("is_suspect");

-- AddForeignKey
ALTER TABLE "TelemetryPing" ADD CONSTRAINT "TelemetryPing_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "TabletSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Uma jornada aberta por tablet.
--
-- TabletService.currentSession lia para depois criar, e duas requisicoes do
-- mesmo tablet chegando juntas (playlist e telemetria, por exemplo) criavam
-- uma jornada cada. Foi observado em teste: duas jornadas do mesmo aparelho
-- nascidas com 30ms de diferenca.
--
-- O estrago e silencioso: impressoes caem numa jornada e scans na outra, o
-- resumo do motorista subconta, e o veredito antifraude fica numa jornada
-- enquanto os leads nascem na outra — a comissao nunca chega a ser bloqueada.
-- Indice parcial porque a restricao so vale enquanto a jornada esta aberta:
-- o mesmo tablet tem varias jornadas encerradas, e isso e o esperado.
--
-- Jornadas duplicadas que ja existam sao encerradas antes, mantendo a mais
-- antiga (e nela que a jornada de fato comecou).
UPDATE "TabletSession" s SET "ended_at" = now()
WHERE "ended_at" IS NULL AND "device_id" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "TabletSession" o
    WHERE o."device_id" = s."device_id" AND o."ended_at" IS NULL
      AND (o."created_at" < s."created_at" OR (o."created_at" = s."created_at" AND o."id" < s."id"))
  );

CREATE UNIQUE INDEX "TabletSession_uma_aberta_por_tablet"
    ON "TabletSession"("device_id")
    WHERE "ended_at" IS NULL AND "device_id" IS NOT NULL;
