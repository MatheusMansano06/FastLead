/**
 * Seed realista para desenvolvimento e testes.
 * Popula o banco com dados que simulam ambiente de produção.
 *
 * Cria:
 * - 1 empresa (FastLead)
 * - 100 motoristas (variados: Uber, 99, Táxi, inDrive)
 * - 50 campanhas (ativas, pausadas, encerradas)
 * - 1000 leads (convertidos, pendentes, inválidos)
 * - 300 earnings (PENDING, PAID)
 * - Tablets pareados
 * - Impressões e scans realistas
 *
 * Uso: npm run db:seed:realistic
 */

import { PrismaClient, RideApp, RideCategory, Region } from '@prisma/client';
import { hashPassword } from '../src/utils/password';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

// ============================================================================
// HELPERS
// ============================================================================

async function generateQRCode(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data);
  } catch {
    return '';
  }
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

// ============================================================================
// SEED
// ============================================================================

async function main() {
  console.log('🌱 Starting realistic seed...\n');

  // Limpar tudo primeiro
  console.log('🧹 Cleaning up...');
  await prisma.auditLog.deleteMany();
  await prisma.campaignReview.deleteMany();
  await prisma.scanEvent.deleteMany();
  await prisma.impressionEvent.deleteMany();
  await prisma.tabletSession.deleteMany();
  await prisma.tabletDevice.deleteMany();
  await prisma.driverEarning.deleteMany();
  await prisma.companyCreditTx.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.campaignMotorista.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.driverBankAccount.deleteMany();
  await prisma.motoristProfile.deleteMany();
  await prisma.anuncianteProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // ========================================================================
  // Empresa
  // ========================================================================
  console.log('\n🏢 Creating company...');
  const company = await prisma.company.create({
    data: {
      name: 'FastLead Brasil',
      email: 'admin@fastlead.com.br',
      phone: '+55 11 98765-4321',
      website: 'https://fastlead.com.br',
      logo_url: 'https://fastlead.com.br/logo.png',
      document_number: '12345678000190',
      country: 'BR',
      timezone: 'America/Sao_Paulo',
      status: 'active',
      credit_balance: 50000.0, // R$ 50k pré-pago
    },
  });
  console.log(`✅ Company: ${company.name}`);

  // ========================================================================
  // Usuários (Admin + Anunciantes + Motoristas)
  // ========================================================================
  console.log('\n👥 Creating users...');

  // Admin
  const adminUser = await prisma.user.create({
    data: {
      company_id: company.id,
      email: 'admin@fastlead.com.br',
      password_hash: await hashPassword('admin123'),
      name: 'Admin FastLead',
      type: 'ADMIN',
      phone: '+55 11 98765-4321',
      is_active: true,
      is_verified: true,
    },
  });

  // 10 Anunciantes
  const anunciantes: typeof adminUser[] = [];
  const anunciandoNomes = [
    'Pizzaria Delight',
    'Gym Pro',
    'Clinica Sorrisos',
    'Estetica Belle',
    'Restaurante Sabor',
    'Padaria do Bairro',
    'Farmácia Central',
    'Pet Shop Premium',
    'Salao Beleza Total',
    'Loja Moda Certa',
  ];

  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: {
        company_id: company.id,
        email: `anunciante${i + 1}@company.com`,
        password_hash: await hashPassword('password123'),
        name: anunciandoNomes[i],
        type: 'ANUNCIANTE',
        is_active: true,
        is_verified: true,
      },
    });
    anunciantes.push(user);

    // Criar profile de anunciante
    await prisma.anuncianteProfile.create({
      data: {
        company_id: company.id,
        user_id: user.id,
        company_name: anunciandoNomes[i],
        document_number: `${10000000000000 + i}`,
        industry: 'Varejo',
        total_budget: 10000.0,
        total_spent: 0,
      },
    });
  }

  // 100 Motoristas
  console.log('  Creating 100 motoristas...');
  const motoristas: typeof adminUser[] = [];
  const nomes = ['João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Lucas', 'Felipe', 'Bruno'];
  const sobrenomes = [
    'Silva',
    'Santos',
    'Oliveira',
    'Costa',
    'Ferreira',
    'Gomes',
    'Rocha',
    'Martins',
  ];
  const regioesArray = [Region.SUDESTE, Region.NORDESTE, Region.SUL, Region.CENTRO_OESTE, Region.NORTE];
  const cidades = {
    [Region.SUDESTE]: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Campinas'],
    [Region.NORDESTE]: ['Salvador', 'Recife', 'Fortaleza', 'Brasília'],
    [Region.SUL]: ['Porto Alegre', 'Curitiba', 'Santa Catarina', 'Blumenau'],
    [Region.CENTRO_OESTE]: ['Brasília', 'Goiânia', 'Cuiabá'],
    [Region.NORTE]: ['Manaus', 'Belém', 'Palmas'],
  };
  const rideApps = [RideApp.UBER, RideApp.NOVENOVE, RideApp.INDRIVE, RideApp.CABIFY, RideApp.TAXI];

  for (let i = 0; i < 100; i++) {
    const nome = randomElement(nomes);
    const sobrenome = randomElement(sobrenomes);
    const email = `motorista${i + 1}@driver.com`;

    const user = await prisma.user.create({
      data: {
        company_id: company.id,
        email,
        password_hash: await hashPassword('driver123'),
        name: `${nome} ${sobrenome}`,
        type: 'MOTORISTA',
        is_active: true,
        is_verified: true,
      },
    });
    motoristas.push(user);

    const regiao = randomElement(regioesArray);
    const cidade = randomElement(cidades[regiao]);
    const apps = [randomElement(rideApps), randomElement(rideApps)];
    const uniqueApps = [...new Set(apps)];

    // Criar profile de motorista
    await prisma.motoristProfile.create({
      data: {
        company_id: company.id,
        user_id: user.id,
        vehicle_info: `Corolla ${2018 + randomInt(0, 5)} - ${String.fromCharCode(65 + randomInt(0, 25))}${randomInt(100, 9999)}`,
        license_plate: `ABC${randomInt(1000, 9999)}`,
        cpf: `${randomInt(100, 999)}.${randomInt(100, 999)}.${randomInt(100, 999)}-${randomInt(10, 99)}`,
        phone: `11 9${randomInt(8000, 9999)}-${randomInt(1000, 9999)}`,
        city: cidade,
        state: regiao === Region.SUDESTE ? 'SP' : regiao === Region.NORDESTE ? 'BA' : 'RS',
        region: regiao,
        ride_apps: uniqueApps,
        ride_categories: randomElement([
          [RideCategory.UBER_X, RideCategory.UBER_COMFORT],
          [RideCategory.NOVENOVE_POP],
          [RideCategory.TAXI_COMUM],
        ]),
        rating: randomFloat(4.0, 5.0),
        status: 'INATIVO', // Começa inativo, será ativado ao parear tablet
        total_earnings: randomFloat(1000, 15000),
      },
    });
  }

  console.log(`✅ Created ${motoristas.length} motoristas\n`);

  // ========================================================================
  // Campanhas (50)
  // ========================================================================
  console.log('📢 Creating 50 campaigns...');
  const campanhas = [];
  const statusCampanha = ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'];

  for (let i = 0; i < 50; i++) {
    const anunciante = randomElement(anunciantes);
    const anuncianteProfile = await prisma.anuncianteProfile.findUnique({
      where: { user_id: anunciante.id },
    });

    const startDate = daysAgo(randomInt(30, 180));
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + randomInt(7, 30));

    const qrData = `https://fastlead.com.br/lead/${i}`;
    const qrCode = await generateQRCode(qrData);

    const campaign = await prisma.campaign.create({
      data: {
        company_id: company.id,
        anunciante_id: anuncianteProfile!.id,
        created_by_id: adminUser.id,
        title: `Campanha ${i + 1} - ${anunciante.name}`,
        description: `Descrição da campanha ${i + 1}`,
        image_url:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        show_qr: true,
        qr_position: 'BOTTOM_RIGHT',
        show_text: true,
        qr_code_data: qrData,
        qr_code_image_url: qrCode,
        destination_url: null,
        cta_text: 'Escaneie para ganhar 20% OFF',
        status: randomElement(statusCampanha),
        start_date: startDate,
        end_date: endDate,
        target_vehicles: randomInt(5, 20),
        total_investment: randomFloat(500, 5000),
        price_per_lead: randomFloat(10, 100),
        daily_budget: randomFloat(50, 500),
        target_regions: [randomElement(regioesArray)],
        target_states: ['SP', 'RJ'],
        target_cities: [],
        target_ride_apps: [randomElement(rideApps)],
        target_categories: [],
      },
    });
    campanhas.push(campaign);
  }
  console.log(`✅ Created ${campanhas.length} campaigns\n`);

  // ========================================================================
  // Tablets & Pareamentos (50 motoristas com tablet)
  // ========================================================================
  console.log('📱 Creating tablets and pairings...');
  const motoristasComTablet = motoristas.slice(0, 50);

  for (let i = 0; i < motoristasComTablet.length; i++) {
    const motorista = motoristasComTablet[i];
    const motoristProfile = await prisma.motoristProfile.findUnique({
      where: { user_id: motorista.id },
    });

    // Criar tablet
    const tablet = await prisma.tabletDevice.create({
      data: {
        company_id: company.id,
        motorista_id: motoristProfile!.id,
        pairing_code: null, // Já pareado
        device_token: `device_token_${i}`,
        status: 'ACTIVE',
        label: `Tablet do ${motorista.name}`,
        paired_at: daysAgo(randomInt(1, 60)),
      },
    });

    // Atualizar motorista para ATIVO
    await prisma.motoristProfile.update({
      where: { id: motoristProfile!.id },
      data: { status: 'ATIVO' },
    });

    // Vincular campanhas ao motorista (5 campanhas por motorista)
    const campanhasDoMotorista = campanhas.slice(0, 5);
    for (const campanha of campanhasDoMotorista) {
      await prisma.campaignMotorista.create({
        data: {
          company_id: company.id,
          campaign_id: campanha.id,
          motorista_id: motoristProfile!.id,
          status: 'ACTIVE',
          source: 'DRIVER_ACCEPTED',
          acceptance_date: daysAgo(randomInt(1, 30)),
        },
      });
    }
  }

  console.log(`✅ Created tablets and linked campaigns\n`);

  // ========================================================================
  // Leads Históricos (1000)
  // ========================================================================
  console.log('📊 Creating 1000 leads...');
  const statuses = ['PENDING', 'CONVERTED', 'INVALID'];
  let leadsCreated = 0;

  for (let i = 0; i < 1000; i++) {
    const motorista = randomElement(motoristasComTablet);
    const motoristProfile = await prisma.motoristProfile.findUnique({
      where: { user_id: motorista.id },
    });
    const campanha = randomElement(campanhas);

    const status = randomElement(statuses);
    const leadCreatedAt = daysAgo(randomInt(1, 60));

    // Criar scan event primeiro
    const scanEvent = await prisma.scanEvent.create({
      data: {
        company_id: company.id,
        campaign_id: campanha.id,
        motorista_id: motoristProfile!.id,
        scanned_at: leadCreatedAt,
        visitor_hash: `hash_${i}`,
        is_unique: Math.random() > 0.3, // 70% únicos
        ip_address: `192.168.${randomInt(0, 255)}.${randomInt(1, 255)}`,
      },
    });

    // Criar lead
    const lead = await prisma.lead.create({
      data: {
        company_id: company.id,
        campaign_id: campanha.id,
        motorista_id: motoristProfile!.id,
        scan_event_id: scanEvent.id,
        status: status,
        qr_scan_time: leadCreatedAt,
        contact_name: `Lead ${i}`,
        contact_email: `lead${i}@test.com`,
        contact_phone: `11 9${randomInt(8000, 9999)}-${randomInt(1000, 9999)}`,
        ip_address: `192.168.${randomInt(0, 255)}.${randomInt(1, 255)}`,
        converted_at: status === 'CONVERTED' ? daysAgo(randomInt(0, 10)) : null,
        conversion_value:
          status === 'CONVERTED' ? randomFloat(50, 500) : null,
      },
    });

    // Se lead convertido, criar earning
    if (status === 'CONVERTED') {
      const conversionValue = lead.conversion_value || 100;
      const commissionRate = new Decimal(0.3); // 30%
      const earningAmount = conversionValue * 0.3;

      const earningStatus = Math.random() > 0.7 ? 'PAID' : 'PENDING';
      await prisma.driverEarning.create({
        data: {
          motorista_id: motoristProfile!.id,
          company_id: company.id,
          lead_id: lead.id,
          amount: earningAmount,
          commission_rate: new Decimal('0.3000'),
          status: earningStatus,
          description: `Comissão do lead #${lead.id}`,
          paid_at: earningStatus === 'PAID' ? daysAgo(randomInt(0, 30)) : null,
        },
      });
    }

    if (i % 100 === 0) console.log(`  ${i}/1000 leads created...`);
    leadsCreated++;
  }
  console.log(`✅ Created ${leadsCreated} leads\n`);

  // ========================================================================
  // Impressões & Scans (dados de exibição)
  // ========================================================================
  console.log('👁️  Creating impression & scan events...');

  for (const motorista of motoristasComTablet.slice(0, 10)) {
    const motoristProfile = await prisma.motoristProfile.findUnique({
      where: { user_id: motorista.id },
    });
    const tablet = await prisma.tabletDevice.findFirst({
      where: { motorista_id: motoristProfile!.id },
    });

    // Criar sessão de tablet
    const session = await prisma.tabletSession.create({
      data: {
        company_id: company.id,
        motorista_id: motoristProfile!.id,
        device_id: tablet!.id,
        started_at: daysAgo(randomInt(1, 7)),
        ended_at: daysAgo(randomInt(0, 6)),
        impressions_count: randomInt(10, 100),
        scans_count: randomInt(1, 20),
      },
    });

    // 10 impressões por sessão
    for (let i = 0; i < 10; i++) {
      const campanha = randomElement(campanhas);
      await prisma.impressionEvent.create({
        data: {
          company_id: company.id,
          campaign_id: campanha.id,
          motorista_id: motoristProfile!.id,
          device_id: tablet!.id,
          session_id: session.id,
          shown_at: daysAgo(randomInt(0, 7)),
          duration_ms: randomInt(5000, 30000),
        },
      });
    }
  }

  console.log('✅ Created impressions and sessions\n');

  // ========================================================================
  // Summary
  // ========================================================================
  const counts = {
    company: await prisma.company.count(),
    users: await prisma.user.count(),
    motoristas: await prisma.motoristProfile.count(),
    anunciantes: await prisma.anuncianteProfile.count(),
    campanhas: await prisma.campaign.count(),
    leads: await prisma.lead.count(),
    earnings: await prisma.driverEarning.count(),
    tablets: await prisma.tabletDevice.count(),
    scans: await prisma.scanEvent.count(),
  };

  console.log('✨ Seed complete!\n');
  console.log('📊 Database state:');
  Object.entries(counts).forEach(([key, value]) => {
    console.log(`  ${key.padEnd(15)} ${value}`);
  });

  console.log('\n✅ Test credentials:');
  console.log(`  Admin:     admin@fastlead.com.br / admin123`);
  console.log(`  Motorista: motorista1@driver.com / driver123`);
  console.log(`  Anunciante: anunciante1@company.com / password123`);
}

// Add this import at the top
import { Decimal } from '@prisma/client/runtime/library';

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
