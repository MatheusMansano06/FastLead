/**
 * Cria (ou atualiza) o usuário ADMIN sem tocar em mais nada.
 *
 * Existe porque `resetAndSeedMaster` APAGA campanhas, leads, tablets e
 * pagamentos — serve para começar do zero, não para dar acesso a alguém num
 * banco que já está rodando. Este aqui só mexe no admin.
 *
 * A senha vem do ambiente e nunca fica no repositório:
 *
 *   ADMIN_EMAIL="voce@fastlead.com.br" ADMIN_PASSWORD="..." \
 *     railway run --service fastlead-api -- npx tsx prisma/criarAdmin.ts
 *
 * Rodar de novo é seguro: atualiza a senha do mesmo e-mail em vez de duplicar.
 */
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

const EMAIL = process.env.ADMIN_EMAIL;
const SENHA = process.env.ADMIN_PASSWORD;
const NOME = process.env.ADMIN_NAME || 'FastLead Admin';

async function main() {
  if (!EMAIL || !SENHA) {
    console.error('\n  Faltou ADMIN_EMAIL ou ADMIN_PASSWORD.\n');
    console.error('  ADMIN_EMAIL="voce@fastlead.com.br" ADMIN_PASSWORD="sua-senha" \\');
    console.error('    railway run --service fastlead-api -- npx tsx prisma/criarAdmin.ts\n');
    process.exit(1);
  }
  if (SENHA.length < 10) {
    console.error('\n  Senha curta demais. Use pelo menos 10 caracteres — esta conta vê');
    console.error('  documento e CPF de todos os motoristas.\n');
    process.exit(1);
  }

  // O ADMIN mora numa Company porque User.company_id é obrigatório, mas é um
  // tenant técnico: não anuncia nada.
  const company = await prisma.company.upsert({
    where: { email: EMAIL },
    update: {},
    create: { name: 'FastLead (interno)', email: EMAIL, status: 'active' },
  });

  const senha_hash = await hashPassword(SENHA);
  const user = await prisma.user.upsert({
    where: { company_id_email: { company_id: company.id, email: EMAIL } },
    update: { password_hash: senha_hash, type: 'ADMIN', is_active: true },
    create: {
      company_id: company.id,
      email: EMAIL,
      password_hash: senha_hash,
      name: NOME,
      type: 'ADMIN',
      is_active: true,
      is_verified: true,
    },
  });

  const total = await prisma.user.count({ where: { type: 'ADMIN' } });
  console.log(`\n  ADMIN pronto: ${user.email}`);
  console.log(`  Total de admins no banco: ${total}`);
  console.log('  Entre em /admin com esse e-mail.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
