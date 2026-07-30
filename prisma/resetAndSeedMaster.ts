/**
 * Zera as MÉTRICAS e garante o usuário MASTER, preservando as contas.
 *
 * Use antes de uma demonstração ou de um piloto: garante que todo número que
 * aparecer no painel foi gerado ali, na frente de quem está assistindo.
 * Não existe dado semeado de mentira aqui — é o oposto de um seed.
 *
 * O que APAGA: campanhas, vínculos, scans, impressões, leads, pagamentos,
 * tablets pareados. As campanhas saem porque as antigas guardam QR apontando
 * para um domínio que não existe — manter é pior que recriar.
 *
 * O que PRESERVA: usuários, empresas e perfis. As contas continuam servindo
 * para teste.
 *
 *   npm run db:reset:master
 *
 * Exige CONFIRM_WIPE=SIM no ambiente, para não apagar produção sem querer.
 * WIPE_ACCOUNTS=SIM apaga também as contas (reset total).
 */

import { PrismaClient } from '@prisma/client';
// Mesmo utilitário que o login usa — hash gerado aqui precisa validar lá.
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

const MASTER_EMAIL = process.env.MASTER_EMAIL || 'master@fastlead.com.br';
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || 'Master@2026';
const MASTER_NAME = process.env.MASTER_NAME || 'FastLead Master';

async function main() {
  if (process.env.CONFIRM_WIPE !== 'SIM') {
    console.error('\n  Recusando apagar sem confirmação explícita.');
    console.error('  Rode com CONFIRM_WIPE=SIM se é isso mesmo que você quer.\n');
    process.exit(1);
  }

  const wipeAccounts = process.env.WIPE_ACCOUNTS === 'SIM';

  const antes = {
    usuarios: await prisma.user.count(),
    campanhas: await prisma.campaign.count(),
  };

  console.log('Apagando campanhas e métricas…');

  // Ordem importa: filhos antes dos pais, senão as FKs barram.
  await prisma.impressionEvent.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.scanEvent.deleteMany();
  await prisma.tabletDevice.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.campaignMotorista.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.auditLog.deleteMany();

  // Contadores denormalizados vivem nos perfis e precisam voltar a zero junto,
  // senão o painel do motorista mostraria ganho de campanha que não existe mais.
  await prisma.motoristProfile.updateMany({ data: { total_earnings: 0 } });
  await prisma.anuncianteProfile.updateMany({ data: { total_spent: 0 } });

  // ATIVO passou a significar "tem tablet pareado", não "fez cadastro".
  // Como os tablets acabaram de ser apagados, ninguém pode continuar ATIVO —
  // senão o MASTER contaria como ativo um motorista sem tela nenhuma.
  const normalizados = await prisma.motoristProfile.updateMany({
    where: { status: 'ATIVO' },
    data: { status: 'INATIVO' },
  });

  if (wipeAccounts) {
    console.log('WIPE_ACCOUNTS=SIM — apagando também as contas…');
    await prisma.motoristProfile.deleteMany();
    await prisma.anuncianteProfile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.company.deleteMany();
  }

  console.log('Garantindo usuário MASTER…');

  // O MASTER também vive dentro de uma Company porque User.company_id é
  // obrigatório — mas é um tenant técnico, não um anunciante.
  const company = await prisma.company.upsert({
    where: { email: MASTER_EMAIL },
    update: {},
    create: {
      name: 'FastLead (interno)',
      email: MASTER_EMAIL,
      status: 'active',
    },
  });

  // Idempotente de propósito: rodar de novo não duplica nem perde o MASTER.
  const user = await prisma.user.upsert({
    where: { company_id_email: { company_id: company.id, email: MASTER_EMAIL } },
    update: {
      password_hash: await hashPassword(MASTER_PASSWORD),
      type: 'ADMIN',
      is_active: true,
    },
    create: {
      company_id: company.id,
      email: MASTER_EMAIL,
      password_hash: await hashPassword(MASTER_PASSWORD),
      name: MASTER_NAME,
      type: 'ADMIN',
      is_active: true,
      is_verified: true,
    },
  });

  const counts = {
    empresas: await prisma.anuncianteProfile.count(),
    motoristas: await prisma.motoristProfile.count(),
    campanhas: await prisma.campaign.count(),
    impressoes: await prisma.impressionEvent.count(),
    scans: await prisma.scanEvent.count(),
    leads: await prisma.lead.count(),
  };

  const contas = await prisma.user.findMany({
    select: { email: true, type: true, name: true },
    orderBy: { type: 'asc' },
  });

  console.log('\n  Métricas zeradas.');
  console.log(`  Campanhas removidas: ${antes.campanhas}`);
  console.log(`  Motoristas voltados a INATIVO (sem tablet): ${normalizados.count}`);
  console.log(`  Contas preservadas:  ${antes.usuarios} (+1 MASTER)`);
  console.log(`  MASTER: ${user.email} / ${MASTER_PASSWORD}`);
  console.log(`  Estado inicial: ${JSON.stringify(counts)}`);
  console.log('\n  Contas disponíveis:');
  contas.forEach((c) => console.log(`    ${c.type.padEnd(11)} ${c.email}  (${c.name})`));
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
