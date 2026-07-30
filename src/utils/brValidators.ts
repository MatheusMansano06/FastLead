// ============================================================================
// Validações brasileiras (CNPJ, CPF, telefone) — usadas no cadastro.
// Espelha frontend/src/lib/validation.js para validação server-side.
// ============================================================================

export const onlyDigits = (v = ''): string => String(v).replace(/\D+/g, '');

export function isValidCPF(v = ''): boolean {
  const c = onlyDigits(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (len: number): number => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(c[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

export function isValidCNPJ(v = ''): boolean {
  const c = onlyDigits(v);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (len: number): number => {
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

const VALID_DDDS = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35,
  37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64,
  65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88,
  89, 91, 92, 93, 94, 95, 96, 97, 98, 99,
]);

export function isValidPhoneBR(v = ''): boolean {
  const d = onlyDigits(v);
  if (d.length !== 10 && d.length !== 11) return false;
  if (!VALID_DDDS.has(Number(d.slice(0, 2)))) return false;
  if (d.length === 11 && d[2] !== '9') return false;
  return true;
}

/** Senha forte: 8+ chars, maiúscula, minúscula, número e caractere especial. */
export function isStrongPassword(pwd = ''): boolean {
  return (
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /\d/.test(pwd) &&
    /[^A-Za-z0-9]/.test(pwd)
  );
}

const PLATE_RE = /^[A-Z]{3}-?\d[A-Z0-9]\d{2}$/i; // placa antiga + Mercosul
export const isValidPlate = (v = ''): boolean => PLATE_RE.test(String(v).trim());
