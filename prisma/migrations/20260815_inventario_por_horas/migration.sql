-- Inventario de tela vendido por tempo.
--
-- Cada campanha ocupa uma quantidade de minutos por dia no tablet, e o
-- motorista soma campanhas ate encher o teto diario dele (12h). O peso na
-- rotacao sai daqui: quem comprou o dobro de minutos aparece o dobro de vezes.
--
-- Padrao de 60 minutos para as campanhas que ja existem: sem isso elas
-- entrariam valendo zero e sumiriam da rotacao no primeiro deploy.

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN "daily_minutes" INTEGER NOT NULL DEFAULT 60;

-- Busca de quanto ja foi entregue hoje, por campanha e motorista. Sem este
-- indice, decidir a playlist varreria todas as impressoes historicas do
-- motorista a cada abertura do tablet.
CREATE INDEX "ImpressionEvent_motorista_campanha_dia_idx"
    ON "ImpressionEvent"("motorista_id", "campaign_id", "shown_at");
