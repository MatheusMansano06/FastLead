import { Region, RideApp, RideCategory } from '@prisma/client';

/** UF -> Região do IBGE. Fonte única: a região do motorista é sempre derivada da UF. */
export const UF_TO_REGION: Record<string, Region> = {
  AC: 'NORTE',
  AP: 'NORTE',
  AM: 'NORTE',
  PA: 'NORTE',
  RO: 'NORTE',
  RR: 'NORTE',
  TO: 'NORTE',
  AL: 'NORDESTE',
  BA: 'NORDESTE',
  CE: 'NORDESTE',
  MA: 'NORDESTE',
  PB: 'NORDESTE',
  PE: 'NORDESTE',
  PI: 'NORDESTE',
  RN: 'NORDESTE',
  SE: 'NORDESTE',
  DF: 'CENTRO_OESTE',
  GO: 'CENTRO_OESTE',
  MT: 'CENTRO_OESTE',
  MS: 'CENTRO_OESTE',
  ES: 'SUDESTE',
  MG: 'SUDESTE',
  RJ: 'SUDESTE',
  SP: 'SUDESTE',
  PR: 'SUL',
  RS: 'SUL',
  SC: 'SUL',
};

export const UFS = Object.keys(UF_TO_REGION).sort();

export const REGION_LABELS: Record<Region, string> = {
  NORTE: 'Norte',
  NORDESTE: 'Nordeste',
  CENTRO_OESTE: 'Centro-Oeste',
  SUDESTE: 'Sudeste',
  SUL: 'Sul',
};

export function regionForUF(uf?: string | null): Region | null {
  if (!uf) return null;
  return UF_TO_REGION[uf.trim().toUpperCase()] ?? null;
}

/** Expande regiões para a lista de UFs que elas contêm. */
export function ufsForRegions(regions: Region[]): string[] {
  if (!regions.length) return [];
  return UFS.filter((uf) => regions.includes(UF_TO_REGION[uf]));
}

export const RIDE_APP_LABELS: Record<RideApp, string> = {
  UBER: 'Uber',
  NOVENOVE: '99',
  INDRIVE: 'inDrive',
  CABIFY: 'Cabify',
  BLABLACAR: 'BlaBlaCar',
  TAXI: 'Táxi',
  OUTRO: 'Outro',
};

/** Cada modalidade pertence a um app — o filtro de categoria depende do app escolhido. */
export const CATEGORY_TO_APP: Record<RideCategory, RideApp> = {
  UBER_X: 'UBER',
  UBER_COMFORT: 'UBER',
  UBER_BLACK: 'UBER',
  UBER_MOTO: 'UBER',
  UBER_FLASH_MOTO: 'UBER',
  NOVENOVE_POP: 'NOVENOVE',
  NOVENOVE_COMFORT: 'NOVENOVE',
  NOVENOVE_MOTO: 'NOVENOVE',
  NOVENOVE_ENTREGA: 'NOVENOVE',
  INDRIVE_ECONOMY: 'INDRIVE',
  INDRIVE_COMFORT: 'INDRIVE',
  CABIFY_LITE: 'CABIFY',
  CABIFY_EXECUTIVO: 'CABIFY',
  BLABLACAR_CARONA: 'BLABLACAR',
  TAXI_COMUM: 'TAXI',
  TAXI_EXECUTIVO: 'TAXI',
};

export const RIDE_CATEGORY_LABELS: Record<RideCategory, string> = {
  UBER_X: 'UberX',
  UBER_COMFORT: 'Uber Comfort',
  UBER_BLACK: 'Uber Black',
  UBER_MOTO: 'Uber Moto',
  UBER_FLASH_MOTO: 'Uber Flash Moto',
  NOVENOVE_POP: '99Pop',
  NOVENOVE_COMFORT: '99Comfort',
  NOVENOVE_MOTO: '99Moto',
  NOVENOVE_ENTREGA: '99Entrega',
  INDRIVE_ECONOMY: 'inDrive Economy',
  INDRIVE_COMFORT: 'inDrive Comfort',
  CABIFY_LITE: 'Cabify Lite',
  CABIFY_EXECUTIVO: 'Cabify Executivo',
  BLABLACAR_CARONA: 'BlaBlaCar Carona',
  TAXI_COMUM: 'Táxi Comum',
  TAXI_EXECUTIVO: 'Táxi Executivo',
};

/** Payload que o frontend consome para montar os filtros. */
export function segmentationCatalog() {
  return {
    regions: (Object.keys(REGION_LABELS) as Region[]).map((value) => ({
      value,
      label: REGION_LABELS[value],
      ufs: ufsForRegions([value]),
    })),
    states: UFS.map((uf) => ({ value: uf, label: uf, region: UF_TO_REGION[uf] })),
    rideApps: (Object.keys(RIDE_APP_LABELS) as RideApp[]).map((value) => ({
      value,
      label: RIDE_APP_LABELS[value],
    })),
    rideCategories: (Object.keys(RIDE_CATEGORY_LABELS) as RideCategory[]).map((value) => ({
      value,
      label: RIDE_CATEGORY_LABELS[value],
      app: CATEGORY_TO_APP[value],
    })),
  };
}
