// ============================================================================
// FastLead · Validações e máscaras (pt-BR)
// Regras de login, senha forte, e comprovação de empresa (CNPJ/CPF/telefone).
// ============================================================================

export const onlyDigits = (v = '') => String(v).replace(/\D+/g, '');

// ───────────────────────── Máscaras ─────────────────────────

export function maskCNPJ(v = '') {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskCPF(v = '') {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function maskPhone(v = '') {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskPlate(v = '') {
  // Aceita padrão antigo (AAA-0000) e Mercosul (AAA0A00)
  const s = String(v).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
  if (s.length <= 3) return s;
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}

export function maskCEP(v = '') {
  return onlyDigits(v).slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2');
}

// ───────────────────────── E-mail ─────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isValidEmail = (v = '') => EMAIL_RE.test(String(v).trim());

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br',
  'live.com', 'icloud.com', 'bol.com.br', 'uol.com.br', 'terra.com.br',
  'globo.com', 'proton.me', 'protonmail.com', 'aol.com', 'msn.com',
]);

/** E-mail corporativo = não é de provedor gratuito. Ajuda a comprovar a empresa. */
export function isCorporateEmail(v = '') {
  if (!isValidEmail(v)) return false;
  const domain = String(v).trim().toLowerCase().split('@')[1];
  return !FREE_EMAIL_DOMAINS.has(domain);
}

// ───────────────────────── Telefone BR ─────────────────────────

const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

/** Aceita fixo (10 díg.) ou celular (11 díg., 9 na frente), com DDD válido. */
export function isValidPhoneBR(v = '') {
  const d = onlyDigits(v);
  if (d.length !== 10 && d.length !== 11) return false;
  if (!VALID_DDDS.has(Number(d.slice(0, 2)))) return false;
  if (d.length === 11 && d[2] !== '9') return false;
  return true;
}

// ───────────────────────── CPF ─────────────────────────

export function isValidCPF(v = '') {
  const c = onlyDigits(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (len) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(c[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

// ───────────────────────── CNPJ ─────────────────────────

export function isValidCNPJ(v = '') {
  const c = onlyDigits(v);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (len) => {
    const weights =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(c[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(c[12]) && calc(13) === Number(c[13]);
}

// ───────────────────────── Senha forte ─────────────────────────

/** Retorna a checklist de regras da senha (usada no medidor visual). */
export function passwordRules(pwd = '') {
  return [
    { key: 'len', label: 'Mínimo de 8 caracteres', ok: pwd.length >= 8 },
    { key: 'upper', label: 'Uma letra maiúscula', ok: /[A-Z]/.test(pwd) },
    { key: 'lower', label: 'Uma letra minúscula', ok: /[a-z]/.test(pwd) },
    { key: 'num', label: 'Um número', ok: /\d/.test(pwd) },
    {
      key: 'special',
      label: 'Um caractere especial (!@#$…)',
      ok: /[^A-Za-z0-9]/.test(pwd),
    },
  ];
}

/** Score 0–5 e rótulo. Considera "forte" a partir de 4 regras + 8 caracteres. */
export function passwordStrength(pwd = '') {
  const rules = passwordRules(pwd);
  const passed = rules.filter((r) => r.ok).length;
  let score = passed;
  if (pwd.length >= 12 && passed >= 4) score = 5; // bônus de comprimento
  const labels = ['Muito fraca', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Excelente'];
  const strong = rules.find((r) => r.key === 'len').ok && passed >= 4;
  return { score, max: 5, label: labels[Math.min(score, 5)], rules, strong };
}

export const isStrongPassword = (pwd = '') => passwordStrength(pwd).strong;

// ───────────────────────── Listas de apoio ─────────────────────────

/** Cargos aceitos para o responsável pela conta da empresa. */
export const CARGOS_EMPRESA = [
  'Sócio(a) / Proprietário(a)',
  'CEO / Diretor(a) Executivo(a)',
  'Diretor(a) de Marketing',
  'Gerente de Marketing',
  'Gerente Comercial / Vendas',
  'Analista de Marketing',
  'Coordenador(a) de Mídia',
  'Assessoria / Agência',
  'Outro',
];

export const SEGMENTOS_EMPRESA = [
  'Alimentação e Bebidas',
  'Varejo e Comércio',
  'Saúde e Bem-estar',
  'Educação',
  'Imobiliário',
  'Serviços Financeiros',
  'Tecnologia',
  'Automotivo',
  'Turismo e Hotelaria',
  'Beleza e Estética',
  'Outro',
];

export const APPS_MOTORISTA = ['Uber', '99', 'inDrive', 'Táxi', 'Outro'];
