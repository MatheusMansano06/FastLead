-- Migração: motorista passa a ganhar por tempo de tela.
--
-- Escrita à mão, statement a statement, em vez de `prisma db push
-- --accept-data-loss`. O push só pede a flag por causa da constraint única nova,
-- mas a flag é indiscriminada: no dia em que o schema remover uma coluna, ela
-- apagaria dado de produção calada, dentro do deploy. Aqui cada comando é
-- aditivo e idempotente — nada neste arquivo remove coluna, tabela ou linha.
--
-- Rodar duas vezes é seguro: todos os statements usam IF NOT EXISTS.
--
-- Depois deste arquivo, `prisma db push` (sem flag) não encontra mais nada
-- destrutivo para fazer, porque a constraint já existe.

-- ── Campaign: taxa do motorista por hora de tela ──
-- Default 2.5000 = o pacote de referência (R$ 1.500 ÷ 3 ÷ 200h). Campanhas que
-- já existem passam a valer a taxa base até serem recontratadas.
ALTER TABLE "Campaign"
  ADD COLUMN IF NOT EXISTS "driver_rate_hour" DECIMAL(12,4) NOT NULL DEFAULT 2.5000;

-- ── DriverEarning: acúmulo diário por campanha ──
ALTER TABLE "DriverEarning" ADD COLUMN IF NOT EXISTS "campaign_id" TEXT;
ALTER TABLE "DriverEarning" ADD COLUMN IF NOT EXISTS "earned_date" DATE;
ALTER TABLE "DriverEarning" ADD COLUMN IF NOT EXISTS "screen_ms" INTEGER NOT NULL DEFAULT 0;

-- Os ganhos antigos (por lead convertido) ficam com campaign_id e earned_date
-- nulos. No Postgres, linhas com NULL em coluna da constraint são consideradas
-- distintas entre si, então nenhuma delas colide com esta unique — nem entre si
-- nem com os acúmulos novos.
CREATE UNIQUE INDEX IF NOT EXISTS "DriverEarning_motorista_id_campaign_id_earned_date_key"
  ON "DriverEarning" ("motorista_id", "campaign_id", "earned_date");

CREATE INDEX IF NOT EXISTS "DriverEarning_campaign_id_idx"
  ON "DriverEarning" ("campaign_id");

-- ADD CONSTRAINT não aceita IF NOT EXISTS; o bloco torna o statement repetível.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DriverEarning_campaign_id_fkey'
  ) THEN
    ALTER TABLE "DriverEarning"
      ADD CONSTRAINT "DriverEarning_campaign_id_fkey"
      FOREIGN KEY ("campaign_id") REFERENCES "Campaign"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

-- ── Novo tipo de transação de crédito ──
-- LEAD_PAYOUT continua existindo: é o histórico do modelo antigo.
ALTER TYPE "CreditTransactionType" ADD VALUE IF NOT EXISTS 'SCREEN_PAYOUT';
