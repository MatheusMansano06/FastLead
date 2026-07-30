// ============================================================================
// Seed enxuto: cria UM perfil de empresa e UM de motorista para teste.
// Idempotente — remove os usuários de teste (e suas companies) antes de recriar.
// Uso: npm run db:seed:test
// ============================================================================
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMPRESA = {
  email: 'empresa.teste@fastlead.com.br',
  password: 'Empresa@2026',
  fullName: 'Ana Martins',
  role: 'Diretora de Marketing',
  phone: '11987654321',
  companyName: 'Empresa Teste Anúncios LTDA',
  tradeName: 'Teste Ads',
  cnpj: '11222333000181',
  industry: 'Tecnologia',
  website: 'https://empresateste.com.br',
};

const MOTORISTA = {
  email: 'motorista.teste@fastlead.com.br',
  password: 'Motorista@2026',
  fullName: 'Carlos Souza',
  cpf: '52998224725',
  phone: '11991234567',
  city: 'São Paulo - SP',
  rideApp: 'Uber',
  vehicle: 'Chevrolet Onix 2021',
  plate: 'ABC1D23',
};

async function purge(email: string) {
  const users = await prisma.user.findMany({ where: { email }, select: { company_id: true } });
  const companyIds = [...new Set(users.map((u) => u.company_id))];
  // onDelete: Cascade em User/Profiles a partir de Company remove tudo.
  if (companyIds.length) {
    await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
  }
}

async function main() {
  console.log('🌱 Criando perfis de teste (empresa + motorista)...\n');

  await purge(EMPRESA.email);
  await purge(MOTORISTA.email);

  // ── Empresa / anunciante ──
  const empresaCompany = await prisma.company.create({
    data: {
      name: EMPRESA.companyName,
      email: EMPRESA.email,
      phone: EMPRESA.phone,
      website: EMPRESA.website,
      document_number: EMPRESA.cnpj,
      status: 'active',
    },
  });
  const empresaUser = await prisma.user.create({
    data: {
      company_id: empresaCompany.id,
      email: EMPRESA.email,
      password_hash: await bcrypt.hash(EMPRESA.password, 10),
      name: EMPRESA.fullName,
      type: 'ANUNCIANTE',
      phone: EMPRESA.phone,
      is_active: true,
      is_verified: true,
    },
  });
  await prisma.anuncianteProfile.create({
    data: {
      company_id: empresaCompany.id,
      user_id: empresaUser.id,
      company_name: EMPRESA.companyName,
      trade_name: EMPRESA.tradeName,
      document_number: EMPRESA.cnpj,
      industry: EMPRESA.industry,
      website: EMPRESA.website,
      role: EMPRESA.role,
      contact_person: EMPRESA.fullName,
    },
  });
  console.log(`✅ Empresa:   ${EMPRESA.email}  /  ${EMPRESA.password}`);

  // ── Motorista ──
  const motoristaCompany = await prisma.company.create({
    data: {
      name: MOTORISTA.fullName,
      email: MOTORISTA.email,
      phone: MOTORISTA.phone,
      status: 'active',
    },
  });
  const motoristaUser = await prisma.user.create({
    data: {
      company_id: motoristaCompany.id,
      email: MOTORISTA.email,
      password_hash: await bcrypt.hash(MOTORISTA.password, 10),
      name: MOTORISTA.fullName,
      type: 'MOTORISTA',
      phone: MOTORISTA.phone,
      is_active: true,
      is_verified: true,
    },
  });
  await prisma.motoristProfile.create({
    data: {
      company_id: motoristaCompany.id,
      user_id: motoristaUser.id,
      vehicle_info: MOTORISTA.vehicle,
      license_plate: MOTORISTA.plate,
      phone: MOTORISTA.phone,
      cpf: MOTORISTA.cpf,
      city: MOTORISTA.city,
      ride_app: MOTORISTA.rideApp,
      status: 'ATIVO',
      last_online_at: new Date(),
    },
  });
  console.log(`✅ Motorista: ${MOTORISTA.email}  /  ${MOTORISTA.password}`);

  console.log('\n🎉 Perfis de teste prontos!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Erro no seed de teste:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
