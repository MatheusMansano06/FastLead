import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...\n');

  // Clean up existing data
  console.log('🧹 Cleaning up existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.campaignMotorista.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.anuncianteProfile.deleteMany();
  await prisma.motoristProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // ========================================================================
  // Create Companies
  // ========================================================================
  console.log('\n📱 Creating companies...');

  const fastleadCompany = await prisma.company.create({
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
    },
  });

  console.log(`✅ Created company: ${fastleadCompany.name}`);

  // ========================================================================
  // Create Users
  // ========================================================================
  console.log('\n👥 Creating users...');

  // Admin user
  const adminUser = await prisma.user.create({
    data: {
      company_id: fastleadCompany.id,
      email: 'admin@fastlead.com.br',
      password_hash: await bcrypt.hash('admin123', 10),
      name: 'Admin FastLead',
      type: 'ADMIN',
      phone: '+55 11 98765-4321',
      is_active: true,
      is_verified: true,
    },
  });

  // Motorista users
  const motorista1 = await prisma.user.create({
    data: {
      company_id: fastleadCompany.id,
      email: 'joao.silva@motorista.com',
      password_hash: await bcrypt.hash('motorista123', 10),
      name: 'João Silva',
      type: 'MOTORISTA',
      phone: '+55 11 99876-5432',
      is_active: true,
      is_verified: true,
    },
  });

  const motorista2 = await prisma.user.create({
    data: {
      company_id: fastleadCompany.id,
      email: 'maria.santos@motorista.com',
      password_hash: await bcrypt.hash('motorista123', 10),
      name: 'Maria Santos',
      type: 'MOTORISTA',
      phone: '+55 11 99876-5433',
      is_active: true,
      is_verified: true,
    },
  });

  const motorista3 = await prisma.user.create({
    data: {
      company_id: fastleadCompany.id,
      email: 'pedro.oliveira@motorista.com',
      password_hash: await bcrypt.hash('motorista123', 10),
      name: 'Pedro Oliveira',
      type: 'MOTORISTA',
      phone: '+55 11 99876-5434',
      is_active: true,
      is_verified: true,
    },
  });

  // Anunciante users
  const anunciante1 = await prisma.user.create({
    data: {
      company_id: fastleadCompany.id,
      email: 'vendas@patriani.com.br',
      password_hash: await bcrypt.hash('anunciante123', 10),
      name: 'Carlos Patriani',
      type: 'ANUNCIANTE',
      phone: '+55 11 98765-0000',
      is_active: true,
      is_verified: true,
    },
  });

  const anunciante2 = await prisma.user.create({
    data: {
      company_id: fastleadCompany.id,
      email: 'marketing@techstart.com',
      password_hash: await bcrypt.hash('anunciante123', 10),
      name: 'Ana Costa',
      type: 'ANUNCIANTE',
      phone: '+55 11 98765-0001',
      is_active: true,
      is_verified: true,
    },
  });

  console.log(`✅ Created 5 users (1 admin + 3 motoristas + 2 anunciantes)`);

  // ========================================================================
  // Create Motorista Profiles
  // ========================================================================
  console.log('\n🚕 Creating motorista profiles...');

  const motoristaProfile1 = await prisma.motoristProfile.create({
    data: {
      company_id: fastleadCompany.id,
      user_id: motorista1.id,
      vehicle_info: 'Toyota Prius 2022 - Hybrid',
      license_plate: 'ABC-1234',
      phone: '+55 11 99876-5432',
      total_earnings: 1250.5,
      status: 'ATIVO',
      last_online_at: new Date(),
      bank_account: '12345-6 / 0000000123456-7',
    },
  });

  const motoristaProfile2 = await prisma.motoristProfile.create({
    data: {
      company_id: fastleadCompany.id,
      user_id: motorista2.id,
      vehicle_info: 'Chevrolet Onix 2021',
      license_plate: 'XYZ-5678',
      phone: '+55 11 99876-5433',
      total_earnings: 890.75,
      status: 'ATIVO',
      last_online_at: new Date(),
      bank_account: '12345-6 / 0000000123457-8',
    },
  });

  const motoristaProfile3 = await prisma.motoristProfile.create({
    data: {
      company_id: fastleadCompany.id,
      user_id: motorista3.id,
      vehicle_info: 'Hyundai HB20 2020',
      license_plate: 'DEF-9012',
      phone: '+55 11 99876-5434',
      total_earnings: 650.25,
      status: 'INATIVO',
      bank_account: '12345-6 / 0000000123458-9',
    },
  });

  console.log(`✅ Created 3 motorista profiles`);

  // ========================================================================
  // Create Anunciante Profiles
  // ========================================================================
  console.log('\n📢 Creating anunciante profiles...');

  const anuncianteProfile1 = await prisma.anuncianteProfile.create({
    data: {
      company_id: fastleadCompany.id,
      user_id: anunciante1.id,
      company_name: 'Patriani Imóveis',
      document_number: '98765432000199',
      industry: 'Real Estate',
      total_budget: 5000.0,
      total_spent: 1250.0,
      contact_person: 'Carlos Patriani',
    },
  });

  const anuncianteProfile2 = await prisma.anuncianteProfile.create({
    data: {
      company_id: fastleadCompany.id,
      user_id: anunciante2.id,
      company_name: 'TechStart Inovação',
      document_number: '11223344000155',
      industry: 'Technology',
      total_budget: 8000.0,
      total_spent: 3500.0,
      contact_person: 'Ana Costa',
    },
  });

  console.log(`✅ Created 2 anunciante profiles`);

  // ========================================================================
  // Create Campaigns
  // ========================================================================
  console.log('\n📊 Creating campaigns...');

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const campaign1 = await prisma.campaign.create({
    data: {
      company_id: fastleadCompany.id,
      anunciante_id: anuncianteProfile1.id,
      created_by_id: anunciante1.id,
      title: 'Apartamentos Patriani - Promoção Julho',
      description: 'Aproveite as melhores ofertas de imóveis em São Paulo',
      image_url: 'https://fastlead.com.br/campaigns/patriani-july.jpg',
      qr_code_data: 'https://patriani.com.br/qr/camp-2024-07-001',
      qr_code_image_url: 'https://fastlead.com.br/qrcodes/patriani-july.png',
      status: 'ACTIVE',
      start_date: startDate,
      end_date: endDate,
      target_vehicles: 3,
      total_investment: 3000.0,
      price_per_lead: 30.0,
      daily_budget: 100.0,
      total_leads: 120,
      unique_scans: 145,
      conversions: 12,
    },
  });

  const campaign2 = await prisma.campaign.create({
    data: {
      company_id: fastleadCompany.id,
      anunciante_id: anuncianteProfile2.id,
      created_by_id: anunciante2.id,
      title: 'TechStart - Plataforma de IA',
      description: 'Conheça a revolução da inteligência artificial para seu negócio',
      image_url: 'https://fastlead.com.br/campaigns/techstart-ai.jpg',
      qr_code_data: 'https://techstart.com/qr/camp-2024-07-001',
      qr_code_image_url: 'https://fastlead.com.br/qrcodes/techstart-ai.png',
      status: 'ACTIVE',
      start_date: startDate,
      end_date: endDate,
      target_vehicles: 2,
      total_investment: 2500.0,
      price_per_lead: 25.0,
      daily_budget: 83.33,
      total_leads: 95,
      unique_scans: 110,
      conversions: 8,
    },
  });

  await prisma.campaign.create({
    data: {
      company_id: fastleadCompany.id,
      anunciante_id: anuncianteProfile1.id,
      created_by_id: anunciante1.id,
      title: 'Patriani - Novas Unidades Centro',
      description: 'Conheça os novos empreendimentos no coração da cidade',
      image_url: 'https://fastlead.com.br/campaigns/patriani-centro.jpg',
      qr_code_data: 'https://patriani.com.br/qr/camp-2024-07-002',
      qr_code_image_url: 'https://fastlead.com.br/qrcodes/patriani-centro.png',
      status: 'DRAFT',
      start_date: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      end_date: new Date(now.getFullYear(), now.getMonth() + 2, 0),
      target_vehicles: 5,
      total_investment: 5000.0,
      price_per_lead: 35.0,
      daily_budget: 166.67,
    },
  });

  console.log(`✅ Created 3 campaigns`);

  // ========================================================================
  // Create Campaign-Motorista Relationships
  // ========================================================================
  console.log('\n🔗 Creating campaign-motorista relationships...');

  await prisma.campaignMotorista.create({
    data: {
      company_id: fastleadCompany.id,
      campaign_id: campaign1.id,
      motorista_id: motoristaProfile1.id,
      status: 'ACTIVE',
      acceptance_date: new Date(),
      scans_count: 50,
      leads_generated: 50,
    },
  });

  await prisma.campaignMotorista.create({
    data: {
      company_id: fastleadCompany.id,
      campaign_id: campaign1.id,
      motorista_id: motoristaProfile2.id,
      status: 'ACTIVE',
      acceptance_date: new Date(),
      scans_count: 40,
      leads_generated: 40,
    },
  });

  await prisma.campaignMotorista.create({
    data: {
      company_id: fastleadCompany.id,
      campaign_id: campaign1.id,
      motorista_id: motoristaProfile3.id,
      status: 'ACTIVE',
      acceptance_date: new Date(),
      scans_count: 30,
      leads_generated: 30,
    },
  });

  await prisma.campaignMotorista.create({
    data: {
      company_id: fastleadCompany.id,
      campaign_id: campaign2.id,
      motorista_id: motoristaProfile1.id,
      status: 'ACTIVE',
      acceptance_date: new Date(),
      scans_count: 35,
      leads_generated: 35,
    },
  });

  await prisma.campaignMotorista.create({
    data: {
      company_id: fastleadCompany.id,
      campaign_id: campaign2.id,
      motorista_id: motoristaProfile2.id,
      status: 'ACTIVE',
      acceptance_date: new Date(),
      scans_count: 40,
      leads_generated: 40,
    },
  });

  console.log(`✅ Created 5 campaign-motorista relationships`);

  // ========================================================================
  // Create Leads
  // ========================================================================
  console.log('\n📍 Creating leads...');

  const leads = [];
  for (let i = 0; i < 10; i++) {
    leads.push(
      await prisma.lead.create({
        data: {
          company_id: fastleadCompany.id,
          campaign_id: campaign1.id,
          motorista_id: motoristaProfile1.id,
          user_id: motorista1.id,
          status: i < 7 ? 'CONVERTED' : 'PENDING',
          qr_scan_time: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          user_device: 'iPhone 14 Pro / Safari',
          ip_address: `192.168.1.${100 + i}`,
          latitude: -23.5505 + (Math.random() - 0.5) * 0.1,
          longitude: -46.6333 + (Math.random() - 0.5) * 0.1,
          converted_at: i < 7 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : null,
          conversion_value: i < 7 ? 150000 : null,
        },
      })
    );
  }

  for (let i = 0; i < 8; i++) {
    leads.push(
      await prisma.lead.create({
        data: {
          company_id: fastleadCompany.id,
          campaign_id: campaign2.id,
          motorista_id: motoristaProfile2.id,
          user_id: motorista2.id,
          status: i < 6 ? 'CONVERTED' : 'PENDING',
          qr_scan_time: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          user_device: 'Samsung Galaxy S23 / Chrome',
          ip_address: `192.168.1.${200 + i}`,
          latitude: -23.5505 + (Math.random() - 0.5) * 0.1,
          longitude: -46.6333 + (Math.random() - 0.5) * 0.1,
          converted_at: i < 6 ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : null,
          conversion_value: i < 6 ? 5999 : null,
        },
      })
    );
  }

  console.log(`✅ Created 18 leads`);

  // ========================================================================
  // Create Payments
  // ========================================================================
  console.log('\n💰 Creating payments...');

  await prisma.payment.create({
    data: {
      company_id: fastleadCompany.id,
      motorista_id: motoristaProfile1.id,
      campaign_id: campaign1.id,
      amount: 1500.0,
      payment_type: 'PER_LEAD',
      status: 'COMPLETED',
      period_start: startDate,
      period_end: endDate,
      leads_count: 50,
      paid_at: new Date(),
    },
  });

  await prisma.payment.create({
    data: {
      company_id: fastleadCompany.id,
      motorista_id: motoristaProfile2.id,
      campaign_id: campaign1.id,
      amount: 1200.0,
      payment_type: 'PER_LEAD',
      status: 'PENDING',
      period_start: startDate,
      period_end: endDate,
      leads_count: 40,
    },
  });

  await prisma.payment.create({
    data: {
      company_id: fastleadCompany.id,
      motorista_id: motoristaProfile1.id,
      campaign_id: campaign2.id,
      amount: 875.0,
      payment_type: 'PER_LEAD',
      status: 'PENDING',
      period_start: startDate,
      period_end: endDate,
      leads_count: 35,
    },
  });

  console.log(`✅ Created 3 payments`);

  // ========================================================================
  // Create Audit Logs
  // ========================================================================
  console.log('\n📋 Creating audit logs...');

  await prisma.auditLog.create({
    data: {
      company_id: fastleadCompany.id,
      user_id: adminUser.id,
      action: 'CREATE',
      resource_type: 'Campaign',
      resource_id: campaign1.id,
      new_values: JSON.stringify({ title: campaign1.title, status: campaign1.status }),
      description: 'Created campaign for Patriani',
      ip_address: '192.168.1.10',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
  });

  await prisma.auditLog.create({
    data: {
      company_id: fastleadCompany.id,
      user_id: anunciante1.id,
      action: 'LOGIN',
      resource_type: 'User',
      resource_id: anunciante1.id,
      description: 'User logged in',
      ip_address: '192.168.1.20',
    },
  });

  console.log(`✅ Created 2 audit logs`);

  // ========================================================================
  // Summary
  // ========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ Seed completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   • Companies: 1`);
  console.log(`   • Users: 5 (1 admin + 3 motoristas + 2 anunciantes)`);
  console.log(`   • Motorista Profiles: 3`);
  console.log(`   • Anunciante Profiles: 2`);
  console.log(`   • Campaigns: 3`);
  console.log(`   • Campaign-Motorista Relationships: 5`);
  console.log(`   • Leads: 18`);
  console.log(`   • Payments: 3`);
  console.log(`   • Audit Logs: 2`);
  console.log('='.repeat(60) + '\n');

  console.log('🔑 Test Credentials:');
  console.log(`   Admin: admin@fastlead.com.br / admin123`);
  console.log(`   Motorista 1: joao.silva@motorista.com / motorista123`);
  console.log(`   Anunciante 1: vendas@patriani.com.br / anunciante123\n`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
