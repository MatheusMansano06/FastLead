/**
 * Contas de teste para o piloto/demonstração.
 *
 * IMPORTANTE — o que este script NÃO faz: não cria scan, impressão nem lead.
 * Só cria CONTAS. Todo número que aparecer no painel vai ter sido gerado por
 * alguém mexendo no sistema de verdade. Semear métrica deixaria o painel
 * bonito e mentiroso, que é justamente o problema que já tivemos aqui.
 *
 *   npm run db:seed:demo
 *
 * É idempotente: rodar duas vezes não duplica ninguém.
 */

import { PrismaClient, RideApp, RideCategory } from '@prisma/client';
import { hashPassword } from '../src/utils/password';
import { regionForUF } from '../src/utils/segmentation';

const prisma = new PrismaClient();

/** Senha única para todas as contas de teste — facilita passar para os sócios. */
const SENHA = process.env.DEMO_PASSWORD || 'FastLead@2026';

interface EmpresaSeed {
  nome: string;
  fantasia: string;
  ramo: string;
  responsavel: string;
  email: string;
  cnpj: string;
  site: string;
  cargo: string;
}

const EMPRESAS: EmpresaSeed[] = [
  {
    nome: 'Pizzaria Forno de Minas LTDA',
    fantasia: 'Forno de Minas',
    ramo: 'Alimentação',
    responsavel: 'Ricardo Almeida',
    email: 'ricardo@fornodeminas.com.br',
    cnpj: '12345678000190',
    site: 'https://fornodeminas.com.br',
    cargo: 'Sócio-proprietário',
  },
  {
    nome: 'PowerFit Academias S/A',
    fantasia: 'PowerFit',
    ramo: 'Academia / Fitness',
    responsavel: 'Juliana Castro',
    email: 'juliana@powerfit.com.br',
    cnpj: '23456789000181',
    site: 'https://powerfit.com.br',
    cargo: 'Gerente de Marketing',
  },
  {
    nome: 'Clínica OdontoSorriso LTDA',
    fantasia: 'OdontoSorriso',
    ramo: 'Odontologia',
    responsavel: 'Dr. Fernando Reis',
    email: 'fernando@odontosorriso.com.br',
    cnpj: '34567890000172',
    site: 'https://odontosorriso.com.br',
    cargo: 'Diretor Clínico',
  },
  {
    nome: 'Imobiliária Novo Lar LTDA',
    fantasia: 'Novo Lar Imóveis',
    ramo: 'Imobiliário',
    responsavel: 'Patrícia Nunes',
    email: 'patricia@novolarimoveis.com.br',
    cnpj: '45678901000163',
    site: 'https://novolarimoveis.com.br',
    cargo: 'Diretora Comercial',
  },
  {
    nome: 'Wizard Idiomas Unidade Centro',
    fantasia: 'Wizard Centro',
    ramo: 'Educação / Idiomas',
    responsavel: 'Marcelo Tavares',
    email: 'marcelo@wizardcentro.com.br',
    cnpj: '56789012000154',
    site: 'https://wizardcentro.com.br',
    cargo: 'Franqueado',
  },
  {
    nome: 'PetLovers Comércio de Animais LTDA',
    fantasia: 'PetLovers',
    ramo: 'Pet Shop',
    responsavel: 'Camila Duarte',
    email: 'camila@petlovers.com.br',
    cnpj: '67890123000145',
    site: 'https://petlovers.com.br',
    cargo: 'Sócia',
  },
  {
    nome: 'Ótica Visão Clara LTDA',
    fantasia: 'Visão Clara',
    ramo: 'Óptica / Saúde',
    responsavel: 'Anderson Lima',
    email: 'anderson@visaoclara.com.br',
    cnpj: '78901234000136',
    site: 'https://visaoclara.com.br',
    cargo: 'Proprietário',
  },
  {
    nome: 'Construtora Alicerce S/A',
    fantasia: 'Alicerce',
    ramo: 'Construção Civil',
    responsavel: 'Roberto Menezes',
    email: 'roberto@alicerce.com.br',
    cnpj: '89012345000127',
    site: 'https://alicerce.com.br',
    cargo: 'Diretor de Vendas',
  },
];

interface MotoristaSeed {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  cidade: string;
  uf: string;
  veiculo: string;
  placa: string;
  apps: RideApp[];
  categorias: RideCategory[];
  bio: string;
}

// Espalhados de propósito por região, app e modalidade — é o que permite
// exercitar os filtros do MASTER e a segmentação das campanhas.
const MOTORISTAS: MotoristaSeed[] = [
  {
    nome: 'Eduardo Tanaka',
    email: 'eduardo.tanaka@motorista.teste',
    cpf: '11122233396',
    telefone: '11987650001',
    cidade: 'São Paulo',
    uf: 'SP',
    veiculo: 'Toyota Corolla 2022 prata',
    placa: 'FLA1B01',
    apps: ['UBER', 'NOVENOVE'],
    categorias: ['UBER_X', 'UBER_COMFORT', 'NOVENOVE_POP'],
    bio: 'Rodo na zona sul de manhã e no centro à tarde. Carro sempre higienizado.',
  },
  {
    nome: 'Marcos Vinícius Pereira',
    email: 'marcos.pereira@motorista.teste',
    cpf: '22233344487',
    telefone: '11987650002',
    cidade: 'São Paulo',
    uf: 'SP',
    veiculo: 'Honda Civic 2023 preto',
    placa: 'FLA1B02',
    apps: ['UBER'],
    categorias: ['UBER_BLACK', 'UBER_COMFORT'],
    bio: 'Foco em corridas executivas e aeroporto. Nota 4.95.',
  },
  {
    nome: 'Aline Ferreira',
    email: 'aline.ferreira@motorista.teste',
    cpf: '33344455578',
    telefone: '21987650003',
    cidade: 'Rio de Janeiro',
    uf: 'RJ',
    veiculo: 'Hyundai HB20 2021 branco',
    placa: 'FLA1B03',
    apps: ['NOVENOVE', 'INDRIVE'],
    categorias: ['NOVENOVE_POP', 'NOVENOVE_COMFORT', 'INDRIVE_ECONOMY'],
    bio: 'Zona sul carioca, das 6h às 15h. Muita corrida de turista.',
  },
  {
    nome: 'Rafael Monteiro',
    email: 'rafael.monteiro@motorista.teste',
    cpf: '44455566669',
    telefone: '21987650004',
    cidade: 'Niterói',
    uf: 'RJ',
    veiculo: 'Honda PCX 160',
    placa: 'FLA1B04',
    apps: ['UBER', 'NOVENOVE'],
    categorias: ['UBER_MOTO', 'UBER_FLASH_MOTO', 'NOVENOVE_MOTO'],
    bio: 'Moto, entregas rápidas e corridas curtas. Altíssimo giro de passageiro.',
  },
  {
    nome: 'Débora Cristina Lopes',
    email: 'debora.lopes@motorista.teste',
    cpf: '55566677750',
    telefone: '31987650005',
    cidade: 'Belo Horizonte',
    uf: 'MG',
    veiculo: 'Chevrolet Onix 2022 prata',
    placa: 'FLA1B05',
    apps: ['UBER', 'NOVENOVE'],
    categorias: ['UBER_X', 'NOVENOVE_POP'],
    bio: 'Savassi e região hospitalar. Público classe A/B.',
  },
  {
    nome: 'Anderson Ribeiro',
    email: 'anderson.ribeiro@motorista.teste',
    cpf: '66677788841',
    telefone: '41987650006',
    cidade: 'Curitiba',
    uf: 'PR',
    veiculo: 'VW Virtus 2023 cinza',
    placa: 'FLA1B06',
    apps: ['UBER', 'CABIFY'],
    categorias: ['UBER_COMFORT', 'CABIFY_EXECUTIVO'],
    bio: 'Batel e centro empresarial. Corridas corporativas.',
  },
  {
    nome: 'Fernanda Moraes',
    email: 'fernanda.moraes@motorista.teste',
    cpf: '77788899932',
    telefone: '51987650007',
    cidade: 'Porto Alegre',
    uf: 'RS',
    veiculo: 'Fiat Cronos 2022 branco',
    placa: 'FLA1B07',
    apps: ['NOVENOVE', 'INDRIVE'],
    categorias: ['NOVENOVE_POP', 'INDRIVE_COMFORT'],
    bio: 'Moinhos de Vento e zona norte. Turno da tarde e noite.',
  },
  {
    nome: 'José Carlos Nascimento',
    email: 'jose.nascimento@motorista.teste',
    cpf: '88899900023',
    telefone: '71987650008',
    cidade: 'Salvador',
    uf: 'BA',
    veiculo: 'Renault Kwid 2021 vermelho',
    placa: 'FLA1B08',
    apps: ['NOVENOVE'],
    categorias: ['NOVENOVE_POP', 'NOVENOVE_ENTREGA'],
    bio: 'Orla e Pituba. Muita corrida de praia no fim de semana.',
  },
  {
    nome: 'Luciana Barreto',
    email: 'luciana.barreto@motorista.teste',
    cpf: '99900011114',
    telefone: '81987650009',
    cidade: 'Recife',
    uf: 'PE',
    veiculo: 'Nissan Versa 2022 prata',
    placa: 'FLA1B09',
    apps: ['UBER', 'INDRIVE'],
    categorias: ['UBER_X', 'INDRIVE_ECONOMY'],
    bio: 'Boa Viagem e centro. Perfil de passageiro executivo e turista.',
  },
  {
    nome: 'Paulo Henrique Dias',
    email: 'paulo.dias@motorista.teste',
    cpf: '10111213145',
    telefone: '85987650010',
    cidade: 'Fortaleza',
    uf: 'CE',
    veiculo: 'Toyota Etios 2020 prata',
    placa: 'FLA1B10',
    apps: ['NOVENOVE', 'UBER'],
    categorias: ['NOVENOVE_POP', 'UBER_X'],
    bio: 'Meireles e Aldeota, turno integral.',
  },
  {
    nome: 'Thiago Albuquerque',
    email: 'thiago.albuquerque@motorista.teste',
    cpf: '12131415166',
    telefone: '61987650011',
    cidade: 'Brasília',
    uf: 'DF',
    veiculo: 'Toyota Corolla Cross 2023 preto',
    placa: 'FLA1B11',
    apps: ['UBER', 'CABIFY'],
    categorias: ['UBER_BLACK', 'CABIFY_EXECUTIVO'],
    bio: 'Asa Sul, Asa Norte e aeroporto. Público de alto poder aquisitivo.',
  },
  {
    nome: 'Simone Rocha',
    email: 'simone.rocha@motorista.teste',
    cpf: '13141516187',
    telefone: '92987650012',
    cidade: 'Manaus',
    uf: 'AM',
    veiculo: 'Chevrolet Prisma 2019 branco',
    placa: 'FLA1B12',
    apps: ['NOVENOVE', 'INDRIVE'],
    categorias: ['NOVENOVE_POP', 'INDRIVE_ECONOMY'],
    bio: 'Centro e zona leste. Turno da manhã.',
  },
];

async function criarEmpresa(e: EmpresaSeed, senhaHash: string) {
  // Cada cadastro é seu próprio tenant — é assim que o registro real funciona.
  const company = await prisma.company.upsert({
    where: { email: e.email },
    update: {},
    create: {
      name: e.nome,
      email: e.email,
      website: e.site,
      document_number: e.cnpj,
      status: 'active',
    },
  });

  const user = await prisma.user.upsert({
    where: { company_id_email: { company_id: company.id, email: e.email } },
    update: { password_hash: senhaHash, name: e.responsavel },
    create: {
      company_id: company.id,
      email: e.email,
      password_hash: senhaHash,
      name: e.responsavel,
      type: 'ANUNCIANTE',
      is_active: true,
      is_verified: true,
    },
  });

  await prisma.anuncianteProfile.upsert({
    where: { user_id: user.id },
    update: {},
    create: {
      company_id: company.id,
      user_id: user.id,
      company_name: e.nome,
      trade_name: e.fantasia,
      document_number: e.cnpj,
      industry: e.ramo,
      website: e.site,
      role: e.cargo,
      contact_person: e.responsavel,
    },
  });
}

async function criarMotorista(m: MotoristaSeed, senhaHash: string) {
  const company = await prisma.company.upsert({
    where: { email: m.email },
    update: {},
    create: { name: m.nome, email: m.email, phone: m.telefone, status: 'active' },
  });

  const user = await prisma.user.upsert({
    where: { company_id_email: { company_id: company.id, email: m.email } },
    update: { password_hash: senhaHash, name: m.nome },
    create: {
      company_id: company.id,
      email: m.email,
      password_hash: senhaHash,
      name: m.nome,
      type: 'MOTORISTA',
      phone: m.telefone,
      is_active: true,
      is_verified: true,
    },
  });

  await prisma.motoristProfile.upsert({
    where: { user_id: user.id },
    update: {
      city: m.cidade,
      state: m.uf,
      region: regionForUF(m.uf),
      ride_apps: { set: m.apps },
      ride_categories: { set: m.categorias },
    },
    create: {
      company_id: company.id,
      user_id: user.id,
      vehicle_info: m.veiculo,
      license_plate: m.placa,
      phone: m.telefone,
      cpf: m.cpf,
      bio: m.bio,
      city: m.cidade,
      state: m.uf,
      region: regionForUF(m.uf),
      ride_apps: m.apps,
      ride_categories: m.categorias,
      // INATIVO de propósito: só vira ATIVO quando parear um tablet de verdade.
      status: 'INATIVO',
    },
  });
}

async function main() {
  const senhaHash = await hashPassword(SENHA);

  console.log(`Criando ${EMPRESAS.length} empresas…`);
  for (const e of EMPRESAS) await criarEmpresa(e, senhaHash);

  console.log(`Criando ${MOTORISTAS.length} motoristas…`);
  for (const m of MOTORISTAS) await criarMotorista(m, senhaHash);

  const totais = {
    empresas: await prisma.anuncianteProfile.count(),
    motoristas: await prisma.motoristProfile.count(),
    campanhas: await prisma.campaign.count(),
    impressoes: await prisma.impressionEvent.count(),
    scans: await prisma.scanEvent.count(),
    leads: await prisma.lead.count(),
  };

  console.log('\n  Contas criadas. Senha de todas: ' + SENHA);
  console.log('  ' + JSON.stringify(totais));
  console.log('\n  Impressões/scans/leads em zero de propósito —');
  console.log('  esses números só sobem com uso real.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
