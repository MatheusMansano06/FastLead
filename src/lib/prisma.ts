import { PrismaClient } from '@prisma/client';

/**
 * O Supabase roda atrás do Supavisor em *session mode*, que aceita no máximo
 * 15 clientes. O padrão do Prisma (num_cpus * 2 + 1) passa disso com folga em
 * container maior e derruba tudo com `max clients reached`.
 *
 * Deixamos margem: 10 para a aplicação, o resto sobra para migração e para
 * scripts rodando à parte.
 */
const POOL_LIMIT = parseInt(process.env.DB_POOL_LIMIT || '10', 10);

function databaseUrlWithPoolLimit(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    // Respeita o valor já presente na env, se alguém tiver configurado à mão.
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', String(POOL_LIMIT));
    }
    return url.toString();
  } catch {
    return raw; // URL fora do padrão: melhor usar como veio do que quebrar o boot
  }
}

// Singleton pattern to ensure we only have one Prisma client instance
const prismaClientSingleton = () => {
  const url = databaseUrlWithPoolLimit();
  return new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
