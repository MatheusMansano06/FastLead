/**
 * Praças de veiculação do simulador da landing.
 *
 * O vocabulário aqui é o MESMO do backend (`src/utils/segmentation.ts`):
 * região IBGE → UF → cidade. O simulador da landing e a criação de campanha no
 * painel precisam falar a mesma língua, senão o anunciante monta um plano que
 * não existe na hora de contratar.
 *
 * `tier` só existe no frontend — é o degrau de preço do rate card, não um
 * conceito de domínio do backend.
 */

/** UF → região IBGE. Espelha UF_TO_REGION do backend. */
export const UF_PARA_REGIAO = {
  AC: 'NORTE', AP: 'NORTE', AM: 'NORTE', PA: 'NORTE', RO: 'NORTE', RR: 'NORTE', TO: 'NORTE',
  AL: 'NORDESTE', BA: 'NORDESTE', CE: 'NORDESTE', MA: 'NORDESTE', PB: 'NORDESTE',
  PE: 'NORDESTE', PI: 'NORDESTE', RN: 'NORDESTE', SE: 'NORDESTE',
  DF: 'CENTRO_OESTE', GO: 'CENTRO_OESTE', MT: 'CENTRO_OESTE', MS: 'CENTRO_OESTE',
  ES: 'SUDESTE', MG: 'SUDESTE', RJ: 'SUDESTE', SP: 'SUDESTE',
  PR: 'SUL', RS: 'SUL', SC: 'SUL',
};

export const REGIOES = [
  { id: 'SUDESTE', nome: 'Sudeste' },
  { id: 'SUL', nome: 'Sul' },
  { id: 'NORDESTE', nome: 'Nordeste' },
  { id: 'CENTRO_OESTE', nome: 'Centro-Oeste' },
  { id: 'NORTE', nome: 'Norte' },
];

export const NOME_UF = {
  AC: 'Acre', AL: 'Alagoas', AM: 'Amazonas', AP: 'Amapá', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão',
  MG: 'Minas Gerais', MS: 'Mato Grosso do Sul', MT: 'Mato Grosso', PA: 'Pará',
  PB: 'Paraíba', PE: 'Pernambuco', PI: 'Piauí', PR: 'Paraná', RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte', RO: 'Rondônia', RR: 'Roraima', RS: 'Rio Grande do Sul',
  SC: 'Santa Catarina', SE: 'Sergipe', SP: 'São Paulo', TO: 'Tocantins',
};

export const UFS = Object.keys(UF_PARA_REGIAO).sort();

/**
 * Cidades onde a rede opera ou tem operação prevista. Lista curada — capitais
 * e principais mercados de mobilidade urbana por aplicativo.
 */
export const CIDADES = [
  { cidade: 'São Paulo', uf: 'SP', tier: 'SP_CAPITAL' },
  { cidade: 'Rio de Janeiro', uf: 'RJ', tier: 'RJ_CAPITAL' },
  { cidade: 'Belo Horizonte', uf: 'MG', tier: 'CAPITAL' },
  { cidade: 'Brasília', uf: 'DF', tier: 'CAPITAL' },
  { cidade: 'Curitiba', uf: 'PR', tier: 'CAPITAL' },
  { cidade: 'Porto Alegre', uf: 'RS', tier: 'CAPITAL' },
  { cidade: 'Salvador', uf: 'BA', tier: 'CAPITAL' },
  { cidade: 'Recife', uf: 'PE', tier: 'CAPITAL' },
  { cidade: 'Fortaleza', uf: 'CE', tier: 'CAPITAL' },
  { cidade: 'Goiânia', uf: 'GO', tier: 'CAPITAL' },
  { cidade: 'Manaus', uf: 'AM', tier: 'CAPITAL' },
  { cidade: 'Belém', uf: 'PA', tier: 'CAPITAL' },
  { cidade: 'Florianópolis', uf: 'SC', tier: 'CAPITAL' },
  { cidade: 'Vitória', uf: 'ES', tier: 'CAPITAL' },
  { cidade: 'Natal', uf: 'RN', tier: 'CAPITAL' },
  { cidade: 'João Pessoa', uf: 'PB', tier: 'CAPITAL' },
  { cidade: 'Maceió', uf: 'AL', tier: 'CAPITAL' },
  { cidade: 'Campo Grande', uf: 'MS', tier: 'CAPITAL' },
  { cidade: 'Cuiabá', uf: 'MT', tier: 'CAPITAL' },
  { cidade: 'Teresina', uf: 'PI', tier: 'CAPITAL' },
  { cidade: 'São Luís', uf: 'MA', tier: 'CAPITAL' },
  { cidade: 'Aracaju', uf: 'SE', tier: 'CAPITAL' },
  { cidade: 'Campinas', uf: 'SP', tier: 'INTERIOR' },
  { cidade: 'Guarulhos', uf: 'SP', tier: 'INTERIOR' },
  { cidade: 'Santo André', uf: 'SP', tier: 'INTERIOR' },
  { cidade: 'São Bernardo do Campo', uf: 'SP', tier: 'INTERIOR' },
  { cidade: 'Osasco', uf: 'SP', tier: 'INTERIOR' },
  { cidade: 'Ribeirão Preto', uf: 'SP', tier: 'INTERIOR' },
  { cidade: 'Sorocaba', uf: 'SP', tier: 'INTERIOR' },
  { cidade: 'São José dos Campos', uf: 'SP', tier: 'INTERIOR' },
  { cidade: 'Santos', uf: 'SP', tier: 'INTERIOR' },
  { cidade: 'Niterói', uf: 'RJ', tier: 'INTERIOR' },
  { cidade: 'Duque de Caxias', uf: 'RJ', tier: 'INTERIOR' },
  { cidade: 'Uberlândia', uf: 'MG', tier: 'INTERIOR' },
  { cidade: 'Contagem', uf: 'MG', tier: 'INTERIOR' },
  { cidade: 'Londrina', uf: 'PR', tier: 'INTERIOR' },
  { cidade: 'Maringá', uf: 'PR', tier: 'INTERIOR' },
  { cidade: 'Joinville', uf: 'SC', tier: 'INTERIOR' },
  { cidade: 'Caxias do Sul', uf: 'RS', tier: 'INTERIOR' },
  { cidade: 'Feira de Santana', uf: 'BA', tier: 'INTERIOR' },
  { cidade: 'Jaboatão dos Guararapes', uf: 'PE', tier: 'INTERIOR' },
  { cidade: 'Ribeirão das Neves', uf: 'MG', tier: 'INTERIOR' },
];

/** Item de praça a partir de uma UF inteira: herda o tier da capital dela. */
export function pracaDaUF(uf) {
  const capital = CIDADES.find((c) => c.uf === uf && c.tier !== 'INTERIOR');
  return {
    id: `uf:${uf}`,
    tipo: 'estado',
    rotulo: `${NOME_UF[uf]} (${uf})`,
    uf,
    tier: capital?.tier ?? 'INTERIOR',
  };
}

/** Item de praça a partir de uma região: herda o maior tier das UFs dela. */
export function pracaDaRegiao(regiaoId) {
  const ufs = UFS.filter((uf) => UF_PARA_REGIAO[uf] === regiaoId);
  const tiers = ufs.map((uf) => pracaDaUF(uf).tier);
  const tier = tiers.includes('SP_CAPITAL')
    ? 'SP_CAPITAL'
    : tiers.includes('RJ_CAPITAL')
      ? 'RJ_CAPITAL'
      : tiers.includes('CAPITAL')
        ? 'CAPITAL'
        : 'INTERIOR';
  return {
    id: `regiao:${regiaoId}`,
    tipo: 'regiao',
    rotulo: REGIOES.find((r) => r.id === regiaoId)?.nome ?? regiaoId,
    ufs,
    tier,
  };
}

export function pracaDaCidade(c) {
  return {
    id: `cidade:${c.cidade}-${c.uf}`,
    tipo: 'cidade',
    rotulo: `${c.cidade} - ${c.uf}`,
    cidade: c.cidade,
    uf: c.uf,
    tier: c.tier,
  };
}

/** Normaliza para busca: sem acento, minúsculo. */
export const normalizar = (s) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
