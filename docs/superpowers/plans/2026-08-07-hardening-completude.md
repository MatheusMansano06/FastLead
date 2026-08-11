# FastLead — Hardening & Completude Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar o backend/frontend do FastLead (fora do módulo financeiro) a 100% de prontidão: testes automatizados nos dois lados, rate limiting, validação de input com Zod, 2FA TOTP para ADMIN/MASTER, documentação OpenAPI, limpeza de código morto, ambiente Docker de dev, e o fim do fallback inseguro de `JWT_SECRET`.

**Architecture:** Backend Express 5 + TypeScript (CommonJS, `module: Node16`) com Prisma/PostgreSQL. Testes rodam em Vitest com Supertest contra o `app` exportado por `src/app.ts`, usando um banco `fastlead_test` separado na mesma instância Postgres do `docker-compose.yml`. Middlewares novos (`rateLimiter`, `validateRequest` corrigido) entram em `src/middleware/` e são plugados em `src/app.ts`. O 2FA vive em `src/services/totpService.ts` + um segredo cifrado com `src/utils/crypto.ts` (AES-256-GCM), com o login emitindo um JWT intermediário `mfa_pending` quando o admin tem TOTP ativo. Frontend React 19 + Vite 8 ganha Vitest + Testing Library sobre o mesmo `vite.config.js`.

**Tech Stack:** TypeScript 6, Express 5.2, Prisma 5.19, Zod 4.4, Vitest 4.1, Supertest 7.2, express-rate-limit 8.6, otplib 13.4, qrcode 1.5 (já instalado), swagger-jsdoc 6.3, swagger-ui-express 5.0, React 19, Vite 8, @testing-library/react 16.3, jsdom 30.

## Global Constraints

- **Sem tocar no módulo financeiro/pagamento.** `src/services/paymentService.ts`, `src/routes/payments.ts` e o plano em `~/.claude/plans/deep-stirring-castle.md` estão fora de escopo — a única exceção é a anotação OpenAPI de `payments.ts` na Task 8 (comentário, não muda comportamento).
- **Sem API externa para 2FA.** `otplib` gera e valida o código localmente; `qrcode` (já é dependência) desenha o QR.
- **Sem Redis.** O rate limit usa o store em memória do `express-rate-limit` — hoje o deploy é single-instance no Railway.
- **Testes ficam junto do código:** `src/**/__tests__/*.test.ts`. Não criar pasta `tests/` na raiz.
- **Não mexer no deploy do Railway.** Nixpacks continua sendo o caminho de produção; os `Dockerfile.dev` são só para `docker compose` local.
- **Node 22** nos dois lados (`frontend/.nvmrc` = `22`; CI usa `node-version: '22'`).
- **Critério de conclusão do ciclo:** `npm test` verde na raiz e em `frontend/`, com o CI rodando os dois.
- **Mensagens de erro em português** nas validações voltadas ao usuário final (segue o padrão de `src/utils/validators.ts`).
- **ESLint tem `no-console: 'warn'`** em `src/**` — todo `console.*` novo precisa de `// eslint-disable-next-line no-console`.
- **`npm run check`** (= `format:check && lint && tsc --noEmit`) precisa continuar verde depois de cada task.

---

## Descobertas na exploração do código (desvios do spec)

Estes pontos foram verificados no código real e mudam detalhes do spec. Estão documentados aqui e repetidos na task correspondente.

| # | Descoberta | Impacto |
|---|---|---|
| D1 | `prisma/migrations/001_initial_schema.sql` é um **arquivo solto na raiz de `migrations/`**, não um diretório com `migration.sql`. O Prisma o ignora. A primeira migration válida (`20260728_tablet_scan_targeting`) começa com `ALTER TABLE "MotoristProfile"`, sobre tabelas que ainda não existem. | `prisma migrate deploy` **não constrói um banco do zero**. O script de setup do banco de teste (Task 1) usa `prisma db push`, não `migrate deploy`. O spec (linha 17) pedia `migrate deploy`. |
| D2 | `src/config/logger.ts` importa `src/config/config.ts`. | O aviso de `JWT_SECRET` fraco (Task 3) e de `ENCRYPTION_KEY` ausente (Task 6) usa `console.warn`, não `logger.warn` — usar o logger criaria import circular. O spec (linha 64) dizia `logger.warn`. |
| D3 | No Express 5, `req.query` é um getter — atribuir `req.query = parsed` lança `TypeError`. | O `validateRequest` corrigido (Task 5) escreve a query validada em `req.validatedQuery`, não de volta em `req.query`. O spec (linha 31) dizia "escrever de volta cada um no lugar certo (`req.body`, `req.params`, `req.query`)". `body` e `params` seguem o spec. |
| D4 | `validateRequest` **não tem nenhum chamador hoje** (`grep -rn validateRequest src/` só acha a definição e o re-export em `src/middleware/index.ts`). | Mudar a assinatura de `(schema)` para `({body, params, query})` não quebra nada existente. |
| D5 | `frontend/src/pages/Dashboard.jsx`, `Login.jsx` e `Register.jsx` são **órfãos confirmados** — nenhum arquivo os importa. `/dashboard` no `App.jsx` aponta para `HomeRedirect`, não para `Dashboard.jsx`. | Task 9 deleta os três com segurança. |
| D6 | As rotas legadas `/create-campaign`, `/campaigns`, `/leads`, `/profile` **estão vivas**: `CreateCampaign.jsx`, `Campaigns.jsx`, `Leads.jsx` e `Profile.jsx` renderizam `Sidebar`, e o `Sidebar` navega justamente para elas. É um subsistema fechado e funcional, alcançável por URL. | Task 9 **mantém** essas 4 rotas e o `Sidebar`/`Navbar`. Removê-las é decisão de produto, não limpeza de código morto. O spec (linha 53) deixava a escolha em aberto ("manter se ainda servem alguma tela viva"). |
| D7 | `otplib` 13.x tem API funcional assíncrona (`generateSecret()`, `await generate({secret})`, `await verify({secret, token}) → {valid, delta}`, `generateURI({issuer, label, secret})`) e publica build CJS com types. A API antiga `authenticator.*` (v12) não existe mais. | Task 7 usa a API v13, verificada em execução real. |
| D8 | `.gitignore` ignora `.env`, `.env.local` e `.env.*.local` — **não** ignora `.env.test`. | `.env.test` é versionado de propósito (credenciais locais do Postgres do compose, sem segredo real), para o CI usar o mesmo arquivo. |
| D9 | `tsconfig.json` tem `include: ["src"]` e `rootDir: "./src"`. Sem mudança, `npm run build` compilaria os testes para `dist/`. | Task 1 exclui `src/**/__tests__/**` do `tsconfig.json` e cria `tsconfig.test.json` (noEmit) para os testes continuarem type-checked em `npm run check`. |
| D10 | `config.ts` não tem chaves para o limiter agressivo de auth. | Task 4 adiciona `rateLimit.authWindowMs` e `rateLimit.authMaxRequests`. O spec só citava as chaves existentes; a "janela mais curta" precisa de valores próprios. |
| D11 | `src/routes/auth.ts:81` chama `RegisterSchema.parse(req.body)` direto no handler, e `src/middleware/errorHandler.ts` não tem ramo para `ZodError`. Corpo inválido em `POST /auth/register` responde **500**, não 400. | Task 13 **não** testa cadastro inválido: afirmar 500 congelaria o defeito, e corrigi-lo é mudança de produção fora do escopo de uma task que só acrescenta testes. Fica registrado aqui como dívida conhecida. |
| D12 | `AuthService.register` é o único caminho que cria `MotoristProfile`/`AnuncianteProfile`; o `createTestUser` da Task 7 cria só `Company` + `User`, e `GET /driver/me` e `GET /advertiser/me` respondem 404 sem perfil. | Task 13 monta as personas por `POST /auth/register` de verdade, em vez de fabricar perfil no helper — o que cobre `register` de quebra e fecha o item "login/register/refresh" do spec. |

---

## File Structure

**Criados:**

| Arquivo | Responsabilidade |
|---|---|
| `vitest.config.ts` | Config do Vitest do backend (ambiente node, include, setupFiles). |
| `tsconfig.test.json` | Projeto TS que inclui testes + `vitest.config.ts`, só para type-check. |
| `.env.test` | `DATABASE_URL` do `fastlead_test` e segredos de teste. Versionado (D8). |
| `src/__tests__/setup.ts` | Carrega `.env.test` antes de qualquer módulo do app. |
| `src/__tests__/helpers/auth.ts` | Fabrica headers `Authorization` assinados para testes de rota. |
| `src/__tests__/helpers/db.ts` | Cria/limpa usuários no banco de teste (usado pelo 2FA). |
| `src/__tests__/smoke.test.ts` | Prova que app + banco de teste sobem. |
| `src/__tests__/helpers/funnel.ts` | Fixture do funil: anunciante + campanha + motorista + vínculo, com limpeza na ordem certa. |
| `src/services/__tests__/trackingService.test.ts` | Testes de `recordScan`/`captureLead` — o core do funil. |
| `src/routes/__tests__/publicFunnel.test.ts` | Smoke de `GET /r/:campaignId` e `POST /r/:scanEventId/lead`. |
| `src/routes/__tests__/personas.test.ts` | Smoke de cadastro/login/refresh e das rotas de `driver` e `advertiser`. |
| `src/middleware/rateLimiter.ts` | `createRateLimiter`, `globalLimiter`, `authLimiter`. |
| `src/middleware/__tests__/rateLimiter.test.ts` | Testes do limiter. |
| `src/middleware/__tests__/validation.test.ts` | Testes do `validateRequest`. |
| `src/config/__tests__/config.test.ts` | Testes do fail-fast de `JWT_SECRET`. |
| `src/validators/campaignSchemas.ts` | Schemas Zod de criação/edição de campanha. |
| `src/validators/driverSchemas.ts` | Schemas Zod de perfil e status do motorista. |
| `src/validators/adminSchemas.ts` | Schema Zod dos filtros/paginação do MASTER. |
| `src/validators/__tests__/campaignSchemas.test.ts` | Testes dos schemas de campanha. |
| `src/validators/__tests__/driverSchemas.test.ts` | Testes dos schemas de motorista. |
| `src/validators/__tests__/adminSchemas.test.ts` | Testes do schema do MASTER. |
| `src/utils/crypto.ts` | AES-256-GCM genérico (`encrypt`/`decrypt`, formato `iv:authTag:ciphertext`). |
| `src/utils/__tests__/crypto.test.ts` | Testes do crypto. |
| `src/services/totpService.ts` | Enrollment e verificação TOTP. |
| `src/services/__tests__/totpService.test.ts` | Testes do TOTP. |
| `src/routes/__tests__/auth2fa.test.ts` | Teste ponta a ponta do login com MFA. |
| `prisma/migrations/20260807a_totp/migration.sql` | Colunas `totp_secret` e `totp_enabled` em `User`. |
| `src/config/swagger.ts` | Monta o spec OpenAPI a partir dos JSDoc das rotas. |
| `Dockerfile.dev` | Imagem de dev do backend (nodemon + hot reload). |
| `frontend/Dockerfile.dev` | Imagem de dev do frontend (vite + hot reload). |
| `frontend/src/test/setup.js` | Setup do Testing Library (jest-dom + cleanup). |
| `frontend/src/lib/__tests__/validation.test.js` | Testes de CPF/CNPJ/senha/telefone. |
| `frontend/src/pages/auth/__tests__/AccessHub.test.jsx` | Teste de render do hub de acesso. |
| `frontend/src/services/__tests__/api.test.ts` | Teste do `apiClient` com axios mockado. |

**Modificados:**

| Arquivo | O que muda |
|---|---|
| `package.json` | Scripts `test`, `test:watch`, `db:test:setup`; deps de teste, rate limit, otplib, swagger. |
| `tsconfig.json` | `exclude` passa a ignorar `src/**/__tests__/**`. |
| `src/config/config.ts` | Fail-fast de `JWT_SECRET`/`JWT_REFRESH_SECRET` (Task 3); chaves de rate limit de auth (Task 4). |
| `src/app.ts` | Plugar `globalLimiter`, `authLimiter`, `/docs`. |
| `src/middleware/validation.ts` | `validateRequest` por-parte. |
| `src/routes/advertiser.ts` | Zod nas rotas de escrita + anotações OpenAPI. |
| `src/routes/driver.ts` | Zod em `PATCH /profile` e `PATCH /status` + anotações OpenAPI. |
| `src/routes/admin.ts` | Zod nos filtros de query, endpoints `2fa/setup` e `2fa/enable` + anotações OpenAPI. |
| `src/routes/auth.ts` | Endpoint `POST /auth/2fa/verify` + anotações OpenAPI. |
| `src/routes/{health,public,campaigns,tablet,payments}.ts` | Só anotações OpenAPI. |
| `src/services/authService.ts` | `login` devolve `LoginResult`; novo `verifyMfa`. |
| `src/utils/jwt.ts` | `generateMfaPendingToken` / `verifyMfaPendingToken`. |
| `src/types/index.ts` | `MfaPendingResponse`, `LoginResult`, `isMfaPending`. |
| `prisma/schema.prisma` | `User.totp_secret`, `User.totp_enabled`. |
| `.env.example` | `RATE_LIMIT_AUTH_*`, `ENCRYPTION_KEY`. |
| `docker-compose.yml` | Serviços `backend` e `frontend`. |
| `.github/workflows/ci.yml` | Serviço Postgres + `npm test` nos dois jobs. |
| `frontend/package.json` | Script `test`; deps de teste. |
| `frontend/vite.config.js` | Bloco `test`. |

**Deletados:** `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/Login.jsx`, `frontend/src/pages/Register.jsx`, `.claude/AUDITORIA_PROJETO.md`, `.claude/PROXIMOS_PASSOS.md`.

## Grafo de dependências

```
Task 1 (test infra backend) ──┬── Task 3 (JWT_SECRET) ── Task 4 (rate limit)
                              │
                              ├── Task 5 (validação Zod) ─┐
                              ├── Task 6 (crypto) ── Task 7 (2FA) ─┤ mesmos arquivos
                              │                            │       │ de rota: coordenar
                              │                            └── Task 13 (funil + personas)
                              ├── Task 8 (Swagger)                 │
                              ├── Task 10 (Dockerfile)             │
                              └── Task 14 (CI) ◄── Task 2 (test infra frontend)
                                       ▲
                                       └── Task 13 (precisa entrar no pipeline)

Task 2 (test infra frontend) ── Task 9 (limpeza frontend)
Task 11 (docs) — independente de tudo
```

> **Não existe Task 12.** A task de testes do funil entrou com o número 13 — o nome que o Self-review já usava para ela — e a task de CI, que precisa rodar depois, passou de 12 para 14. São 13 tasks no total: 1–11, 13 e 14.

- **Sequencial obrigatório:** 1 → 3 → 4 (as três tocam `package.json`/`config.ts`; 4 depende do `config.ts` já reescrito por 3).
- **Sequencial obrigatório:** 6 → 7 (o TOTP cifra o segredo com o `crypto.ts` da Task 6).
- **Sequencial obrigatório:** 7 → 13 (a Task 13 consome o `src/__tests__/helpers/db.ts` e os limites de rate limit de auth do `.env.test`, os dois criados pela Task 7).
- **Paralelizáveis entre si:** 2, 5, 6+7, 8, 9, 10, 11 — desde que os conflitos abaixo sejam respeitados.
- **Conflitos de arquivo a coordenar (rodar em série, ou rebase de quem chegar depois):**
  - `src/routes/admin.ts`: Task 5 (Zod nos filtros) **e** Task 7 (endpoints 2FA) **e** Task 8 (OpenAPI).
  - `src/routes/auth.ts`: Task 7 (`POST /auth/2fa/verify`) **e** Task 8 (OpenAPI).
  - `src/routes/advertiser.ts` e `src/routes/driver.ts`: Task 5 (Zod) **e** Task 8 (OpenAPI).
  - `src/app.ts`: Task 4 (limiters) **e** Task 8 (`/docs`).
  - `.env.example`: Task 4 (`RATE_LIMIT_AUTH_*`) **e** Task 6 (`ENCRYPTION_KEY`).
  - Ordem sugerida quando houver conflito: **5 antes de 7 antes de 8**.
- **Task 14 (CI) por último**, porque roda `npm test` nos dois lados e precisa que 1, 2 e 13 já existam — a Task 13 tem que entrar antes para o pipeline já executar os testes do funil.

---

### Task 1: Infraestrutura de testes do backend

**Files:**
- Create: `vitest.config.ts`
- Create: `tsconfig.test.json`
- Create: `.env.test`
- Create: `src/__tests__/setup.ts`
- Create: `src/__tests__/helpers/auth.ts`
- Test: `src/__tests__/smoke.test.ts`
- Modify: `package.json` (bloco `scripts` linhas 6-29, `devDependencies` linhas 53-72)
- Modify: `tsconfig.json` (chave `exclude`, última linha do arquivo)

**Interfaces:**
- Consumes: nada (primeira task).
- Produces:
  - Script `npm test` → `vitest run` (o `package.json` de hoje tem `"test": "echo \"Error: no test specified\" && exit 1"`).
  - Script `npm run test:watch` → `vitest`.
  - Script `npm run db:test:setup` → cria/atualiza o schema do banco `fastlead_test`.
  - `.env.test` com `DATABASE_URL=postgresql://fastlead_user:fastlead_password_dev@localhost:5432/fastlead_test`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `RATE_LIMIT_MAX_REQUESTS=100000`.
  - `src/__tests__/helpers/auth.ts` exporta:
    - `signAuthHeader(payload: Partial<AuthPayload> & { type: UserType }): { Authorization: string }`
    - `adminAuthHeader(overrides?: Partial<AuthPayload>): { Authorization: string }`
    - `driverAuthHeader(overrides?: Partial<AuthPayload>): { Authorization: string }`
    - `advertiserAuthHeader(overrides?: Partial<AuthPayload>): { Authorization: string }`
  - Convenção de nomes de arquivo de teste: `src/**/__tests__/*.test.ts` (usada por todas as tasks seguintes).
- **Descoberta D1 aplicada aqui:** o setup do banco de teste usa `prisma db push`, não `prisma migrate deploy` — a cadeia de migrations do repo não constrói um banco do zero porque `prisma/migrations/001_initial_schema.sql` é um arquivo solto que o Prisma ignora.

- [ ] **Step 1: Instalar as dependências de teste**

```bash
cd /Users/Matheus/Desktop/FastLead
npm install --save-dev vitest@^4.1.10 supertest@^7.2.2 @types/supertest@^6.0.3 dotenv-cli@^11.0.0
```

- [ ] **Step 2: Criar `.env.test`**

`.env.test` (novo arquivo na raiz — é versionado de propósito, ver descoberta D8; só contém credenciais do Postgres local do `docker-compose.yml`):

```bash
# ============================================================================
# FastLead — variáveis usadas SOMENTE por `npm test`.
# Versionado de propósito: nada aqui é segredo real, e o CI usa este arquivo.
# O banco fastlead_test vive na mesma instância Postgres do docker-compose.yml.
# ============================================================================
NODE_ENV=test
PORT=3999
API_URL=http://localhost:3999
APP_BASE_URL=http://localhost:5173
QR_BASE_URL=http://localhost:3999

DATABASE_URL=postgresql://fastlead_user:fastlead_password_dev@localhost:5432/fastlead_test

JWT_SECRET=test-jwt-secret-com-mais-de-32-caracteres-ok
JWT_REFRESH_SECRET=test-refresh-secret-com-mais-de-32-caracteres-ok
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=error

# Alto de propósito: o limiter global não pode derrubar a suíte de testes.
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100000
```

- [ ] **Step 3: Criar o setup do Vitest**

`src/__tests__/setup.ts`:

```ts
import dotenv from 'dotenv';

/**
 * Roda antes de qualquer módulo do app ser importado.
 *
 * `override: true` é obrigatório: `src/config/config.ts` chama `dotenv.config()`
 * no topo, que lê o `.env` local do desenvolvedor. Sem o override, o
 * DATABASE_URL de desenvolvimento venceria e os testes escreveriam no banco real.
 */
dotenv.config({ path: '.env.test', override: true });
```

- [ ] **Step 4: Criar o `vitest.config.ts`**

`vitest.config.ts` (raiz):

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
    // Um arquivo por vez: vários testes escrevem no MESMO banco fastlead_test,
    // e em paralelo um limparia as linhas do outro no meio do caminho.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
```

- [ ] **Step 5: Ajustar o `tsconfig.json` e criar o `tsconfig.test.json`**

Em `tsconfig.json`, trocar a linha `"exclude": ["node_modules", "dist"]` por:

```json
  "exclude": ["node_modules", "dist", "src/**/__tests__/**"]
```

`tsconfig.test.json` (novo, raiz) — mantém os testes type-checked sem emiti-los no build:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "rootDir": ".",
    "declaration": false,
    "declarationMap": false
  },
  "include": ["src", "vitest.config.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 6: Atualizar os scripts do `package.json`**

Trocar a linha `"test": "echo \"Error: no test specified\" && exit 1",` por:

```json
    "test": "vitest run",
    "test:watch": "vitest",
    "db:test:setup": "dotenv -e .env.test -- prisma db push --skip-generate --accept-data-loss",
```

E trocar a linha `"check": "npm run format:check && npm run lint && tsc --noEmit",` por:

```json
    "check": "npm run format:check && npm run lint && tsc --noEmit && tsc --noEmit -p tsconfig.test.json",
```

- [ ] **Step 7: Escrever o teste que ainda falha**

`src/__tests__/smoke.test.ts`:

```ts
import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

describe('infraestrutura de teste', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('serve GET /health com status ok', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('aponta para o banco de teste, e não para o de desenvolvimento', () => {
    expect(process.env.DATABASE_URL).toContain('fastlead_test');
  });

  it('consegue falar com o banco de teste', async () => {
    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;

    expect(rows[0].ok).toBe(1);
  });

  it('responde 404 com corpo em JSON para rota inexistente', async () => {
    const res = await request(app).get('/rota-que-nao-existe');

    expect(res.status).toBe(404);
    expect(res.body.statusCode).toBe(404);
  });
});
```

- [ ] **Step 8: Rodar o teste e ver falhar**

```bash
cd /Users/Matheus/Desktop/FastLead
npm test
```

Esperado: FAIL. O teste `consegue falar com o banco de teste` quebra com `database "fastlead_test" does not exist` (ou `Can't reach database server`, se o Postgres não estiver de pé).

- [ ] **Step 9: Subir o Postgres e criar o schema do banco de teste**

```bash
cd /Users/Matheus/Desktop/FastLead
docker compose up -d postgres
npm run db:test:setup
```

Esperado: `Your database is now in sync with your Prisma schema.`

Se o `db push` reclamar que o banco não existe (varia por versão do engine), crie-o à mão uma única vez e repita o comando:

```bash
docker compose exec -T postgres psql -U fastlead_user -d fastlead_db -c 'CREATE DATABASE fastlead_test'
npm run db:test:setup
```

**Não use `npm run db:migrate` aqui.** Ver descoberta D1: a cadeia de migrations do repo começa com `ALTER TABLE` sobre tabelas que não existem num banco vazio, porque o `001_initial_schema.sql` é um arquivo solto que o Prisma ignora.

- [ ] **Step 10: Rodar o teste e ver passar**

```bash
npm test
```

Esperado: PASS — 4 testes verdes em `src/__tests__/smoke.test.ts`.

- [ ] **Step 11: Criar o helper de autenticação para as próximas tasks**

`src/__tests__/helpers/auth.ts`:

```ts
import { generateToken } from '../../utils/jwt';
import { AuthPayload, UserType } from '../../types';

/**
 * Monta um header Authorization assinado com o JWT_SECRET do .env.test.
 *
 * Serve para testar middleware e validação SEM tocar no banco: `verifyJWT` só
 * confere a assinatura, então o usuário do payload nem precisa existir.
 * Para testes que leem o usuário no banco, use os helpers de src/__tests__/helpers/db.ts.
 */
export function signAuthHeader(
  payload: Partial<AuthPayload> & { type: UserType }
): { Authorization: string } {
  const full: AuthPayload = {
    id: payload.id ?? 'test-user-id',
    email: payload.email ?? 'test@fastlead.com.br',
    type: payload.type,
    companyId: payload.companyId ?? 'test-company-id',
  };
  return { Authorization: `Bearer ${generateToken(full)}` };
}

export const adminAuthHeader = (overrides: Partial<AuthPayload> = {}) =>
  signAuthHeader({ ...overrides, type: UserType.ADMIN });

export const driverAuthHeader = (overrides: Partial<AuthPayload> = {}) =>
  signAuthHeader({ ...overrides, type: UserType.DRIVER });

export const advertiserAuthHeader = (overrides: Partial<AuthPayload> = {}) =>
  signAuthHeader({ ...overrides, type: UserType.ADVERTISER });
```

- [ ] **Step 12: Rodar a verificação completa**

```bash
npm test && npm run check
```

Esperado: testes PASS e `check` sem erros (o `tsc -p tsconfig.test.json` agora type-checa `src/__tests__/**` e o `vitest.config.ts`).

- [ ] **Step 13: Commit**

```bash
cd /Users/Matheus/Desktop/FastLead
git add package.json package-lock.json tsconfig.json tsconfig.test.json vitest.config.ts .env.test src/__tests__/
git commit -m "test: infraestrutura de testes do backend com Vitest e Supertest

Banco de teste separado (fastlead_test) via prisma db push — a cadeia de
migrations do repo nao constroi um banco do zero porque o 001_initial_schema.sql
e um arquivo solto que o Prisma ignora.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Infraestrutura de testes do frontend

**Files:**
- Create: `frontend/src/test/setup.js`
- Test: `frontend/src/lib/__tests__/validation.test.js`
- Test: `frontend/src/pages/auth/__tests__/AccessHub.test.jsx`
- Test: `frontend/src/services/__tests__/api.test.ts`
- Modify: `frontend/package.json` (bloco `scripts` linhas 10-16, `devDependencies` linhas 33-39)
- Modify: `frontend/vite.config.js` (objeto passado ao `defineConfig`)

**Interfaces:**
- Consumes: nada do backend. Roda isolada da Task 1 (motores e `package.json` diferentes).
- Produces:
  - Script `npm test` dentro de `frontend/` → `vitest run` (hoje o `frontend/package.json` **não tem** script `test`).
  - `frontend/src/test/setup.js` registrado em `vite.config.js` como `test.setupFiles`.
  - Convenção: testes em `frontend/src/**/__tests__/*.test.{js,jsx,ts}`.
- Nota: `frontend/vite.config.js` hoje exporta `defineConfig({ plugins, resolve.dedupe, optimizeDeps.include })`. A Task 2 **acrescenta** a chave `test` sem tocar nas outras — `resolve.dedupe` é o que mantém uma cópia só do React para o React Three Fiber e não pode sumir.

- [ ] **Step 1: Instalar as dependências de teste do frontend**

```bash
cd /Users/Matheus/Desktop/FastLead/frontend
npm install --save-dev vitest@^4.1.10 jsdom@^30.0.1 @testing-library/react@^16.3.2 @testing-library/jest-dom@^6.9.1 @testing-library/user-event@^14.6.1
```

- [ ] **Step 2: Criar o setup do Testing Library**

`frontend/src/test/setup.js`:

```js
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Sem isso, o DOM de um teste sobra para o próximo e os queries encontram
// dois elementos com o mesmo texto.
afterEach(() => {
  cleanup();
});
```

- [ ] **Step 3: Adicionar o bloco `test` ao `vite.config.js`**

`frontend/vite.config.js` — arquivo completo depois da mudança:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // React Three Fiber requires a single shared copy of React / the reconciler.
  resolve: {
    dedupe: ['react', 'react-dom', '@react-three/fiber', 'three'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@react-three/fiber', '@react-three/drei', 'three'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    include: ['src/**/__tests__/**/*.test.{js,jsx,ts,tsx}'],
    // three.js/@react-three só aparecem na landing; nenhum teste os monta.
    exclude: ['node_modules', 'dist'],
  },
})
```

- [ ] **Step 4: Adicionar o script `test` ao `frontend/package.json`**

No bloco `scripts`, depois de `"lint": "oxlint",`, acrescentar:

```json
    "test": "vitest run",
    "test:watch": "vitest",
```

- [ ] **Step 5: Escrever os testes que ainda falham**

`frontend/src/lib/__tests__/validation.test.js`:

```js
import { describe, it, expect } from 'vitest';
import {
  isValidCPF,
  isValidCNPJ,
  isValidPhoneBR,
  isValidEmail,
  isCorporateEmail,
  isStrongPassword,
  passwordStrength,
  maskCNPJ,
  maskCPF,
  maskPhone,
  maskPlate,
} from '../validation';

describe('isValidCPF', () => {
  it('aceita CPF com dígito verificador correto', () => {
    expect(isValidCPF('529.982.247-25')).toBe(true);
  });

  it('rejeita CPF com dígito verificador errado', () => {
    expect(isValidCPF('529.982.247-26')).toBe(false);
  });

  it('rejeita CPF com todos os dígitos iguais', () => {
    expect(isValidCPF('111.111.111-11')).toBe(false);
  });

  it('rejeita string vazia', () => {
    expect(isValidCPF('')).toBe(false);
  });
});

describe('isValidCNPJ', () => {
  it('aceita CNPJ com dígito verificador correto', () => {
    expect(isValidCNPJ('11.222.333/0001-81')).toBe(true);
  });

  it('rejeita CNPJ com dígito verificador errado', () => {
    expect(isValidCNPJ('11.222.333/0001-82')).toBe(false);
  });

  it('rejeita CNPJ com todos os dígitos iguais', () => {
    expect(isValidCNPJ('00.000.000/0000-00')).toBe(false);
  });
});

describe('isValidPhoneBR', () => {
  it('aceita celular de 11 dígitos com DDD válido', () => {
    expect(isValidPhoneBR('(11) 98765-4321')).toBe(true);
  });

  it('aceita fixo de 10 dígitos', () => {
    expect(isValidPhoneBR('(11) 3456-7890')).toBe(true);
  });

  it('rejeita DDD inexistente', () => {
    expect(isValidPhoneBR('(23) 98765-4321')).toBe(false);
  });

  it('rejeita celular de 11 dígitos que não começa com 9', () => {
    expect(isValidPhoneBR('(11) 88765-4321')).toBe(false);
  });
});

describe('e-mail', () => {
  it('aceita e-mail bem formado', () => {
    expect(isValidEmail('contato@fastlead.com.br')).toBe(true);
  });

  it('rejeita e-mail sem domínio', () => {
    expect(isValidEmail('contato@')).toBe(false);
  });

  it('trata gmail como e-mail não corporativo', () => {
    expect(isCorporateEmail('pessoa@gmail.com')).toBe(false);
  });

  it('trata domínio próprio como corporativo', () => {
    expect(isCorporateEmail('pessoa@fastlead.com.br')).toBe(true);
  });
});

describe('força de senha', () => {
  it('reprova senha curta mesmo com variedade de caracteres', () => {
    expect(isStrongPassword('Ab1!')).toBe(false);
  });

  it('aprova senha com 8+ caracteres e 4 regras atendidas', () => {
    expect(isStrongPassword('Senha@2026')).toBe(true);
  });

  it('dá score máximo para senha longa e completa', () => {
    const { score, max, strong } = passwordStrength('SenhaMuitoForte@2026');
    expect(strong).toBe(true);
    expect(score).toBe(5);
    expect(max).toBe(5);
  });

  it('devolve a checklist de 5 regras', () => {
    expect(passwordStrength('abc').rules).toHaveLength(5);
  });
});

describe('máscaras', () => {
  it('formata CNPJ', () => {
    expect(maskCNPJ('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('formata CPF', () => {
    expect(maskCPF('52998224725')).toBe('529.982.247-25');
  });

  it('formata celular', () => {
    expect(maskPhone('11987654321')).toBe('(11) 98765-4321');
  });

  it('formata placa Mercosul em maiúsculas', () => {
    expect(maskPlate('abc1d23')).toBe('ABC-1D23');
  });
});
```

`frontend/src/pages/auth/__tests__/AccessHub.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AccessHub from '../AccessHub';

const renderHub = (mode) =>
  render(
    <MemoryRouter>
      <AccessHub mode={mode} />
    </MemoryRouter>
  );

describe('AccessHub', () => {
  it('no modo login, oferece as duas personas', () => {
    renderHub('login');

    expect(screen.getByText('Sou uma empresa')).toBeInTheDocument();
    expect(screen.getByText('Sou motorista')).toBeInTheDocument();
  });

  it('no modo login, aponta para as rotas de entrada de cada persona', () => {
    renderHub('login');

    expect(screen.getByText('Entrar como empresa').closest('a')).toHaveAttribute(
      'href',
      '/entrar/empresa'
    );
    expect(screen.getByText('Entrar como motorista').closest('a')).toHaveAttribute(
      'href',
      '/entrar/motorista'
    );
  });

  it('no modo cadastro, aponta para as rotas de cadastro de cada persona', () => {
    renderHub('cadastro');

    expect(screen.getByText('Cadastrar empresa').closest('a')).toHaveAttribute(
      'href',
      '/cadastro/empresa'
    );
    expect(screen.getByText('Cadastrar como motorista').closest('a')).toHaveAttribute(
      'href',
      '/cadastro/motorista'
    );
  });

  it('o link do topo alterna entre login e cadastro', () => {
    renderHub('login');
    expect(screen.getByText('Criar conta').closest('a')).toHaveAttribute('href', '/cadastro');
  });
});
```

`frontend/src/services/__tests__/api.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

const post = vi.fn();
const get = vi.fn();
const patch = vi.fn();
const del = vi.fn();
const requestUse = vi.fn();
const responseUse = vi.fn();

vi.mock('axios', () => {
  const create = () => ({
    post,
    get,
    patch,
    delete: del,
    interceptors: {
      request: { use: requestUse },
      response: { use: responseUse },
    },
  });
  return {
    default: { create, post, isAxiosError: () => false },
    create,
    isAxiosError: () => false,
  };
});

const { apiClient } = await import('../api');

describe('apiClient', () => {
  beforeEach(() => {
    localStorage.clear();
    post.mockReset();
    get.mockReset();
  });

  it('guarda os tokens no localStorage depois do login', async () => {
    post.mockResolvedValue({
      data: { data: { token: 'tok-123', refreshToken: 'ref-456' } },
    });

    await apiClient.login({ email: 'a@b.com', password: 'Senha@2026' });

    expect(post).toHaveBeenCalledWith('/auth/login', {
      email: 'a@b.com',
      password: 'Senha@2026',
    });
    expect(localStorage.getItem('auth_token')).toBe('tok-123');
    expect(localStorage.getItem('refresh_token')).toBe('ref-456');
  });

  it('assume o tipo advertiser quando o cadastro não informa', async () => {
    post.mockResolvedValue({
      data: { data: { token: 't', refreshToken: 'r' } },
    });

    await apiClient.register({ email: 'a@b.com', password: 'Senha@2026' } as never);

    expect(post).toHaveBeenCalledWith(
      '/auth/register',
      expect.objectContaining({ type: 'advertiser' })
    );
  });

  it('isAuthenticated segue o token guardado', () => {
    expect(apiClient.isAuthenticated()).toBe(false);
    localStorage.setItem('auth_token', 'tok-123');
    expect(apiClient.isAuthenticated()).toBe(true);
  });

  it('limpa os tokens no logout mesmo se a chamada falhar', async () => {
    localStorage.setItem('auth_token', 'tok-123');
    localStorage.setItem('refresh_token', 'ref-456');
    post.mockRejectedValue(new Error('rede caiu'));

    await apiClient.logout();

    expect(localStorage.getItem('auth_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });
});
```

- [ ] **Step 6: Rodar os testes e ver falhar**

```bash
cd /Users/Matheus/Desktop/FastLead/frontend
npm test
```

Esperado: FAIL — antes do Step 3/4 o Vitest nem acha a config; se os steps 3 e 4 já estiverem aplicados, a falha esperada é em `AccessHub.test.jsx` com `Cannot find module '@testing-library/jest-dom/vitest'` caso o Step 1 tenha sido pulado.

- [ ] **Step 7: Rodar os testes e ver passar**

```bash
cd /Users/Matheus/Desktop/FastLead/frontend
npm test
```

Esperado: PASS — 3 arquivos, 21 testes verdes.

- [ ] **Step 8: Garantir que lint e build continuam de pé**

```bash
cd /Users/Matheus/Desktop/FastLead/frontend
npm run lint && npm run build
```

Esperado: `oxlint` sem erros e build do Vite concluído.

- [ ] **Step 9: Commit**

```bash
cd /Users/Matheus/Desktop/FastLead
git add frontend/package.json frontend/package-lock.json frontend/vite.config.js frontend/src/test/ frontend/src/lib/__tests__/ frontend/src/pages/auth/__tests__/ frontend/src/services/__tests__/
git commit -m "test: infraestrutura de testes do frontend com Vitest e Testing Library

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Fim do fallback inseguro de `JWT_SECRET`

**Files:**
- Modify: `src/config/config.ts:32-37` (bloco `jwt`)
- Test: `src/config/__tests__/config.test.ts`

**Interfaces:**
- Consumes: infra de teste da Task 1 (`npm test`, `vitest.config.ts`, `.env.test`). O `.env.test` já define `JWT_SECRET` e `JWT_REFRESH_SECRET` com mais de 32 caracteres, então a suíte inteira continua funcionando.
- Produces:
  - `config.jwt.secret` e `config.jwt.refreshSecret` continuam sendo `string` — nenhum consumidor (`src/utils/jwt.ts:6,17,27,35`) muda.
  - Novo comportamento: com `NODE_ENV=production` e segredo ausente ou com menos de 32 caracteres, o import de `src/config/config.ts` **lança** `Error`, derrubando o boot.
  - A Task 4 vai editar o **mesmo arquivo** (`src/config/config.ts`, bloco `rateLimit`) — rodar a Task 4 só depois desta.
- **Descoberta D2 aplicada aqui:** o aviso em dev usa `console.warn`, não `logger.warn`. `src/config/logger.ts:2` importa `./config`; se `config.ts` importasse o logger, o ciclo faria o logger ser `undefined` no momento do boot.

- [ ] **Step 1: Escrever o teste que ainda falha**

`src/config/__tests__/config.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// config.ts chama dotenv.config() no topo, que leria o .env local da máquina e
// tornaria o teste dependente do ambiente de quem roda. Neutralizamos.
vi.mock('dotenv', () => ({
  default: { config: () => ({ parsed: {} }) },
  config: () => ({ parsed: {} }),
}));

const LONG_SECRET = 'a'.repeat(40);
const originalEnv = { ...process.env };

async function loadConfig() {
  vi.resetModules();
  const mod = await import('../config');
  return mod.default;
}

describe('config.jwt', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('em produção, recusa subir sem JWT_SECRET', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    process.env.JWT_REFRESH_SECRET = LONG_SECRET;

    await expect(loadConfig()).rejects.toThrow(/JWT_SECRET/);
  });

  it('em produção, recusa subir com JWT_SECRET curto demais', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'curto';
    process.env.JWT_REFRESH_SECRET = LONG_SECRET;

    await expect(loadConfig()).rejects.toThrow(/32/);
  });

  it('em produção, recusa subir sem JWT_REFRESH_SECRET', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = LONG_SECRET;
    delete process.env.JWT_REFRESH_SECRET;

    await expect(loadConfig()).rejects.toThrow(/JWT_REFRESH_SECRET/);
  });

  it('em produção, sobe normalmente com os dois segredos longos', async () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = LONG_SECRET;
    process.env.JWT_REFRESH_SECRET = `${LONG_SECRET}b`;

    const config = await loadConfig();

    expect(config.jwt.secret).toBe(LONG_SECRET);
    expect(config.jwt.refreshSecret).toBe(`${LONG_SECRET}b`);
  });

  it('em desenvolvimento, avisa e usa um valor de conveniência', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const config = await loadConfig();

    expect(config.jwt.secret.length).toBeGreaterThanOrEqual(32);
    expect(config.jwt.secret).not.toBe('your-secret-key');
    expect(config.jwt.refreshSecret).not.toBe(config.jwt.secret);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('não deixa mais o fallback antigo "your-secret-key" existir', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.JWT_SECRET;
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const config = await loadConfig();

    expect(config.jwt.secret).not.toContain('your-secret-key');
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

```bash
cd /Users/Matheus/Desktop/FastLead
npm test -- src/config/__tests__/config.test.ts
```

Esperado: FAIL — os três primeiros testes não veem `throw` nenhum (`promise resolved instead of rejecting`) e o de desenvolvimento acha `'your-secret-key'`.

- [ ] **Step 3: Implementar o fail-fast em `src/config/config.ts`**

Acrescentar, logo depois de `dotenv.config();` (linha 3):

```ts
/** Tamanho mínimo aceitável para um segredo de assinatura de JWT. */
const MIN_SECRET_LENGTH = 32;

/**
 * Valores de conveniência para desenvolvimento. Não são segredos: existem só
 * para `npm run dev` subir sem exigir .env, e o processo avisa alto quando os usa.
 */
const DEV_JWT_SECRET = 'fastlead-dev-only-jwt-secret-nao-use-em-producao';
const DEV_JWT_REFRESH_SECRET = 'fastlead-dev-only-refresh-secret-nao-use-em-producao';

/**
 * Antes, um JWT_SECRET ausente caía em silêncio no literal 'your-secret-key' —
 * qualquer pessoa com o código do repositório conseguiria forjar um token de ADMIN.
 * Agora, em produção o processo se recusa a subir.
 *
 * O aviso sai por console.warn e não pelo logger de propósito: src/config/logger.ts
 * importa este arquivo, e a dependência circular deixaria o logger indefinido aqui.
 */
function resolveSecret(envName: string, rawValue: string | undefined, devFallback: string): string {
  const value = (rawValue || '').trim();

  if (value.length >= MIN_SECRET_LENGTH) return value;

  if ((process.env.NODE_ENV || 'development') === 'production') {
    throw new Error(
      `${envName} ausente ou com menos de ${MIN_SECRET_LENGTH} caracteres. ` +
        'Defina a variável de ambiente antes de subir em produção.'
    );
  }

  // eslint-disable-next-line no-console
  console.warn(
    `[config] ${envName} ausente ou curto demais — usando o valor de desenvolvimento. ` +
      'NUNCA suba em produção assim.'
  );
  return devFallback;
}
```

E trocar o bloco `jwt` (hoje linhas 32-37) por:

```ts
  jwt: {
    secret: resolveSecret('JWT_SECRET', process.env.JWT_SECRET, DEV_JWT_SECRET),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: resolveSecret(
      'JWT_REFRESH_SECRET',
      process.env.JWT_REFRESH_SECRET,
      DEV_JWT_REFRESH_SECRET
    ),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
```

- [ ] **Step 4: Rodar o teste e ver passar**

```bash
npm test -- src/config/__tests__/config.test.ts
```

Esperado: PASS — 6 testes verdes.

- [ ] **Step 5: Rodar a suíte inteira e o check**

```bash
npm test && npm run check
```

Esperado: tudo verde. O `.env.test` já traz segredos com mais de 32 caracteres, então nenhum aviso aparece durante os testes.

- [ ] **Step 6: Commit**

```bash
cd /Users/Matheus/Desktop/FastLead
git add src/config/config.ts src/config/__tests__/config.test.ts
git commit -m "fix(security): recusar boot em producao sem JWT_SECRET forte

O fallback silencioso para 'your-secret-key' permitia forjar token de ADMIN
com o segredo publicado no repositorio.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Rate limiting global e agressivo em `/auth`

**Files:**
- Create: `src/middleware/rateLimiter.ts`
- Test: `src/middleware/__tests__/rateLimiter.test.ts`
- Modify: `src/config/config.ts` (bloco `rateLimit`, hoje linhas 44-47)
- Modify: `src/middleware/index.ts` (acrescentar export)
- Modify: `src/app.ts:44-61` (ordem de registro dos middlewares)
- Modify: `.env.example` (seção "Rate Limiting")

**Interfaces:**
- Consumes:
  - Task 1: `npm test`, `.env.test` (que já define `RATE_LIMIT_MAX_REQUESTS=100000`, alto de propósito para o limiter global não derrubar a suíte).
  - Task 3: o `src/config/config.ts` já reescrito com `resolveSecret`. **Esta task edita o mesmo arquivo — rodar depois da Task 3.**
- Produces:
  - `src/middleware/rateLimiter.ts` exporta:
    - `createRateLimiter(options: { windowMs: number; limit: number; message: string }): RequestHandler`
    - `globalLimiter: RequestHandler`
    - `authLimiter: RequestHandler`
  - `src/middleware/index.ts` passa a re-exportar `createRateLimiter`, `globalLimiter` e `authLimiter`.
  - `config.rateLimit` ganha `authWindowMs: number` e `authMaxRequests: number` (descoberta D10).
  - Resposta de bloqueio: HTTP 429 com o mesmo formato de `ErrorResponse` (`{ error, message, statusCode, timestamp }`) usado por `src/middleware/errorHandler.ts:19-24`.
- **Decisão de wiring:** o `authLimiter` é montado em `src/app.ts` com `app.use('/auth/login', authLimiter)` e `app.use('/auth/register', authLimiter)` **antes** de `app.use('/auth', authRoutes)`, em vez de dentro de `src/routes/auth.ts`. Motivo: `src/routes/auth.ts` também é editado pelas Tasks 7 e 8 — manter esta task fora dele elimina o conflito.
- **`/health` fica de fora do limiter global:** em `src/app.ts` a rota `/health` já é registrada antes das demais (linha 47), e o `globalLimiter` entra logo depois dela. Health check de plataforma não pode ser limitado.

- [ ] **Step 1: Instalar o `express-rate-limit`**

```bash
cd /Users/Matheus/Desktop/FastLead
npm install express-rate-limit@^8.6.2
```

- [ ] **Step 2: Escrever o teste que ainda falha**

`src/middleware/__tests__/rateLimiter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createRateLimiter, globalLimiter, authLimiter } from '../rateLimiter';
import config from '../../config/config';

function appWithLimiter(limiter: express.RequestHandler) {
  const app = express();
  app.use(express.json());
  app.use(limiter);
  app.post('/tentar', (_req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
}

describe('createRateLimiter', () => {
  it('libera as requisições até o limite', async () => {
    const app = appWithLimiter(
      createRateLimiter({ windowMs: 60000, limit: 3, message: 'Calma lá' })
    );

    for (let i = 0; i < 3; i++) {
      const res = await request(app).post('/tentar');
      expect(res.status).toBe(200);
    }
  });

  it('bloqueia com 429 a partir da requisição seguinte ao limite', async () => {
    const app = appWithLimiter(
      createRateLimiter({ windowMs: 60000, limit: 2, message: 'Calma lá' })
    );

    await request(app).post('/tentar');
    await request(app).post('/tentar');
    const bloqueada = await request(app).post('/tentar');

    expect(bloqueada.status).toBe(429);
  });

  it('devolve o corpo de erro no formato padrão da API', async () => {
    const app = appWithLimiter(
      createRateLimiter({ windowMs: 60000, limit: 1, message: 'Muitas tentativas de login' })
    );

    await request(app).post('/tentar');
    const bloqueada = await request(app).post('/tentar');

    expect(bloqueada.body).toMatchObject({
      error: 'Too Many Requests',
      message: 'Muitas tentativas de login',
      statusCode: 429,
    });
    expect(typeof bloqueada.body.timestamp).toBe('string');
  });

  it('publica os headers RateLimit padronizados e nenhum X-RateLimit legado', async () => {
    const app = appWithLimiter(
      createRateLimiter({ windowMs: 60000, limit: 5, message: 'Calma lá' })
    );

    const res = await request(app).post('/tentar');

    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['x-ratelimit-limit']).toBeUndefined();
  });
});

describe('limiters configurados', () => {
  it('o limiter global existe e é um middleware', () => {
    expect(typeof globalLimiter).toBe('function');
  });

  it('o limiter de auth existe e é um middleware', () => {
    expect(typeof authLimiter).toBe('function');
  });

  it('a janela do limiter de auth é mais curta que a global', () => {
    expect(config.rateLimit.authWindowMs).toBeLessThan(config.rateLimit.windowMs);
  });

  it('o teto do limiter de auth é bem menor que o global', () => {
    expect(config.rateLimit.authMaxRequests).toBeLessThan(config.rateLimit.maxRequests);
    expect(config.rateLimit.authMaxRequests).toBeLessThanOrEqual(10);
  });
});
```

- [ ] **Step 3: Rodar o teste e ver falhar**

```bash
npm test -- src/middleware/__tests__/rateLimiter.test.ts
```

Esperado: FAIL com `Failed to resolve import "../rateLimiter"`.

- [ ] **Step 4: Adicionar as chaves de rate limit de auth ao `config.ts`**

Trocar o bloco `rateLimit` de `src/config/config.ts` (hoje linhas 44-47) por:

```ts
  rateLimit: {
    // Teto geral da API: janela de 15 min, 100 requisições por IP.
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

    /**
     * Teto específico de /auth/login e /auth/register. Janela mais curta e teto
     * muito menor porque o risco ali é força bruta de senha, não volume de uso.
     */
    authWindowMs: parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS || '300000', 10),
    authMaxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS || '10', 10),
  },
```

- [ ] **Step 5: Implementar o `src/middleware/rateLimiter.ts`**

```ts
import { Request, Response } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import config from '../config/config';

interface RateLimiterOptions {
  windowMs: number;
  limit: number;
  message: string;
}

/**
 * Store em memória de propósito: o deploy é single-instance no Railway hoje.
 * Se um dia houver mais de uma instância, trocar por um store compartilhado —
 * com memória, cada instância conta o seu próprio balde e o teto real multiplica.
 */
export const createRateLimiter = (options: RateLimiterOptions): RateLimitRequestHandler =>
  rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message: options.message,
        statusCode: 429,
        timestamp: new Date().toISOString(),
      });
    },
  });

/** Teto geral da API, aplicado a tudo exceto /health. */
export const globalLimiter = createRateLimiter({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.maxRequests,
  message: 'Muitas requisições vindas deste IP. Tente novamente em alguns minutos.',
});

/** Teto agressivo de /auth/login e /auth/register — barreira contra força bruta. */
export const authLimiter = createRateLimiter({
  windowMs: config.rateLimit.authWindowMs,
  limit: config.rateLimit.authMaxRequests,
  message: 'Muitas tentativas de autenticação. Aguarde alguns minutos e tente de novo.',
});
```

- [ ] **Step 6: Exportar pelo barrel de middlewares**

Em `src/middleware/index.ts`, acrescentar como última linha:

```ts
export { createRateLimiter, globalLimiter, authLimiter } from './rateLimiter';
```

- [ ] **Step 7: Rodar o teste e ver passar**

```bash
npm test -- src/middleware/__tests__/rateLimiter.test.ts
```

Esperado: PASS — 8 testes verdes.

- [ ] **Step 8: Plugar os limiters no `src/app.ts`**

Trocar o import da linha 4 por:

```ts
import { requestLogger, errorHandler, globalLimiter, authLimiter } from './middleware';
```

E trocar o trecho das linhas 46-54 (do comentário `// Health check route (public)` até `app.use('/auth', authRoutes);`) por:

```ts
// Health check route (public) — fica ANTES do rate limit de propósito: health
// check de plataforma não pode ser barrado por excesso de requisições.
app.use('/health', healthRoutes);

// Teto geral da API. Depois do /health e antes de qualquer rota de negócio.
app.use(globalLimiter);

// Rotas públicas sem auth: redirect de QR (/r/:id), captura de lead e catálogo
// de segmentação. Precisam vir antes das rotas autenticadas.
app.use('/', publicRoutes);

/**
 * Teto agressivo só onde o risco é força bruta de senha. Montado aqui, e não
 * dentro de src/routes/auth.ts, para o arquivo de rotas continuar só com rotas.
 */
app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);

// API Routes
app.use('/auth', authRoutes);
```

- [ ] **Step 9: Documentar as variáveis novas no `.env.example`**

Trocar a seção `# Rate Limiting` do `.env.example` por:

```bash
# ============================================================================
# Rate Limiting
# ============================================================================
# Teto geral da API (todas as rotas exceto /health).
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
# Teto agressivo de /auth/login e /auth/register — barreira contra força bruta.
RATE_LIMIT_AUTH_WINDOW_MS=300000
RATE_LIMIT_AUTH_MAX_REQUESTS=10
```

- [ ] **Step 10: Rodar a suíte inteira e o check**

```bash
npm test && npm run check
```

Esperado: tudo verde. O `smoke.test.ts` da Task 1 continua passando porque `/health` está fora do limiter e o `.env.test` põe o teto global em 100000.

- [ ] **Step 11: Commit**

```bash
cd /Users/Matheus/Desktop/FastLead
git add package.json package-lock.json .env.example src/config/config.ts src/middleware/rateLimiter.ts src/middleware/index.ts src/middleware/__tests__/rateLimiter.test.ts src/app.ts
git commit -m "feat(security): plugar rate limiting global e agressivo em /auth

Os valores de config.rateLimit existiam desde o inicio mas nunca tinham sido
ligados a nenhum middleware.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Validação de input com Zod (corrigir `validateRequest` + schemas por domínio)

**Files:**
- Modify: `src/middleware/validation.ts` (arquivo inteiro — 23 linhas hoje)
- Test: `src/middleware/__tests__/validation.test.ts`
- Modify: `src/middleware/index.ts` (linha 2, o re-export de `validation`)
- Create: `src/validators/campaignSchemas.ts`
- Create: `src/validators/driverSchemas.ts`
- Create: `src/validators/adminSchemas.ts`
- Test: `src/validators/__tests__/campaignSchemas.test.ts`
- Test: `src/validators/__tests__/driverSchemas.test.ts`
- Test: `src/validators/__tests__/adminSchemas.test.ts`
- Modify: `src/routes/advertiser.ts:81-141` (`POST /campaigns`) e `src/routes/advertiser.ts:194-223` (`PATCH /campaigns/:campaignId`)
- Modify: `src/routes/driver.ts:152-192` (`PATCH /profile`) e `src/routes/driver.ts:245-266` (`PATCH /status`)
- Modify: `src/routes/admin.ts:1-28` (imports, `parseFilters`, `pageOf`) e o handler `GET /timeseries`

**Interfaces:**
- Consumes:
  - Task 1: `npm test`, convenção `src/**/__tests__/*.test.ts`, `.env.test`. Os testes desta task **não usam** `signAuthHeader`/`adminAuthHeader` — montam um `express()` local, sem auth e sem banco.
  - `errorHandler` de `src/middleware/errorHandler.ts` (formato `ErrorResponse`).
  - `ValidationError` de `src/utils/errors.ts` (statusCode 400, `name = 'ValidationError'`).
  - `isValidPhoneBR` e `isValidPlate` de `src/utils/brValidators.ts`.
- Produces:
  - `src/middleware/validation.ts` passa a exportar:
    - `interface RequestSchemas { body?: ZodType; params?: ZodType; query?: ZodType }`
    - `validateRequest(schemas: RequestSchemas): RequestHandler` — **assinatura nova**, antes era `validateRequest(schema: ZodSchema)`.
    - `getValidatedQuery<T>(req: Request): T`
    - Declaração global `Express.Request.validatedQuery?: Record<string, unknown>`.
  - `src/middleware/index.ts` re-exporta `validateRequest`, `getValidatedQuery` e o tipo `RequestSchemas`.
  - `src/validators/campaignSchemas.ts`: `CreateCampaignBodySchema`, `UpdateCampaignBodySchema`, `CampaignIdParamsSchema` e os tipos `CreateCampaignInput`, `UpdateCampaignInput`, `CampaignIdParams`.
  - `src/validators/driverSchemas.ts`: `UpdateDriverProfileBodySchema`, `UpdateDriverStatusBodySchema` e os tipos `UpdateDriverProfileInput`, `UpdateDriverStatusInput`.
  - `src/validators/adminSchemas.ts`: `MasterQuerySchema` e o tipo `MasterQuery`.
- **Descoberta D3 aplicada aqui:** no Express 5 `req.query` é um getter — atribuir `req.query = parsed` lança `TypeError`. Por isso a query validada vai para `req.validatedQuery` e se lê com `getValidatedQuery<T>(req)`. `req.body` e `req.params` continuam sendo reescritos no lugar, como o spec pedia.
- **Descoberta D4 aplicada aqui:** `validateRequest` não tem nenhum chamador hoje (`grep -rn validateRequest src/` acha só a definição e o re-export). Mudar a assinatura não quebra nada existente.
- **Task 7 e Task 8 também editam `src/routes/admin.ts`; Task 8 também edita `advertiser.ts` e `driver.ts`.** Ordem sugerida: **5 antes de 7 antes de 8**.
- **Decisão de compatibilidade na paginação do MASTER:** enum, UF e data **rejeitam** (viram 400); `page`/`limit`/`days` **são saneados** (clamp), como o código de hoje já fazia com `Math.min`/`Math.max`. Um `?limit=9999` vindo do painel é ruído de UI, não tentativa de ataque — derrubar a tela do MASTER por causa disso seria uma regressão.

- [ ] **Step 1: Escrever o teste que ainda falha do `validateRequest`**

`src/middleware/__tests__/validation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import express, { Request, Response } from 'express';
import request from 'supertest';
import { z } from 'zod';
import { validateRequest, getValidatedQuery, RequestSchemas } from '../validation';
import { errorHandler } from '../errorHandler';

/**
 * App mínimo: o eco devolve as três partes da requisição para o teste conferir
 * onde cada valor validado foi parar. Sem auth e sem banco de propósito — aqui
 * o que está sob teste é só o middleware.
 */
function appWith(schemas: RequestSchemas, path = '/eco') {
  const app = express();
  app.use(express.json());
  app.all(path, validateRequest(schemas), (req: Request, res: Response) => {
    res.status(200).json({
      body: req.body,
      params: req.params,
      query: req.query,
      validatedQuery: getValidatedQuery<Record<string, unknown>>(req),
    });
  });
  app.use(errorHandler);
  return app;
}

describe('validateRequest — body', () => {
  it('escreve o body já convertido de volta em req.body', async () => {
    const app = appWith({
      body: z.object({ quantidade: z.coerce.number().int().positive() }),
    });

    const res = await request(app).post('/eco').send({ quantidade: '7' });

    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ quantidade: 7 });
  });

  it('devolve 400 no formato de erro da API quando o body é inválido', async () => {
    const app = appWith({
      body: z.object({ quantidade: z.coerce.number().positive('Precisa ser maior que zero') }),
    });

    const res = await request(app).post('/eco').send({ quantidade: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
    expect(res.body.statusCode).toBe(400);
    expect(res.body.message).toContain('body.quantidade');
    expect(res.body.message).toContain('Precisa ser maior que zero');
    expect(typeof res.body.timestamp).toBe('string');
  });
});

describe('validateRequest — params', () => {
  it('valida os params de rota sem tocar no body', async () => {
    const app = appWith({ params: z.object({ id: z.string().min(3) }) }, '/eco/:id');

    const res = await request(app).post('/eco/abc123').send({ nome: 'FastLead' });

    expect(res.status).toBe(200);
    expect(res.body.params).toEqual({ id: 'abc123' });
    expect(res.body.body).toEqual({ nome: 'FastLead' });
  });

  it('devolve 400 prefixado com params quando o param é inválido', async () => {
    const app = appWith(
      { params: z.object({ id: z.string().min(10, 'ID curto demais') }) },
      '/eco/:id'
    );

    const res = await request(app).post('/eco/abc').send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('params.id');
  });
});

describe('validateRequest — query', () => {
  it('põe a query validada em req.validatedQuery e não mexe em req.query', async () => {
    const app = appWith({
      query: z.object({ limit: z.coerce.number().int().default(50) }),
    });

    const res = await request(app).post('/eco?limit=10').send({});

    expect(res.status).toBe(200);
    expect(res.body.validatedQuery).toEqual({ limit: 10 });
    // req.query continua com a string crua — no Express 5 ele é getter e não
    // pode ser reescrito; quem quer o valor convertido usa getValidatedQuery.
    expect(res.body.query).toEqual({ limit: '10' });
  });

  it('aplica o default da query quando o parâmetro não vem', async () => {
    const app = appWith({
      query: z.object({ limit: z.coerce.number().int().default(50) }),
    });

    const res = await request(app).post('/eco').send({});

    expect(res.body.validatedQuery).toEqual({ limit: 50 });
  });
});

describe('validateRequest — separação de namespaces (regressão do bug)', () => {
  it('não deixa um :id de rota vazar para dentro do body', async () => {
    const app = appWith(
      { body: z.object({ nome: z.string() }), params: z.object({ id: z.string() }) },
      '/eco/:id'
    );

    const res = await request(app).post('/eco/campanha-42').send({ nome: 'FastLead' });

    // O validateRequest antigo fazia schema.parse({...body, ...params, ...query})
    // e jogava tudo em req.body — o id da URL virava campo do body.
    expect(res.body.body).toEqual({ nome: 'FastLead' });
    expect(res.body.body.id).toBeUndefined();
  });

  it('não deixa a query vazar para dentro do body', async () => {
    const app = appWith({ body: z.object({ nome: z.string() }) });

    const res = await request(app).post('/eco?admin=true').send({ nome: 'FastLead' });

    expect(res.body.body).toEqual({ nome: 'FastLead' });
    expect(res.body.body.admin).toBeUndefined();
  });

  it('deixa passar intacta a parte que não tem schema', async () => {
    const app = appWith({ query: z.object({ limit: z.coerce.number().default(50) }) });

    const res = await request(app).post('/eco').send({ campoQualquer: 'passa direto' });

    expect(res.body.body).toEqual({ campoQualquer: 'passa direto' });
  });
});

describe('validateRequest — acumulação de erros', () => {
  it('junta numa mensagem só os erros de partes diferentes', async () => {
    const app = appWith(
      {
        body: z.object({ nome: z.string('Informe o nome') }),
        params: z.object({ id: z.string().min(10, 'ID curto demais') }),
      },
      '/eco/:id'
    );

    const res = await request(app).post('/eco/abc').send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('body.nome');
    expect(res.body.message).toContain('params.id');
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

```bash
cd /Users/Matheus/Desktop/FastLead
npm test -- src/middleware/__tests__/validation.test.ts
```

Esperado: FAIL — `getValidatedQuery` e `RequestSchemas` não existem em `../validation`, e `validateRequest({...})` recebe um objeto onde a assinatura de hoje espera um `ZodSchema`.

- [ ] **Step 3: Reescrever `src/middleware/validation.ts`**

Arquivo completo depois da mudança:

```ts
import { Request, RequestHandler, Response, NextFunction } from 'express';
import { ZodError, ZodType } from 'zod';
import { ValidationError } from '../utils/errors';

declare global {
  // Namespace é a forma que o Express expõe para estender o tipo Request;
  // não há equivalente em módulos ES aqui.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /**
       * Query já validada e convertida.
       *
       * No Express 5 `req.query` é um getter: `req.query = parsed` lança
       * TypeError em runtime. Por isso o resultado vai para cá, e quem lê usa
       * getValidatedQuery<T>(req).
       */
      validatedQuery?: Record<string, unknown>;
    }
  }
}

/**
 * Um schema por parte da requisição. Partes omitidas passam intactas.
 *
 * A versão anterior recebia UM schema só e fazia
 * `schema.parse({ ...req.body, ...req.params, ...req.query })`, gravando tudo
 * em `req.body`. Isso misturava namespaces: o `:campaignId` da URL virava campo
 * do body, e uma query `?admin=true` conseguia se passar por campo do body.
 */
export interface RequestSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

type RequestPart = 'body' | 'params' | 'query';

/** Formata como `body.pricePerLead: O valor por lead precisa ser maior que zero`. */
function formatIssues(part: RequestPart, error: ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${part}.${path}: ${issue.message}` : `${part}: ${issue.message}`;
  });
}

export const validateRequest = (schemas: RequestSchemas): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const messages: string[] = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (result.success) {
        req.body = result.data;
      } else {
        messages.push(...formatIssues('body', result.error));
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (result.success) {
        // Object.assign e não atribuição: o router do Express guarda a
        // referência de req.params e a reusa nas camadas seguintes.
        Object.assign(req.params, result.data as Record<string, string>);
      } else {
        messages.push(...formatIssues('params', result.error));
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (result.success) {
        req.validatedQuery = result.data as Record<string, unknown>;
      } else {
        messages.push(...formatIssues('query', result.error));
      }
    }

    if (messages.length > 0) {
      // next(err) e não throw: é o caminho oficial do Express para chegar ao
      // errorHandler, e continua valendo se este middleware virar assíncrono.
      next(new ValidationError(messages.join('; ')));
      return;
    }

    next();
  };
};

/**
 * Lê a query validada com o tipo do schema que a produziu.
 *
 * Devolve `undefined` se a rota não tiver passado por um `validateRequest`
 * com schema de query — é responsabilidade de quem monta a rota garantir o par.
 */
export function getValidatedQuery<T>(req: Request): T {
  return req.validatedQuery as T;
}
```

- [ ] **Step 4: Atualizar o barrel de middlewares**

Em `src/middleware/index.ts`, trocar a linha 2 (`export { validateRequest } from './validation';`) por:

```ts
export { validateRequest, getValidatedQuery } from './validation';
export type { RequestSchemas } from './validation';
```

- [ ] **Step 5: Rodar o teste e ver passar**

```bash
npm test -- src/middleware/__tests__/validation.test.ts
```

Esperado: PASS — 10 testes verdes.

- [ ] **Step 6: Escrever os testes que ainda falham dos schemas**

`src/validators/__tests__/campaignSchemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  CreateCampaignBodySchema,
  UpdateCampaignBodySchema,
  CampaignIdParamsSchema,
} from '../campaignSchemas';

const valido = {
  title: 'Promoção de verão',
  numVehicles: 5,
  durationDays: 30,
  pricePerLead: 2.5,
};

describe('CreateCampaignBodySchema', () => {
  it('aceita o mínimo obrigatório e preenche as listas de segmentação vazias', () => {
    const parsed = CreateCampaignBodySchema.parse(valido);

    expect(parsed.title).toBe('Promoção de verão');
    expect(parsed.numVehicles).toBe(5);
    expect(parsed.targetRegions).toEqual([]);
    expect(parsed.targetStates).toEqual([]);
    expect(parsed.targetCities).toEqual([]);
    expect(parsed.targetRideApps).toEqual([]);
    expect(parsed.targetCategories).toEqual([]);
  });

  it('converte números que chegam como string do formulário', () => {
    const parsed = CreateCampaignBodySchema.parse({
      ...valido,
      numVehicles: '5',
      durationDays: '30',
      pricePerLead: '2.50',
    });

    expect(parsed.numVehicles).toBe(5);
    expect(parsed.durationDays).toBe(30);
    expect(parsed.pricePerLead).toBe(2.5);
  });

  it('rejeita pricePerLead NaN — o bug concreto da auditoria', () => {
    expect(CreateCampaignBodySchema.safeParse({ ...valido, pricePerLead: 'abc' }).success).toBe(
      false
    );
  });

  it('rejeita pricePerLead igual a zero', () => {
    const res = CreateCampaignBodySchema.safeParse({ ...valido, pricePerLead: 0 });

    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toContain('maior que zero');
  });

  it('rejeita pricePerLead negativo', () => {
    expect(CreateCampaignBodySchema.safeParse({ ...valido, pricePerLead: -1 }).success).toBe(false);
  });

  it('rejeita numVehicles fracionário', () => {
    const res = CreateCampaignBodySchema.safeParse({ ...valido, numVehicles: 2.5 });

    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toContain('inteiro');
  });

  it('rejeita durationDays igual a zero', () => {
    expect(CreateCampaignBodySchema.safeParse({ ...valido, durationDays: 0 }).success).toBe(false);
  });

  it('rejeita título curto demais', () => {
    expect(CreateCampaignBodySchema.safeParse({ ...valido, title: 'ab' }).success).toBe(false);
  });

  it('rejeita título com mais de 255 caracteres (limite da coluna)', () => {
    expect(CreateCampaignBodySchema.safeParse({ ...valido, title: 'a'.repeat(256) }).success).toBe(
      false
    );
  });

  it('aceita a segmentação com valores dos enums do banco e normaliza a UF', () => {
    const parsed = CreateCampaignBodySchema.parse({
      ...valido,
      targetRegions: ['SUDESTE'],
      targetRideApps: ['UBER'],
      targetCategories: ['UBER_X'],
      targetStates: ['sp', 'rj'],
      targetCities: ['São Paulo'],
    });

    expect(parsed.targetRegions).toEqual(['SUDESTE']);
    expect(parsed.targetStates).toEqual(['SP', 'RJ']);
  });

  it('rejeita região que não existe no enum', () => {
    expect(CreateCampaignBodySchema.safeParse({ ...valido, targetRegions: ['MARTE'] }).success).toBe(
      false
    );
  });

  it('rejeita UF que não tem 2 letras', () => {
    expect(
      CreateCampaignBodySchema.safeParse({ ...valido, targetStates: ['São Paulo'] }).success
    ).toBe(false);
  });

  it('rejeita qrPosition fora do enum', () => {
    expect(CreateCampaignBodySchema.safeParse({ ...valido, qrPosition: 'CANTO' }).success).toBe(
      false
    );
  });

  it('aceita qrPosition válida', () => {
    expect(
      CreateCampaignBodySchema.parse({ ...valido, qrPosition: 'BOTTOM_RIGHT' }).qrPosition
    ).toBe('BOTTOM_RIGHT');
  });

  it('rejeita destinationUrl que não é URL', () => {
    expect(
      CreateCampaignBodySchema.safeParse({ ...valido, destinationUrl: 'não é url' }).success
    ).toBe(false);
  });

  it('aceita destinationUrl https', () => {
    expect(
      CreateCampaignBodySchema.parse({ ...valido, destinationUrl: 'https://loja.com.br/promo' })
        .destinationUrl
    ).toBe('https://loja.com.br/promo');
  });
});

describe('UpdateCampaignBodySchema', () => {
  it('aceita atualização parcial só com o título', () => {
    expect(UpdateCampaignBodySchema.parse({ title: 'Novo título' })).toEqual({
      title: 'Novo título',
    });
  });

  it('aceita status do enum de campanha', () => {
    expect(UpdateCampaignBodySchema.parse({ status: 'PAUSED' }).status).toBe('PAUSED');
  });

  it('rejeita status fora do enum', () => {
    expect(UpdateCampaignBodySchema.safeParse({ status: 'DORMINDO' }).success).toBe(false);
  });

  it('rejeita pricePerLead zero também no update', () => {
    expect(UpdateCampaignBodySchema.safeParse({ pricePerLead: 0 }).success).toBe(false);
  });

  it('rejeita corpo vazio — PATCH sem nenhum campo não faz sentido', () => {
    const res = UpdateCampaignBodySchema.safeParse({});

    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toContain('Informe ao menos um campo');
  });
});

describe('CampaignIdParamsSchema', () => {
  it('aceita um cuid de campanha', () => {
    expect(CampaignIdParamsSchema.parse({ campaignId: 'clx0a1b2c3d4e5f6g7h8i9j0' }).campaignId).toBe(
      'clx0a1b2c3d4e5f6g7h8i9j0'
    );
  });

  it('rejeita campaignId vazio', () => {
    expect(CampaignIdParamsSchema.safeParse({ campaignId: '' }).success).toBe(false);
  });
});
```

`src/validators/__tests__/driverSchemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { UpdateDriverProfileBodySchema, UpdateDriverStatusBodySchema } from '../driverSchemas';

describe('UpdateDriverProfileBodySchema', () => {
  it('aceita atualização parcial só com o nome', () => {
    expect(UpdateDriverProfileBodySchema.parse({ name: 'João da Silva' })).toEqual({
      name: 'João da Silva',
    });
  });

  it('rejeita corpo vazio', () => {
    const res = UpdateDriverProfileBodySchema.safeParse({});

    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toContain('Informe ao menos um campo');
  });

  it('aceita telefone brasileiro com DDD válido', () => {
    expect(UpdateDriverProfileBodySchema.parse({ phone: '(11) 98765-4321' }).phone).toBe(
      '(11) 98765-4321'
    );
  });

  it('rejeita telefone com DDD inexistente', () => {
    const res = UpdateDriverProfileBodySchema.safeParse({ phone: '(23) 98765-4321' });

    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toContain('Telefone');
  });

  it('normaliza a placa para maiúsculas', () => {
    expect(UpdateDriverProfileBodySchema.parse({ licensePlate: 'abc1d23' }).licensePlate).toBe(
      'ABC1D23'
    );
  });

  it('rejeita placa fora do padrão antigo/Mercosul', () => {
    expect(UpdateDriverProfileBodySchema.safeParse({ licensePlate: '12345' }).success).toBe(false);
  });

  it('normaliza a UF para maiúsculas', () => {
    expect(UpdateDriverProfileBodySchema.parse({ state: 'sp' }).state).toBe('SP');
  });

  it('rejeita UF com mais de 2 letras', () => {
    expect(UpdateDriverProfileBodySchema.safeParse({ state: 'São Paulo' }).success).toBe(false);
  });

  it('aceita status em minúsculas e devolve em maiúsculas', () => {
    expect(UpdateDriverProfileBodySchema.parse({ status: 'ativo' }).status).toBe('ATIVO');
  });

  it('rejeita status que não existe', () => {
    expect(UpdateDriverProfileBodySchema.safeParse({ status: 'dirigindo' }).success).toBe(false);
  });

  it('aceita apps e modalidades dos enums do banco', () => {
    const parsed = UpdateDriverProfileBodySchema.parse({
      rideApps: ['UBER', 'NOVENOVE'],
      rideCategories: ['UBER_X'],
    });

    expect(parsed.rideApps).toEqual(['UBER', 'NOVENOVE']);
    expect(parsed.rideCategories).toEqual(['UBER_X']);
  });

  it('rejeita app fora do enum', () => {
    expect(UpdateDriverProfileBodySchema.safeParse({ rideApps: ['BOLT'] }).success).toBe(false);
  });

  it('rejeita bio acima de 500 caracteres (limite da coluna)', () => {
    expect(UpdateDriverProfileBodySchema.safeParse({ bio: 'a'.repeat(501) }).success).toBe(false);
  });

  it('aceita avatarUrl em data-URL — a foto sobe redimensionada pelo navegador', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';

    expect(UpdateDriverProfileBodySchema.parse({ avatarUrl: dataUrl }).avatarUrl).toBe(dataUrl);
  });
});

describe('UpdateDriverStatusBodySchema', () => {
  it('aceita ATIVO', () => {
    expect(UpdateDriverStatusBodySchema.parse({ status: 'ATIVO' }).status).toBe('ATIVO');
  });

  it('aceita minúsculas e normaliza', () => {
    expect(UpdateDriverStatusBodySchema.parse({ status: 'inativo' }).status).toBe('INATIVO');
  });

  it('rejeita status inválido com mensagem em português', () => {
    const res = UpdateDriverStatusBodySchema.safeParse({ status: 'ONLINE' });

    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toContain('ATIVO');
  });

  it('exige o campo status', () => {
    expect(UpdateDriverStatusBodySchema.safeParse({}).success).toBe(false);
  });
});
```

`src/validators/__tests__/adminSchemas.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { MasterQuerySchema } from '../adminSchemas';

describe('MasterQuerySchema', () => {
  it('sem nenhum filtro, devolve só os defaults de paginação', () => {
    expect(MasterQuerySchema.parse({})).toEqual({ page: 1, limit: 50, days: 14 });
  });

  it('ignora parâmetros vindos vazios — o painel manda a chave quando o campo é limpo', () => {
    expect(MasterQuerySchema.parse({ region: '', state: '', city: '' })).toEqual({
      page: 1,
      limit: 50,
      days: 14,
    });
  });

  it('aceita região do enum do banco', () => {
    expect(MasterQuerySchema.parse({ region: 'SUDESTE' }).region).toBe('SUDESTE');
  });

  it('rejeita região inventada — hoje o código faz `String(q.region) as Region` sem checar', () => {
    const res = MasterQuerySchema.safeParse({ region: 'MARTE' });

    expect(res.success).toBe(false);
    expect(res.error!.issues[0].path).toEqual(['region']);
  });

  it('rejeita rideApp fora do enum', () => {
    expect(MasterQuerySchema.safeParse({ rideApp: 'BOLT' }).success).toBe(false);
  });

  it('rejeita rideCategory fora do enum', () => {
    expect(MasterQuerySchema.safeParse({ rideCategory: 'UBER_JATO' }).success).toBe(false);
  });

  it('normaliza a UF para maiúsculas', () => {
    expect(MasterQuerySchema.parse({ state: 'sp' }).state).toBe('SP');
  });

  it('rejeita UF que não tem 2 letras', () => {
    expect(MasterQuerySchema.safeParse({ state: 'SPX' }).success).toBe(false);
  });

  it('converte from/to em Date', () => {
    const parsed = MasterQuerySchema.parse({ from: '2026-01-01', to: '2026-01-31' });

    expect(parsed.from).toBeInstanceOf(Date);
    expect(parsed.to).toBeInstanceOf(Date);
  });

  it('rejeita data que não dá para interpretar', () => {
    const res = MasterQuerySchema.safeParse({ from: 'ontem de manhã' });

    expect(res.success).toBe(false);
    expect(res.error!.issues[0].message).toContain('Data inválida');
  });

  it('saneia o limit acima do teto em vez de derrubar a tela', () => {
    expect(MasterQuerySchema.parse({ limit: '9999' }).limit).toBe(200);
  });

  it('saneia o page abaixo de 1', () => {
    expect(MasterQuerySchema.parse({ page: '0' }).page).toBe(1);
  });

  it('saneia paginação não numérica para o default', () => {
    expect(MasterQuerySchema.parse({ limit: 'abc' }).limit).toBe(50);
  });

  it('saneia days acima de 90', () => {
    expect(MasterQuerySchema.parse({ days: '365' }).days).toBe(90);
  });

  it('respeita os valores válidos de paginação', () => {
    expect(MasterQuerySchema.parse({ page: '3', limit: '25', days: '7' })).toMatchObject({
      page: 3,
      limit: 25,
      days: 7,
    });
  });
});
```

- [ ] **Step 7: Rodar os testes dos schemas e ver falhar**

```bash
npm test -- src/validators
```

Esperado: FAIL com `Failed to resolve import "../campaignSchemas"` (idem `driverSchemas` e `adminSchemas`) — a pasta `src/validators/` ainda não existe.

- [ ] **Step 8: Criar `src/validators/campaignSchemas.ts`**

```ts
import { z } from 'zod';
import { CampaignStatus, QrPosition, Region, RideApp, RideCategory } from '@prisma/client';

/**
 * Schemas das rotas de escrita de campanha do anunciante.
 *
 * Os enums vêm do @prisma/client de propósito: o Prisma gera cada enum do
 * schema.prisma como objeto em runtime, então `z.enum(Region)` acompanha
 * qualquer região nova sem precisar repetir a lista aqui.
 *
 * Os números usam z.coerce porque o formulário do anunciante manda tudo como
 * string. Sem a coerção, `numVehicles: '5'` reprovaria; com ela, `'abc'` vira
 * NaN e é reprovado — que é exatamente o furo apontado na auditoria, onde
 * `Number('abc')` chegava NaN no serviço e gravava total_investment NaN.
 */

const uf = z
  .string()
  .trim()
  .length(2, 'UF precisa ter 2 letras (ex.: SP)')
  .transform((s) => s.toUpperCase());

export const CreateCampaignBodySchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'O título precisa de pelo menos 3 caracteres')
    .max(255, 'O título passa do limite de 255 caracteres'),
  description: z.string().trim().max(5000, 'A descrição passa de 5000 caracteres').optional(),
  /** Text no banco: o banner sobe como data-URL do navegador, então nada de z.url(). */
  imageUrl: z.string().min(1, 'Imagem inválida').optional(),
  numVehicles: z.coerce
    .number('Informe o número de veículos')
    .int('O número de veículos precisa ser inteiro')
    .positive('O número de veículos precisa ser maior que zero')
    .max(10000, 'Número de veículos alto demais'),
  durationDays: z.coerce
    .number('Informe a duração da campanha')
    .int('A duração precisa ser em dias inteiros')
    .positive('A duração precisa ser maior que zero')
    .max(365, 'A duração máxima é de 365 dias'),
  pricePerLead: z.coerce
    .number('Informe o valor por lead')
    .positive('O valor por lead precisa ser maior que zero')
    .max(100000, 'Valor por lead alto demais'),
  publish: z.boolean().optional(),
  destinationUrl: z
    .url('URL de destino inválida')
    .max(500, 'A URL de destino passa de 500 caracteres')
    .optional(),
  ctaText: z.string().trim().max(160, 'A chamada passa de 160 caracteres').optional(),

  // Montagem do anúncio na tela do tablet
  showQr: z.boolean().optional(),
  qrPosition: z.enum(QrPosition, 'Posição do QR inválida').optional(),
  showText: z.boolean().optional(),

  // Segmentação — lista vazia significa "qualquer motorista"
  targetRegions: z.array(z.enum(Region, 'Região inválida')).default([]),
  targetStates: z.array(uf).default([]),
  targetCities: z.array(z.string().trim().min(1).max(120)).default([]),
  targetRideApps: z.array(z.enum(RideApp, 'App de corrida inválido')).default([]),
  targetCategories: z.array(z.enum(RideCategory, 'Modalidade inválida')).default([]),
});

export const UpdateCampaignBodySchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'O título precisa de pelo menos 3 caracteres')
      .max(255, 'O título passa do limite de 255 caracteres')
      .optional(),
    status: z.enum(CampaignStatus, 'Status de campanha inválido').optional(),
    pricePerLead: z.coerce
      .number('Valor por lead inválido')
      .positive('O valor por lead precisa ser maior que zero')
      .max(100000, 'Valor por lead alto demais')
      .optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'Informe ao menos um campo para atualizar',
  });

export const CampaignIdParamsSchema = z.object({
  campaignId: z.string().trim().min(1, 'campaignId é obrigatório'),
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignBodySchema>;
export type UpdateCampaignInput = z.infer<typeof UpdateCampaignBodySchema>;
export type CampaignIdParams = z.infer<typeof CampaignIdParamsSchema>;
```

- [ ] **Step 9: Criar `src/validators/driverSchemas.ts`**

```ts
import { z } from 'zod';
import { MotoristStatus, RideApp, RideCategory } from '@prisma/client';
import { isValidPhoneBR, isValidPlate } from '../utils/brValidators';

/**
 * Schemas das rotas de escrita do motorista.
 *
 * Os limites de tamanho seguem as colunas de MotoristProfile no schema.prisma:
 * vehicle_info e bio são VarChar(500), city VarChar(120), state VarChar(2).
 * Passar disso hoje explode com erro do Postgres no meio do update, em vez de
 * virar um 400 legível.
 */

/**
 * Aceita 'ativo' e devolve 'ATIVO'. A rota fazia `status?.toUpperCase()` na mão
 * antes de chamar o serviço — a normalização passa a viver no schema.
 */
const motoristStatus = z
  .string('Informe o status')
  .transform((s) => s.trim().toUpperCase())
  .pipe(z.enum(MotoristStatus, 'Status precisa ser ATIVO, INATIVO ou SUSPENSO'));

export const UpdateDriverProfileBodySchema = z
  .object({
    name: z.string().trim().min(3, 'Informe o nome completo').max(255).optional(),
    phone: z.string().refine(isValidPhoneBR, 'Telefone com DDD inválido').optional(),
    vehicleInfo: z
      .string()
      .trim()
      .max(500, 'Descrição do veículo passa de 500 caracteres')
      .optional(),
    licensePlate: z
      .string()
      .refine(isValidPlate, 'Placa inválida')
      .transform((p) => p.trim().toUpperCase())
      .optional(),
    status: motoristStatus.optional(),
    bio: z.string().trim().max(500, 'A bio passa de 500 caracteres').optional(),
    city: z.string().trim().min(1, 'Informe a cidade').max(120).optional(),
    state: z
      .string()
      .trim()
      .length(2, 'UF precisa ter 2 letras (ex.: SP)')
      .transform((s) => s.toUpperCase())
      .optional(),
    rideApps: z.array(z.enum(RideApp, 'App de corrida inválido')).optional(),
    rideCategories: z.array(z.enum(RideCategory, 'Modalidade inválida')).optional(),
    /** Text no banco: a foto chega como data-URL redimensionada no cliente. */
    avatarUrl: z.string().min(1, 'Avatar inválido').optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'Informe ao menos um campo para atualizar',
  });

export const UpdateDriverStatusBodySchema = z.object({
  status: motoristStatus,
});

export type UpdateDriverProfileInput = z.infer<typeof UpdateDriverProfileBodySchema>;
export type UpdateDriverStatusInput = z.infer<typeof UpdateDriverStatusBodySchema>;
```

- [ ] **Step 10: Criar `src/validators/adminSchemas.ts`**

```ts
import { z } from 'zod';
import { Region, RideApp, RideCategory } from '@prisma/client';

/**
 * Filtros e paginação do painel MASTER.
 *
 * Enum, UF e data REJEITAM (viram 400): hoje `parseFilters` faz
 * `String(q.region) as Region` e entrega um valor inventado direto ao Prisma.
 * Paginação é SANEADA (clamp), como o código de hoje já fazia com Math.min /
 * Math.max — um `?limit=9999` é ruído de UI, não ataque, e derrubar a tela do
 * MASTER por causa disso seria regressão.
 */

/** Um `?state=` vazio é o mesmo que não filtrar — o painel manda a chave quando o campo é limpo. */
function dropEmptyStrings(raw: unknown): Record<string, unknown> {
  const query = { ...((raw as Record<string, unknown>) || {}) };
  for (const key of Object.keys(query)) {
    if (query[key] === '') delete query[key];
  }
  return query;
}

const clampedInt = (min: number, max: number, fallback: number) =>
  z.coerce
    .number()
    .int()
    // .catch cobre tanto o parâmetro ausente quanto o não numérico: os dois
    // caem no fallback em vez de virarem 400.
    .catch(fallback)
    .transform((n) => Math.min(max, Math.max(min, n)));

export const MasterQuerySchema = z.preprocess(
  dropEmptyStrings,
  z.object({
    region: z.enum(Region, 'Região inválida').optional(),
    state: z
      .string()
      .trim()
      .length(2, 'UF precisa ter 2 letras (ex.: SP)')
      .transform((s) => s.toUpperCase())
      .optional(),
    city: z.string().trim().min(1).max(120, 'Cidade passa de 120 caracteres').optional(),
    rideApp: z.enum(RideApp, 'App de corrida inválido').optional(),
    rideCategory: z.enum(RideCategory, 'Modalidade inválida').optional(),
    from: z.coerce.date('Data inválida — use o formato AAAA-MM-DD').optional(),
    to: z.coerce.date('Data inválida — use o formato AAAA-MM-DD').optional(),

    page: clampedInt(1, 100000, 1),
    limit: clampedInt(1, 200, 50),
    /** Só /admin/timeseries usa; estar aqui não atrapalha as outras rotas. */
    days: clampedInt(1, 90, 14),
  })
);

export type MasterQuery = z.infer<typeof MasterQuerySchema>;
```

- [ ] **Step 11: Rodar os testes dos schemas e ver passar**

```bash
npm test -- src/validators
```

Esperado: PASS — 3 arquivos, 56 testes verdes (23 de campanha, 18 de motorista, 15 do MASTER).

- [ ] **Step 12: Plugar os schemas em `src/routes/advertiser.ts`**

Trocar o import da linha 2 por:

```ts
import { verifyJWT, authorize, asyncHandler, validateRequest } from '../middleware';
```

Acrescentar, logo depois do import de `logger` (linha 6):

```ts
import {
  CreateCampaignBodySchema,
  UpdateCampaignBodySchema,
  CampaignIdParamsSchema,
  CreateCampaignInput,
  UpdateCampaignInput,
} from '../validators/campaignSchemas';
```

Trocar o handler `POST /campaigns` inteiro (hoje linhas 81-141) por:

```ts
router.post(
  '/campaigns',
  verifyJWT,
  authorize(UserType.ADVERTISER),
  validateRequest({ body: CreateCampaignBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Campaign creation requested by advertiser ${req.user?.id}`);

    // O validateRequest já reescreveu req.body com o resultado do parse:
    // números convertidos, enums conferidos e listas de segmentação com
    // default []. Some daqui o Number(), o asArray() e os `as any`.
    const data = req.body as CreateCampaignInput;

    const campaign = await AnuncianteService.createCampaign(
      req.user!.id,
      req.user!.companyId!,
      data
    );

    res.status(201).json({
      message: 'Campaign created successfully',
      data: campaign,
    });
  })
);
```

Trocar o handler `PATCH /campaigns/:campaignId` inteiro (hoje linhas 194-223) por:

```ts
router.patch(
  '/campaigns/:campaignId',
  verifyJWT,
  authorize(UserType.ADVERTISER),
  validateRequest({ body: UpdateCampaignBodySchema, params: CampaignIdParamsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Campaign update requested by ${req.user?.id}`);

    const data = req.body as UpdateCampaignInput;

    const updated = await AnuncianteService.updateCampaign(
      req.user!.id,
      req.user!.companyId!,
      req.params.campaignId,
      data
    );

    res.status(200).json({
      message: 'Campaign updated successfully',
      data: updated,
    });
  })
);
```

- [ ] **Step 13: Plugar os schemas em `src/routes/driver.ts`**

Trocar o import da linha 2 por:

```ts
import { verifyJWT, authorize, asyncHandler, validateRequest } from '../middleware';
```

Acrescentar, logo depois do import de `logger` (linha 7):

```ts
import {
  UpdateDriverProfileBodySchema,
  UpdateDriverStatusBodySchema,
  UpdateDriverProfileInput,
  UpdateDriverStatusInput,
} from '../validators/driverSchemas';
```

Trocar o handler `PATCH /profile` inteiro (hoje linhas 152-192) por:

```ts
router.patch(
  '/profile',
  verifyJWT,
  authorize(UserType.DRIVER),
  validateRequest({ body: UpdateDriverProfileBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Driver profile update requested by ${req.user?.id}`);

    // O schema já normalizou status, placa e UF para maiúsculas — o
    // `status?.toUpperCase()` que ficava aqui saiu.
    const data = req.body as UpdateDriverProfileInput;

    const updated = await MotoristaService.updateProfile(req.user!.id, req.user!.companyId!, data);

    res.status(200).json({
      message: 'Profile updated successfully',
      data: updated,
    });
  })
);
```

Trocar o handler `PATCH /status` inteiro (hoje linhas 245-266) por:

```ts
router.patch(
  '/status',
  verifyJWT,
  authorize(UserType.DRIVER),
  validateRequest({ body: UpdateDriverStatusBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    logger.info(`Driver status update requested by ${req.user?.id}`);

    const { status } = req.body as UpdateDriverStatusInput;

    const updated = await MotoristaService.updateStatus(req.user!.id, req.user!.companyId!, status);

    res.status(200).json({
      message: 'Status updated successfully',
      data: updated,
    });
  })
);
```

- [ ] **Step 14: Plugar o schema de query em `src/routes/admin.ts`**

Trocar as linhas 1-28 (imports, `parseFilters` e `pageOf`) por:

```ts
import { Router, Request, Response } from 'express';
import {
  verifyJWT,
  authorize,
  asyncHandler,
  validateRequest,
  getValidatedQuery,
} from '../middleware';
import { UserType } from '../types';
import { AdminService, MasterFilters } from '../services/adminService';
import { MasterQuerySchema, MasterQuery } from '../validators/adminSchemas';

const router = Router();

/**
 * Todas as rotas MASTER exigem um usuário ADMIN e todas leem os mesmos filtros
 * de query — por isso o validateRequest entra aqui, no router.use, e não
 * repetido em cada rota. As rotas POST não mandam query: para elas o schema
 * devolve só os defaults de paginação.
 */
router.use(verifyJWT, authorize(UserType.ADMIN), validateRequest({ query: MasterQuerySchema }));

/** Query já validada: enums conferidos contra o banco, datas viradas Date. */
const masterQuery = (req: Request): MasterQuery => getValidatedQuery<MasterQuery>(req);

function parseFilters(req: Request): MasterFilters {
  const q = masterQuery(req);
  const filters: MasterFilters = {};
  if (q.region) filters.region = q.region;
  if (q.state) filters.state = q.state;
  if (q.city) filters.city = q.city;
  if (q.rideApp) filters.rideApp = q.rideApp;
  if (q.rideCategory) filters.rideCategory = q.rideCategory;
  if (q.from) filters.from = q.from;
  if (q.to) filters.to = q.to;
  return filters;
}

const pageOf = (req: Request) => {
  const q = masterQuery(req);
  return { page: q.page, limit: q.limit };
};
```

E trocar o handler `GET /timeseries` (hoje linhas 39-45) por:

```ts
router.get(
  '/timeseries',
  asyncHandler(async (req: Request, res: Response) => {
    const { days } = masterQuery(req);
    res.json({ data: await AdminService.timeseries(days, parseFilters(req)) });
  })
);
```

Os handlers `/overview`, `/drivers`, `/companies`, `/campaigns`, `/campaigns/:campaignId/distribute` e `/assignments` **não mudam** — já chamam `parseFilters(req)` e `pageOf(req)`, que agora leem a query validada.

- [ ] **Step 15: Rodar a suíte inteira e o check**

```bash
cd /Users/Matheus/Desktop/FastLead
npm test && npm run check
```

Esperado: tudo verde. O `tsc --noEmit` é a prova de que os tipos dos schemas batem com os parâmetros reais dos serviços: `CreateCampaignInput` contra `AnuncianteService.createCampaign`, `UpdateCampaignInput` contra `AnuncianteService.updateCampaign`, `UpdateDriverProfileInput` contra `MotoristaService.updateProfile`, `MasterQuery.region` contra `MasterFilters.region`.

- [ ] **Step 16: Commit**

```bash
cd /Users/Matheus/Desktop/FastLead
git add src/middleware/validation.ts src/middleware/index.ts src/middleware/__tests__/validation.test.ts src/validators/ src/routes/advertiser.ts src/routes/driver.ts src/routes/admin.ts
git commit -m "feat(validation): validateRequest por parte da requisicao e schemas Zod

O validateRequest antigo fundia body+params+query num objeto so e gravava tudo
em req.body: o :campaignId da URL virava campo do body. Agora cada parte tem seu
schema. A query validada vai para req.validatedQuery porque no Express 5 o
req.query e getter e nao aceita reescrita.

Fecha o furo de pricePerLead NaN em POST /advertiser/campaigns e o cast direto
'as Region' nos filtros do MASTER.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: `src/utils/crypto.ts` — cifra AES-256-GCM genérica

**Files:**
- Create: `src/utils/crypto.ts`
- Test: `src/utils/__tests__/crypto.test.ts`
- Modify: `.env.example` (nova seção "Criptografia de dados sensíveis", depois da seção "Rate Limiting")

**Interfaces:**
- Consumes:
  - Task 1: `npm test`, convenção `src/**/__tests__/*.test.ts`, e o `.env.test` — que **já define** `ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef` (64 hex = 32 bytes). Sem isso a suíte cairia no fallback de desenvolvimento e imprimiria um aviso a cada arquivo de teste.
  - `AppError` de `src/utils/errors.ts` (statusCode 500).
- Produces:
  - `encrypt(plaintext: string): string` — devolve `iv:authTag:ciphertext`, cada parte em hex minúsculo (24 + 32 + N caracteres).
  - `decrypt(payload: string): string` — desfaz o `encrypt`; lança `AppError` (500) se o formato estiver errado, se a chave for outra ou se o dado tiver sido adulterado.
  - **Fail-fast no import:** com `NODE_ENV=production` e `ENCRYPTION_KEY` ausente, importar `src/utils/crypto.ts` **lança** e derruba o boot. Com a variável presente mas fora do formato (não são 64 caracteres hex), lança em qualquer ambiente.
  - A Task 7 consome `encrypt`/`decrypt` para guardar o segredo TOTP cifrado em `User.totp_secret`. **Rodar a Task 6 antes da Task 7.**
- **Descoberta D2 aplicada aqui:** o aviso em desenvolvimento sai por `console.warn`, não por `logger.warn`. `src/config/logger.ts` importa `src/config/config.ts`; manter `crypto.ts` sem nenhum import de config/logger deixa o módulo autossuficiente e sem risco de ciclo — ele lê `process.env` direto, exatamente como o `resolveSecret` da Task 3 faz.
- **Conflito de arquivo:** a Task 4 também edita `.env.example` (seção "Rate Limiting"). Esta task **acrescenta uma seção nova** logo abaixo, sem tocar na da Task 4 — se as duas rodarem em paralelo, o conflito é trivial de resolver.
- **Por que 12 bytes de IV:** é o tamanho para o qual o GCM foi projetado. Com 12 bytes o Node usa o IV direto como contador inicial; com outro tamanho ele passa o IV por um GHASH extra, sem ganho nenhum de segurança.

- [ ] **Step 1: Escrever o teste que ainda falha**

`src/utils/__tests__/crypto.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const originalEnv = { ...process.env };
const CHAVE_A = 'a'.repeat(64);
const CHAVE_B = 'b'.repeat(64);

/** Recarrega o módulo do zero: a chave é resolvida no import, não a cada chamada. */
async function loadCrypto() {
  vi.resetModules();
  return import('../crypto');
}

describe('crypto — ida e volta', () => {
  it('decifra de volta exatamente o que foi cifrado', async () => {
    const { encrypt, decrypt } = await loadCrypto();

    expect(decrypt(encrypt('JBSWY3DPEHPK3PXP'))).toBe('JBSWY3DPEHPK3PXP');
  });

  it('preserva acentos e emoji', async () => {
    const { encrypt, decrypt } = await loadCrypto();
    const texto = 'ação — çãó 😀';

    expect(decrypt(encrypt(texto))).toBe(texto);
  });

  it('lida com string vazia', async () => {
    const { encrypt, decrypt } = await loadCrypto();

    expect(decrypt(encrypt(''))).toBe('');
  });

  it('produz saídas diferentes para a mesma entrada — o IV é sorteado toda vez', async () => {
    const { encrypt } = await loadCrypto();

    expect(encrypt('mesmo-segredo')).not.toBe(encrypt('mesmo-segredo'));
  });
});

describe('crypto — formato iv:authTag:ciphertext', () => {
  it('devolve três partes separadas por dois-pontos', async () => {
    const { encrypt } = await loadCrypto();

    expect(encrypt('segredo').split(':')).toHaveLength(3);
  });

  it('usa IV de 12 bytes e authTag de 16 bytes, ambos em hex', async () => {
    const { encrypt } = await loadCrypto();

    const [iv, authTag, ciphertext] = encrypt('segredo').split(':');

    expect(iv).toMatch(/^[0-9a-f]{24}$/);
    expect(authTag).toMatch(/^[0-9a-f]{32}$/);
    expect(ciphertext).toMatch(/^[0-9a-f]+$/);
  });
});

describe('crypto — recusa dado corrompido', () => {
  it('lança quando o ciphertext foi adulterado', async () => {
    const { encrypt, decrypt } = await loadCrypto();
    const [iv, authTag, ciphertext] = encrypt('segredo').split(':');
    const trocado = (ciphertext[0] === 'a' ? 'b' : 'a') + ciphertext.slice(1);

    expect(() => decrypt(`${iv}:${authTag}:${trocado}`)).toThrow();
  });

  it('lança quando o authTag foi adulterado', async () => {
    const { encrypt, decrypt } = await loadCrypto();
    const [iv, authTag, ciphertext] = encrypt('segredo').split(':');
    const trocado = (authTag[0] === 'a' ? 'b' : 'a') + authTag.slice(1);

    expect(() => decrypt(`${iv}:${trocado}:${ciphertext}`)).toThrow();
  });

  it('lança quando o valor não tem as três partes', async () => {
    const { decrypt } = await loadCrypto();

    expect(() => decrypt('so-uma-parte')).toThrow(/formato/i);
  });

  it('lança quando o IV não tem o tamanho certo', async () => {
    const { encrypt, decrypt } = await loadCrypto();
    const [, authTag, ciphertext] = encrypt('segredo').split(':');

    expect(() => decrypt(`abcd:${authTag}:${ciphertext}`)).toThrow(/formato/i);
  });

  it('o erro de decifra é um AppError com statusCode 500', async () => {
    const { decrypt } = await loadCrypto();
    const { AppError } = await import('../errors');

    try {
      decrypt('so-uma-parte');
      expect.unreachable('decrypt deveria ter lançado');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as InstanceType<typeof AppError>).statusCode).toBe(500);
    }
  });
});

describe('crypto — a chave importa', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('não decifra o que foi cifrado com outra chave', async () => {
    process.env.ENCRYPTION_KEY = CHAVE_A;
    const comChaveA = await loadCrypto();
    const cifrado = comChaveA.encrypt('segredo');

    process.env.ENCRYPTION_KEY = CHAVE_B;
    const comChaveB = await loadCrypto();

    expect(() => comChaveB.decrypt(cifrado)).toThrow();
  });

  it('em produção, recusa subir sem ENCRYPTION_KEY', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.ENCRYPTION_KEY;

    await expect(loadCrypto()).rejects.toThrow(/ENCRYPTION_KEY/);
  });

  it('em produção, sobe normalmente com ENCRYPTION_KEY válida', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ENCRYPTION_KEY = CHAVE_A;

    const { encrypt, decrypt } = await loadCrypto();

    expect(decrypt(encrypt('ok'))).toBe('ok');
  });

  it('recusa ENCRYPTION_KEY que não tem 64 caracteres hex', async () => {
    process.env.NODE_ENV = 'development';
    process.env.ENCRYPTION_KEY = 'chave-curta-demais';

    await expect(loadCrypto()).rejects.toThrow(/64/);
  });

  it('em desenvolvimento, avisa e usa a chave de conveniência', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.ENCRYPTION_KEY;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const { encrypt, decrypt } = await loadCrypto();

    expect(decrypt(encrypt('ok'))).toBe('ok');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('ENCRYPTION_KEY');
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

```bash
cd /Users/Matheus/Desktop/FastLead
npm test -- src/utils/__tests__/crypto.test.ts
```

Esperado: FAIL com `Failed to resolve import "../crypto"`.

- [ ] **Step 3: Implementar `src/utils/crypto.ts`**

```ts
import crypto from 'crypto';
import { AppError } from './errors';

/**
 * Cifra simétrica genérica da aplicação.
 *
 * AES-256-GCM e não AES-256-CBC: o GCM é autenticado, ou seja, ele mesmo
 * detecta que o dado foi adulterado. Com CBC, um byte trocado no banco viraria
 * um "segredo" diferente decifrado em silêncio.
 *
 * Formato de saída: `iv:authTag:ciphertext`, tudo em hex. É autocontido —
 * decifrar precisa só do valor guardado e da ENCRYPTION_KEY, sem nenhuma
 * coluna auxiliar.
 *
 * O módulo lê process.env direto, sem importar config nem logger: assim ele
 * fica utilizável de qualquer camada e não participa do ciclo
 * config → logger → config.
 */

const ALGORITHM = 'aes-256-gcm';
/** 96 bits: o tamanho para o qual o GCM foi projetado. */
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
/** ENCRYPTION_KEY é hex; 64 caracteres = 32 bytes = AES-256. */
const KEY_HEX_LENGTH = 64;

/**
 * Chave de conveniência para desenvolvimento. Não é segredo — está publicada
 * no repositório de propósito, e o processo avisa alto quando cai nela.
 */
const DEV_ENCRYPTION_KEY = 'dead'.repeat(16);

function resolveEncryptionKey(): Buffer {
  const raw = (process.env.ENCRYPTION_KEY || '').trim();

  if (raw) {
    if (!/^[0-9a-fA-F]+$/.test(raw) || raw.length !== KEY_HEX_LENGTH) {
      throw new Error(
        `ENCRYPTION_KEY precisa ter exatamente ${KEY_HEX_LENGTH} caracteres hexadecimais ` +
          '(32 bytes). Gere uma com: openssl rand -hex 32'
      );
    }
    return Buffer.from(raw, 'hex');
  }

  if ((process.env.NODE_ENV || 'development') === 'production') {
    throw new Error(
      'ENCRYPTION_KEY ausente. Defina a variável de ambiente antes de subir em produção — ' +
        'sem ela os dados sensíveis seriam cifrados com uma chave publicada no repositório.'
    );
  }

  // eslint-disable-next-line no-console
  console.warn(
    '[crypto] ENCRYPTION_KEY ausente ou vazia — usando a chave de desenvolvimento. ' +
      'NUNCA suba em produção assim.'
  );
  return Buffer.from(DEV_ENCRYPTION_KEY, 'hex');
}

// Resolvida no import de propósito: é isso que faz o boot em produção morrer
// cedo, e não na primeira vez que alguém tentar cifrar alguma coisa.
const key = resolveEncryptionKey();

/** Cifra um texto e devolve `iv:authTag:ciphertext` em hex. */
export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), ciphertext.toString('hex')].join(
    ':'
  );
}

/** Desfaz o `encrypt`. Lança se o formato estiver errado ou o dado tiver sido mexido. */
export function decrypt(payload: string): string {
  const parts = String(payload).split(':');

  if (parts.length !== 3) {
    throw new AppError('Valor cifrado em formato inválido', 500);
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  // Buffer.from('zz', 'hex') não lança — devolve buffer curto. O tamanho é a
  // única checagem que pega hex inválido.
  if (iv.length !== IV_BYTES || authTag.length !== AUTH_TAG_BYTES) {
    throw new AppError('Valor cifrado em formato inválido', 500);
  }

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new AppError(
      'Não foi possível decifrar o valor — chave errada ou dado adulterado',
      500
    );
  }
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

```bash
npm test -- src/utils/__tests__/crypto.test.ts
```

Esperado: PASS — 16 testes verdes.

- [ ] **Step 5: Documentar a variável nova no `.env.example`**

Acrescentar ao `.env.example`, logo **depois** da seção `# Rate Limiting`:

```bash
# ============================================================================
# Criptografia de dados sensíveis (AES-256-GCM)
# ============================================================================
# 32 bytes em hexadecimal (64 caracteres). Gere com: openssl rand -hex 32
# Obrigatória em produção — sem ela o processo se recusa a subir.
# Trocar esta chave torna ilegível tudo que já foi cifrado com a anterior.
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000
```

- [ ] **Step 6: Rodar a suíte inteira e o check**

```bash
cd /Users/Matheus/Desktop/FastLead
npm test && npm run check
```

Esperado: tudo verde, e **sem** o aviso `[crypto] ENCRYPTION_KEY ausente` no output — o `.env.test` da Task 1 já traz a chave.

- [ ] **Step 7: Commit**

```bash
cd /Users/Matheus/Desktop/FastLead
git add src/utils/crypto.ts src/utils/__tests__/crypto.test.ts .env.example
git commit -m "feat(crypto): cifra AES-256-GCM generica no formato iv:authTag:ciphertext

Autenticada de proposito: com CBC um byte trocado no banco viraria um segredo
diferente decifrado em silencio. Em producao o import se recusa a resolver a
chave sem ENCRYPTION_KEY definida.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: 2FA TOTP para ADMIN/MASTER

**Files:**
- Modify: `prisma/schema.prisma` (modelo `User`, depois de `last_login_at` na linha 199)
- Create: `prisma/migrations/20260807a_totp/migration.sql`
- Modify: `src/utils/jwt.ts` (`verifyToken` nas linhas 25-32; funções novas no fim)
- Modify: `src/types/index.ts` (depois de `AuthResponse`, linha 52)
- Create: `src/services/totpService.ts`
- Create: `src/validators/twoFactorSchemas.ts`
- Modify: `src/services/authService.ts` (imports; `login` nas linhas 173-225; novos `verifyMfa` e `issueTokens`)
- Modify: `src/routes/admin.ts` (dois endpoints novos, antes do `export default router`)
- Modify: `src/routes/auth.ts` (handler de `/login` nas linhas 95-106; novo `POST /2fa/verify`)
- Create: `src/__tests__/helpers/db.ts`
- Modify: `.env.test` (limites de rate limit de auth)
- Test: `src/services/__tests__/totpService.test.ts`
- Test: `src/routes/__tests__/auth2fa.test.ts`

**Interfaces:**
- Consumes:
  - Task 1: `npm test`, `.env.test`, `src/__tests__/helpers/auth.ts` (`signAuthHeader`, `adminAuthHeader(overrides?)`).
  - Task 5: `validateRequest(schemas: RequestSchemas)` com a assinatura por-parte, e a pasta `src/validators/`. **Rodar a Task 7 depois da Task 5** — é a ordem já sugerida no grafo de dependências.
  - Task 6: `encrypt(plaintext: string): string` e `decrypt(payload: string): string` de `src/utils/crypto.ts`. **Obrigatório rodar a Task 6 antes.**
  - `AuthenticationError`, `NotFoundError`, `ValidationError` de `src/utils/errors.ts`.
- Produces:
  - `prisma/schema.prisma`: `User.totp_secret String? @db.Text` e `User.totp_enabled Boolean @default(false)`.
  - `src/utils/jwt.ts`:
    - `MFA_PENDING_TTL_SECONDS = 300`
    - `generateMfaPendingToken(payload: AuthPayload): string`
    - `verifyMfaPendingToken(token: string): AuthPayload | null`
    - `verifyToken` passa a **rejeitar** tokens com a claim `mfa: true` (devolve `null`).
  - `src/types/index.ts`: `MfaPendingResponse`, `LoginResult`, `isMfaPending(result: LoginResult): result is MfaPendingResponse`.
  - `src/services/totpService.ts`: `TotpService.setup(userId): Promise<TotpSetupResult>`, `TotpService.enable(userId, code): Promise<{ enabled: true }>`, `TotpService.verifyForUser(userId, code): Promise<boolean>`, e a interface `TotpSetupResult { secret: string; otpauthUrl: string; qrCodeDataUrl: string }`.
  - `src/validators/twoFactorSchemas.ts`: `TotpEnableBodySchema`, `MfaVerifyBodySchema` e os tipos `TotpEnableInput`, `MfaVerifyInput`.
  - `src/services/authService.ts`: `login(payload): Promise<LoginResult>` (**mudança de tipo de retorno**, antes era `Promise<AuthResponse>`) e `verifyMfa(mfaToken, code): Promise<AuthResponse>`.
  - `src/__tests__/helpers/db.ts`: `createTestUser(options?: TestUserOptions): Promise<TestUser>` e `deleteTestUser(user: TestUser): Promise<void>` — é o arquivo que a tabela "File Structure" lista como "usado pelo 2FA" e que a Task 1 não chegou a criar.
  - Endpoints novos: `POST /admin/2fa/setup`, `POST /admin/2fa/enable`, `POST /auth/2fa/verify`.
- **Descoberta D7 aplicada aqui:** `otplib` 13.4.1 tem API funcional assíncrona — `generateSecret(): string`, `generateURI({ issuer, label, secret }): string`, `await generate({ secret }): Promise<string>`, `await verify({ secret, token, epochTolerance }): Promise<{ valid: true; delta: number } | { valid: false }>`. O `authenticator.*` da v12 não existe mais. O pacote publica build CJS com types (`dist/index.cjs` + `dist/index.d.cts`), então funciona com `module: Node16`.
- **Decisão de segurança — o token `mfa_pending` usa o MESMO `JWT_SECRET`, e por isso `verifyToken` precisa recusá-lo explicitamente.** Sem essa recusa, o token intermediário passaria por token normal em `verifyJWT` e o admin entraria em `/admin` sem nunca digitar o código: o 2FA viraria decoração. A claim `mfa: true` é o que separa os dois.
- **Task 8 também edita `src/routes/admin.ts` e `src/routes/auth.ts`.** Ordem sugerida: **5 antes de 7 antes de 8**.
- **`qrcode` já é dependência do projeto** (`package.json`, `"qrcode": "^1.5.4"` + `@types/qrcode`), usada em `src/services/qrService.ts:36`. Nada a instalar por ela.

- [ ] **Step 1: Instalar o `otplib`**

```bash
cd /Users/Matheus/Desktop/FastLead
npm install otplib@^13.4.1
```

- [ ] **Step 2: Levantar os limites de rate limit de auth no `.env.test`**

O `authLimiter` da Task 4 deixa passar só 10 requisições em 5 minutos em `/auth/login`. O teste ponta a ponta desta task faz vários logins seguidos e bateria em 429. Acrescentar ao `.env.test`, logo abaixo de `RATE_LIMIT_MAX_REQUESTS=100000`:

```bash
# Alto de propósito, mesmo motivo do limiter global: o teste ponta a ponta do
# 2FA faz vários POST /auth/login em sequência.
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX_REQUESTS=100000
```

- [ ] **Step 3: Adicionar as colunas ao `prisma/schema.prisma`**

No modelo `User`, logo depois da linha `last_login_at     DateTime? @db.Timestamp()`:

```prisma
  /// Segredo TOTP CIFRADO com AES-256-GCM (src/utils/crypto.ts), nunca em claro.
  /// Text e não VarChar: o segredo base32 tem 32 caracteres, mas o valor
  /// cifrado (iv:authTag:ciphertext em hex) passa de 130.
  totp_secret       String?  @db.Text
  /// Só vira true depois que o admin confirma o primeiro código no app dele.
  totp_enabled      Boolean  @default(false)
```

- [ ] **Step 4: Escrever a migration de produção**

`prisma/migrations/20260807a_totp/migration.sql`:

```sql
-- 2FA TOTP para contas ADMIN/MASTER.
--
-- totp_secret guarda o segredo CIFRADO (AES-256-GCM, formato iv:authTag:ciphertext).
-- Por isso é TEXT e não VARCHAR(32): o segredo base32 tem 32 caracteres, mas o
-- valor cifrado em hex passa de 130.
ALTER TABLE "User" ADD COLUMN "totp_secret" TEXT;

-- NOT NULL DEFAULT false: as contas que já existem continuam entrando só com
-- senha até alguém rodar POST /admin/2fa/setup nelas.
ALTER TABLE "User" ADD COLUMN "totp_enabled" BOOLEAN NOT NULL DEFAULT false;
```

- [ ] **Step 5: Regenerar o client do Prisma e atualizar o banco de teste**

```bash
cd /Users/Matheus/Desktop/FastLead
npx prisma generate
docker compose up -d postgres
npm run db:test:setup
```

Esperado: `Your database is now in sync with your Prisma schema.` — as duas colunas passam a existir em `fastlead_test`.

- [ ] **Step 6: Criar o helper de banco dos testes**

`src/__tests__/helpers/db.ts`:

```ts
import { randomUUID } from 'crypto';
import prisma from '../../lib/prisma';
import { hashPassword } from '../../utils/password';

/**
 * Cria usuários de verdade no banco de teste.
 *
 * Diferente de src/__tests__/helpers/auth.ts, que só assina um header e nunca
 * toca no banco: os testes de 2FA leem e escrevem colunas do usuário, então
 * precisam de uma linha real.
 *
 * Cada usuário ganha a PRÓPRIA empresa. O e-mail de Company é UNIQUE e o par
 * (company_id, email) de User também — dar uma empresa por usuário evita que
 * dois testes colidam.
 */

export interface TestUserOptions {
  email?: string;
  password?: string;
  /** Tipo como o BANCO guarda (o JWT usa driver/advertiser/admin). */
  type?: 'MOTORISTA' | 'ANUNCIANTE' | 'ADMIN';
  totpSecret?: string | null;
  totpEnabled?: boolean;
}

export interface TestUser {
  id: string;
  email: string;
  /** Senha em claro, para o teste conseguir fazer POST /auth/login. */
  password: string;
  companyId: string;
}

export async function createTestUser(options: TestUserOptions = {}): Promise<TestUser> {
  const email = options.email ?? `teste-${randomUUID()}@fastlead.com.br`;
  const password = options.password ?? 'Senha@2026';

  const company = await prisma.company.create({
    data: { name: `Empresa de teste ${email}`, email },
  });

  const user = await prisma.user.create({
    data: {
      email,
      password_hash: await hashPassword(password),
      name: 'Usuário de teste',
      type: options.type ?? 'ADMIN',
      company_id: company.id,
      is_active: true,
      is_verified: true,
      totp_secret: options.totpSecret ?? null,
      totp_enabled: options.totpEnabled ?? false,
    },
  });

  return { id: user.id, email: user.email, password, companyId: company.id };
}

/** Apaga o usuário e a empresa criados por `createTestUser`. */
export async function deleteTestUser(user: TestUser): Promise<void> {
  // Company → User tem onDelete: Cascade no schema, então apagar a empresa
  // leva o usuário junto. deleteMany e não delete: não falha se já sumiu.
  await prisma.company.deleteMany({ where: { id: user.companyId } });
}
```

- [ ] **Step 7: Escrever o teste que ainda falha do `TotpService`**

`src/services/__tests__/totpService.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { generate } from 'otplib';
import { TotpService } from '../totpService';
import prisma from '../../lib/prisma';
import { createTestUser, deleteTestUser, TestUser } from '../../__tests__/helpers/db';
import { ValidationError } from '../../utils/errors';

let admin: TestUser;

beforeEach(async () => {
  admin = await createTestUser({ type: 'ADMIN' });
});

afterEach(async () => {
  await deleteTestUser(admin);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('TotpService.setup', () => {
  it('devolve segredo, URI otpauth e QR em data-URL', async () => {
    const result = await TotpService.setup(admin.id);

    expect(result.secret).toMatch(/^[A-Z2-7]+$/);
    expect(result.otpauthUrl).toContain('otpauth://totp/');
    expect(result.otpauthUrl).toContain('FastLead');
    expect(result.qrCodeDataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('guarda o segredo CIFRADO no banco, nunca em claro', async () => {
    const { secret } = await TotpService.setup(admin.id);

    const row = await prisma.user.findUnique({
      where: { id: admin.id },
      select: { totp_secret: true },
    });

    expect(row!.totp_secret).not.toBe(secret);
    expect(row!.totp_secret!.split(':')).toHaveLength(3);
  });

  it('não ativa o 2FA — só o /enable ativa', async () => {
    await TotpService.setup(admin.id);

    const row = await prisma.user.findUnique({
      where: { id: admin.id },
      select: { totp_enabled: true },
    });

    expect(row!.totp_enabled).toBe(false);
  });

  it('recusa refazer o setup quando o 2FA já está ativo', async () => {
    const { secret } = await TotpService.setup(admin.id);
    await TotpService.enable(admin.id, await generate({ secret }));

    await expect(TotpService.setup(admin.id)).rejects.toThrow(ValidationError);
  });
});

describe('TotpService.enable', () => {
  it('ativa o 2FA quando o código bate', async () => {
    const { secret } = await TotpService.setup(admin.id);

    const result = await TotpService.enable(admin.id, await generate({ secret }));

    expect(result).toEqual({ enabled: true });
    const row = await prisma.user.findUnique({
      where: { id: admin.id },
      select: { totp_enabled: true },
    });
    expect(row!.totp_enabled).toBe(true);
  });

  it('recusa código errado e deixa o 2FA desligado', async () => {
    const { secret } = await TotpService.setup(admin.id);
    const certo = await generate({ secret });
    // Um número vizinho não é o código de nenhuma janela adjacente.
    const errado = String((Number(certo) + 1) % 1000000).padStart(6, '0');

    await expect(TotpService.enable(admin.id, errado)).rejects.toThrow(ValidationError);

    const row = await prisma.user.findUnique({
      where: { id: admin.id },
      select: { totp_enabled: true },
    });
    expect(row!.totp_enabled).toBe(false);
  });

  it('recusa código que não tem 6 dígitos', async () => {
    await TotpService.setup(admin.id);

    await expect(TotpService.enable(admin.id, 'abcdef')).rejects.toThrow(ValidationError);
  });

  it('recusa ativar sem ter feito o setup antes', async () => {
    await expect(TotpService.enable(admin.id, '123456')).rejects.toThrow(/setup/i);
  });
});

describe('TotpService.verifyForUser', () => {
  it('devolve false quando o 2FA não está ativo', async () => {
    const { secret } = await TotpService.setup(admin.id);

    expect(await TotpService.verifyForUser(admin.id, await generate({ secret }))).toBe(false);
  });

  it('devolve true para o código corrente depois de ativado', async () => {
    const { secret } = await TotpService.setup(admin.id);
    await TotpService.enable(admin.id, await generate({ secret }));

    expect(await TotpService.verifyForUser(admin.id, await generate({ secret }))).toBe(true);
  });

  it('devolve false para outro código de 6 dígitos', async () => {
    const { secret } = await TotpService.setup(admin.id);
    const certo = await generate({ secret });
    await TotpService.enable(admin.id, certo);
    const errado = String((Number(certo) + 1) % 1000000).padStart(6, '0');

    expect(await TotpService.verifyForUser(admin.id, errado)).toBe(false);
  });

  it('devolve false para código em formato inválido', async () => {
    const { secret } = await TotpService.setup(admin.id);
    await TotpService.enable(admin.id, await generate({ secret }));

    expect(await TotpService.verifyForUser(admin.id, 'nao-e-codigo')).toBe(false);
  });

  it('devolve false para usuário que nem sabe o que é 2FA', async () => {
    expect(await TotpService.verifyForUser(admin.id, '123456')).toBe(false);
  });
});
```

- [ ] **Step 8: Rodar o teste e ver falhar**

```bash
npm test -- src/services/__tests__/totpService.test.ts
```

Esperado: FAIL com `Failed to resolve import "../totpService"`.

- [ ] **Step 9: Implementar `src/services/totpService.ts`**

```ts
import { generate, generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import prisma from '../lib/prisma';
import { encrypt, decrypt } from '../utils/crypto';
import { NotFoundError, ValidationError } from '../utils/errors';
import logger from '../config/logger';

/**
 * TOTP (RFC 6238) para contas ADMIN/MASTER, sem nenhuma API externa: o otplib
 * gera e confere o código localmente e o qrcode desenha o QR.
 *
 * O segredo nunca fica em claro no banco — vai cifrado por src/utils/crypto.ts.
 * Quem levar um dump do Postgres não consegue gerar códigos válidos sem também
 * ter a ENCRYPTION_KEY.
 */

/** Nome que aparece no app autenticador do admin. */
const ISSUER = 'FastLead';

/**
 * Tolerância de 30s para cada lado (uma janela). Relógio de celular atrasado é
 * a causa nº 1 de "meu código não funciona"; aceitar 3 janelas em vez de 1 já
 * seria janela demais para força bruta.
 */
const EPOCH_TOLERANCE_SECONDS = 30;

const SIX_DIGITS = /^\d{6}$/;

export interface TotpSetupResult {
  /** Segredo base32, mostrado uma única vez para digitação manual. */
  secret: string;
  otpauthUrl: string;
  /** PNG em data-URL, pronto para um `<img src>`. */
  qrCodeDataUrl: string;
}

export class TotpService {
  /**
   * Gera o segredo e devolve o QR. NÃO liga o 2FA: se ligasse aqui, um admin
   * que fechasse a tela antes de escanear ficaria trancado para fora da conta.
   */
  static async setup(userId: string): Promise<TotpSetupResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, totp_enabled: true },
    });

    if (!user) throw new NotFoundError('Usuário não encontrado');
    if (user.totp_enabled) {
      throw new ValidationError('O 2FA já está ativo nesta conta');
    }

    const secret = generateSecret();
    const otpauthUrl = generateURI({ issuer: ISSUER, label: user.email, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await prisma.user.update({
      where: { id: user.id },
      data: { totp_secret: encrypt(secret), totp_enabled: false },
    });

    logger.info(`TOTP: enrollment iniciado para ${user.email}`);

    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  /** Liga o 2FA depois de o admin provar que o app dele já gera o código certo. */
  static async enable(userId: string, code: string): Promise<{ enabled: true }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, totp_secret: true, totp_enabled: true },
    });

    if (!user) throw new NotFoundError('Usuário não encontrado');
    if (user.totp_enabled) throw new ValidationError('O 2FA já está ativo nesta conta');
    if (!user.totp_secret) {
      throw new ValidationError('Rode POST /admin/2fa/setup antes de ativar o 2FA');
    }

    const ok = await TotpService.checkCode(decrypt(user.totp_secret), code);
    if (!ok) {
      throw new ValidationError(
        'Código inválido. Confira o relógio do aparelho e tente com o código atual.'
      );
    }

    await prisma.user.update({ where: { id: user.id }, data: { totp_enabled: true } });
    logger.info(`TOTP: ativado para ${user.email}`);

    return { enabled: true };
  }

  /**
   * Confere o código no login. Devolve `false` (e não lança) quando o usuário
   * não tem 2FA ativo: quem chama já decidiu que o segundo fator era exigido.
   */
  static async verifyForUser(userId: string, code: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totp_secret: true, totp_enabled: true },
    });

    if (!user || !user.totp_enabled || !user.totp_secret) return false;

    return TotpService.checkCode(decrypt(user.totp_secret), code);
  }

  private static async checkCode(secret: string, code: string): Promise<boolean> {
    const token = String(code || '').trim();
    if (!SIX_DIGITS.test(token)) return false;

    const result = await verify({ secret, token, epochTolerance: EPOCH_TOLERANCE_SECONDS });
    return result.valid;
  }
}
```

- [ ] **Step 10: Rodar o teste e ver passar**

```bash
npm test -- src/services/__tests__/totpService.test.ts
```

Esperado: PASS — 13 testes verdes.

- [ ] **Step 11: Escrever o teste ponta a ponta que ainda falha**

`src/routes/__tests__/auth2fa.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { generate } from 'otplib';
import app from '../../app';
import prisma from '../../lib/prisma';
import { createTestUser, deleteTestUser, TestUser } from '../../__tests__/helpers/db';
import { adminAuthHeader } from '../../__tests__/helpers/auth';

/**
 * Escada ponta a ponta: cada teste depende do estado deixado pelo anterior.
 * O Vitest roda os `it` de um arquivo em ordem, e o vitest.config.ts da Task 1
 * põe fileParallelism: false — então esta sequência é estável.
 */
let admin: TestUser;
let segredo: string;
let mfaToken: string;
let tokenFinal: string;

beforeAll(async () => {
  admin = await createTestUser({ type: 'ADMIN' });
});

afterAll(async () => {
  await deleteTestUser(admin);
  await prisma.$disconnect();
});

describe('login com 2FA — fluxo completo', () => {
  it('1. sem 2FA ativo, o login devolve os tokens completos', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: admin.email, password: admin.password });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.mfaRequired).toBeUndefined();
  });

  it('2. POST /admin/2fa/setup devolve o QR e o segredo', async () => {
    const res = await request(app)
      .post('/admin/2fa/setup')
      .set(adminAuthHeader({ id: admin.id, email: admin.email, companyId: admin.companyId }));

    expect(res.status).toBe(201);
    expect(res.body.data.secret).toMatch(/^[A-Z2-7]+$/);
    expect(res.body.data.qrCodeDataUrl.startsWith('data:image/png;base64,')).toBe(true);

    segredo = res.body.data.secret;
  });

  it('3. POST /admin/2fa/enable recusa código errado', async () => {
    const certo = await generate({ secret: segredo });
    const errado = String((Number(certo) + 1) % 1000000).padStart(6, '0');

    const res = await request(app)
      .post('/admin/2fa/enable')
      .set(adminAuthHeader({ id: admin.id, email: admin.email, companyId: admin.companyId }))
      .send({ code: errado });

    expect(res.status).toBe(400);
  });

  it('4. POST /admin/2fa/enable liga o 2FA com o código certo', async () => {
    const res = await request(app)
      .post('/admin/2fa/enable')
      .set(adminAuthHeader({ id: admin.id, email: admin.email, companyId: admin.companyId }))
      .send({ code: await generate({ secret: segredo }) });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ enabled: true });
  });

  it('5. com 2FA ativo, o login para no mfaToken e NÃO entrega os tokens', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: admin.email, password: admin.password });

    expect(res.status).toBe(200);
    expect(res.body.data.mfaRequired).toBe(true);
    expect(res.body.data.mfaToken).toBeTruthy();
    expect(res.body.data.expiresIn).toBe(300);
    expect(res.body.data.token).toBeUndefined();
    expect(res.body.data.refreshToken).toBeUndefined();

    mfaToken = res.body.data.mfaToken;
  });

  it('6. o mfaToken NÃO serve como token de acesso', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${mfaToken}`);

    // É assinado com o mesmo JWT_SECRET; a claim mfa:true é o que faz o
    // verifyToken recusá-lo. Sem essa recusa o 2FA seria decoração.
    expect(res.status).toBe(401);
  });

  it('7. o mfaToken também não abre as rotas do MASTER', async () => {
    const res = await request(app).get('/admin/overview').set('Authorization', `Bearer ${mfaToken}`);

    expect(res.status).toBe(401);
  });

  it('8. POST /auth/2fa/verify recusa código errado', async () => {
    const certo = await generate({ secret: segredo });
    const errado = String((Number(certo) + 1) % 1000000).padStart(6, '0');

    const res = await request(app).post('/auth/2fa/verify').send({ mfaToken, code: errado });

    expect(res.status).toBe(401);
  });

  it('9. POST /auth/2fa/verify recusa mfaToken forjado', async () => {
    const res = await request(app)
      .post('/auth/2fa/verify')
      .send({ mfaToken: 'nao.e.um.token', code: await generate({ secret: segredo }) });

    expect(res.status).toBe(401);
  });

  it('10. POST /auth/2fa/verify entrega os tokens com o código certo', async () => {
    const res = await request(app)
      .post('/auth/2fa/verify')
      .send({ mfaToken, code: await generate({ secret: segredo }) });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.user.email).toBe(admin.email);
    expect(res.body.data.user.type).toBe('admin');

    tokenFinal = res.body.data.token;
  });

  it('11. o token entregue no fim do 2FA autentica de verdade', async () => {
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${tokenFinal}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(admin.email);
  });
});

describe('POST /auth/2fa/verify — validação de entrada', () => {
  it('recusa corpo sem mfaToken', async () => {
    const res = await request(app).post('/auth/2fa/verify').send({ code: '123456' });

    expect(res.status).toBe(400);
  });

  it('recusa código que não tem 6 dígitos', async () => {
    const res = await request(app).post('/auth/2fa/verify').send({ mfaToken: 'x', code: '12' });

    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 12: Rodar o teste e ver falhar**

```bash
npm test -- src/routes/__tests__/auth2fa.test.ts
```

Esperado: FAIL — `POST /admin/2fa/setup` responde 404 (rota inexistente) e o teste 5 recebe os tokens completos em vez do `mfaRequired`.

- [ ] **Step 13: Acrescentar o token `mfa_pending` a `src/utils/jwt.ts`**

Trocar a função `verifyToken` (hoje linhas 25-32) por:

```ts
export const verifyToken = (token: string): AuthPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload & { mfa?: boolean };

    // O token intermediário de 2FA é assinado com ESTE MESMO segredo. Sem esta
    // recusa ele passaria por token de acesso normal e o admin entraria em
    // /admin sem nunca digitar o código — o 2FA viraria decoração.
    if (decoded.mfa === true) return null;

    return decoded;
  } catch (error) {
    return null;
  }
};
```

E acrescentar no fim do arquivo:

```ts
/** Tempo de vida do token intermediário de 2FA, em segundos. */
export const MFA_PENDING_TTL_SECONDS = 300;

/**
 * Token que prova só a primeira metade do login (senha conferida).
 *
 * Vale 5 minutos e serve exclusivamente para POST /auth/2fa/verify: a claim
 * `mfa: true` faz o verifyToken recusá-lo em qualquer rota autenticada.
 */
export const generateMfaPendingToken = (payload: AuthPayload): string => {
  return jwt.sign(
    { ...payload, mfa: true },
    config.jwt.secret as string,
    {
      expiresIn: MFA_PENDING_TTL_SECONDS,
    } as any
  );
};

/** Desfaz o generateMfaPendingToken. Recusa qualquer token que não tenha a claim mfa. */
export const verifyMfaPendingToken = (token: string): AuthPayload | null => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthPayload & { mfa?: boolean };

    if (decoded.mfa !== true) return null;

    return {
      id: decoded.id,
      email: decoded.email,
      type: decoded.type,
      companyId: decoded.companyId,
    };
  } catch (error) {
    return null;
  }
};
```

- [ ] **Step 14: Acrescentar os tipos do MFA a `src/types/index.ts`**

Logo depois da interface `AuthResponse` (que termina na linha 52):

```ts
/**
 * Resposta do login quando falta o segundo fator.
 *
 * O `mfaToken` NÃO autentica nada: serve só para POST /auth/2fa/verify.
 */
export interface MfaPendingResponse {
  mfaRequired: true;
  mfaToken: string;
  /** Segundos até o mfaToken expirar. */
  expiresIn: number;
}

/** O login devolve tokens completos OU um pedido de segundo fator. */
export type LoginResult = AuthResponse | MfaPendingResponse;

export function isMfaPending(result: LoginResult): result is MfaPendingResponse {
  return (result as MfaPendingResponse).mfaRequired === true;
}
```

- [ ] **Step 15: Criar `src/validators/twoFactorSchemas.ts`**

```ts
import { z } from 'zod';

/** Código TOTP: sempre 6 dígitos. */
const totpCode = z
  .string('Informe o código de 6 dígitos')
  .trim()
  .regex(/^\d{6}$/, 'O código precisa ter 6 dígitos');

export const TotpEnableBodySchema = z.object({
  code: totpCode,
});

export const MfaVerifyBodySchema = z.object({
  mfaToken: z.string().min(1, 'mfaToken é obrigatório'),
  code: totpCode,
});

export type TotpEnableInput = z.infer<typeof TotpEnableBodySchema>;
export type MfaVerifyInput = z.infer<typeof MfaVerifyBodySchema>;
```

- [ ] **Step 16: Ligar o 2FA ao login em `src/services/authService.ts`**

Trocar os imports das linhas 3 e 11 por:

```ts
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateMfaPendingToken,
  verifyMfaPendingToken,
  MFA_PENDING_TTL_SECONDS,
} from '../utils/jwt';
```

```ts
import {
  AuthResponse,
  RegisterPayload,
  LoginPayload,
  AuthPayload,
  LoginResult,
  UserType,
} from '../types';
```

E acrescentar, depois do import de `logger` (linha 12):

```ts
import { TotpService } from './totpService';
```

Trocar o método `login` inteiro (hoje linhas 170-225) por:

```ts
  /**
   * Login com e-mail e senha.
   *
   * Devolve LoginResult, e não AuthResponse: um ADMIN com 2FA ativo recebe um
   * pedido de segundo fator em vez dos tokens.
   */
  static async login(payload: LoginPayload): Promise<LoginResult> {
    const { email, password } = payload;

    const user = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password');
    }

    const userType = tokenTypeFor(user.type);
    const authPayload: AuthPayload = {
      id: user.id,
      email: user.email,
      type: userType,
      companyId: user.company_id,
    };

    // A senha valeu só a primeira metade do login. O resto acontece em
    // POST /auth/2fa/verify — e last_login_at só é gravado quando o login
    // termina de verdade, senão o campo mentiria sobre tentativas incompletas.
    if (userType === UserType.ADMIN && user.totp_enabled) {
      logger.info(`Login de ${email} aguardando segundo fator`);
      return {
        mfaRequired: true,
        mfaToken: generateMfaPendingToken(authPayload),
        expiresIn: MFA_PENDING_TTL_SECONDS,
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    logger.info(`User logged in: ${email}`);

    return AuthService.issueTokens(authPayload);
  }

  /** Segunda metade do login do admin com 2FA: valida o código e emite os tokens. */
  static async verifyMfa(mfaToken: string, code: string): Promise<AuthResponse> {
    const pending = verifyMfaPendingToken(mfaToken);
    if (!pending) {
      throw new AuthenticationError('Token de verificação inválido ou expirado');
    }

    const isCodeValid = await TotpService.verifyForUser(pending.id, code);
    if (!isCodeValid) {
      throw new AuthenticationError('Código de verificação inválido');
    }

    await prisma.user.update({
      where: { id: pending.id },
      data: { last_login_at: new Date() },
    });

    logger.info(`Segundo fator confirmado: ${pending.email}`);

    return AuthService.issueTokens(pending);
  }

  /** Monta o par de tokens + o bloco `user` da resposta. */
  private static issueTokens(authPayload: AuthPayload): AuthResponse {
    return {
      token: generateToken(authPayload),
      refreshToken: generateRefreshToken(authPayload),
      user: {
        id: authPayload.id,
        email: authPayload.email,
        type: authPayload.type,
        companyId: authPayload.companyId,
      },
    };
  }
```

- [ ] **Step 17: Acrescentar os endpoints de enrollment em `src/routes/admin.ts`**

Acrescentar aos imports do topo:

```ts
import { TotpService } from '../services/totpService';
import { TotpEnableBodySchema, TotpEnableInput } from '../validators/twoFactorSchemas';
```

E acrescentar, imediatamente antes de `export default router;`:

```ts
/**
 * POST /admin/2fa/setup — gera o segredo TOTP e devolve o QR.
 *
 * NÃO ativa o 2FA: se ativasse, um admin que fechasse a tela antes de escanear
 * ficaria trancado para fora da própria conta.
 */
router.post(
  '/2fa/setup',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await TotpService.setup(req.user!.id);
    res.status(201).json({
      message: 'Escaneie o QR no seu app autenticador e confirme o primeiro código',
      data: result,
    });
  })
);

/** POST /admin/2fa/enable — confirma o primeiro código e liga o 2FA. */
router.post(
  '/2fa/enable',
  validateRequest({ body: TotpEnableBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.body as TotpEnableInput;
    const result = await TotpService.enable(req.user!.id, code);
    res.status(200).json({ message: '2FA ativado nesta conta', data: result });
  })
);
```

- [ ] **Step 18: Acrescentar `POST /auth/2fa/verify` em `src/routes/auth.ts`**

Trocar o import da linha 3 por:

```ts
import { asyncHandler, verifyJWT, validateRequest } from '../middleware';
```

Acrescentar aos imports do topo:

```ts
import { isMfaPending } from '../types';
import { MfaVerifyBodySchema, MfaVerifyInput } from '../validators/twoFactorSchemas';
```

Trocar o handler `POST /login` (hoje linhas 95-106) por:

```ts
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const data = LoginSchema.parse(req.body);
    const result = await AuthService.login(data);

    if (isMfaPending(result)) {
      res.status(200).json({
        message: 'Informe o código do seu app autenticador',
        data: result,
      });
      return;
    }

    res.status(200).json({
      message: 'Login successful',
      data: result,
    });
  })
);
```

E acrescentar, logo depois do handler de `/login`:

```ts
/**
 * POST /auth/2fa/verify
 * Segunda metade do login do admin com 2FA ativo. Recebe o mfaToken emitido
 * pelo /auth/login e o código do app; devolve os tokens normais.
 */
router.post(
  '/2fa/verify',
  validateRequest({ body: MfaVerifyBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { mfaToken, code } = req.body as MfaVerifyInput;
    const result = await AuthService.verifyMfa(mfaToken, code);

    res.status(200).json({
      message: 'Login successful',
      data: result,
    });
  })
);
```

- [ ] **Step 19: Rodar o teste ponta a ponta e ver passar**

```bash
npm test -- src/routes/__tests__/auth2fa.test.ts
```

Esperado: PASS — 13 testes verdes.

- [ ] **Step 20: Rodar a suíte inteira e o check**

```bash
cd /Users/Matheus/Desktop/FastLead
npm test && npm run check
```

Esperado: tudo verde. Se o `tsc` reclamar em algum consumidor de `AuthService.login`, é o efeito esperado da mudança de `Promise<AuthResponse>` para `Promise<LoginResult>` — o único chamador no backend é `src/routes/auth.ts`, que o Step 18 já ajustou com o `isMfaPending`.

- [ ] **Step 21: Commit**

```bash
cd /Users/Matheus/Desktop/FastLead
git add package.json package-lock.json .env.test prisma/schema.prisma prisma/migrations/20260807a_totp/ src/utils/jwt.ts src/types/index.ts src/services/totpService.ts src/services/authService.ts src/validators/twoFactorSchemas.ts src/routes/admin.ts src/routes/auth.ts src/__tests__/helpers/db.ts src/services/__tests__/totpService.test.ts src/routes/__tests__/auth2fa.test.ts
git commit -m "feat(security): 2FA TOTP para contas ADMIN/MASTER

Enrollment em POST /admin/2fa/setup + /admin/2fa/enable; o login de admin com
2FA ativo passa a devolver um mfaToken de 5 minutos, trocado por tokens reais
em POST /auth/2fa/verify.

O segredo TOTP e guardado cifrado (AES-256-GCM). O verifyToken passou a recusar
a claim mfa:true — sem isso o token intermediario abriria /admin sozinho.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Documentação OpenAPI servida em `/docs`

**Files:**
- Create: `src/config/swagger.ts`
- Test: `src/config/__tests__/swagger.test.ts`
- Modify: `src/app.ts` (import novo + montagem de `/docs` e `/docs.json`)
- Modify: `package.json` (dependências)
- Modify: `src/routes/health.ts`, `src/routes/auth.ts`, `src/routes/driver.ts`, `src/routes/advertiser.ts`, `src/routes/admin.ts`, `src/routes/campaigns.ts`, `src/routes/tablet.ts`, `src/routes/public.ts`, `src/routes/payments.ts` — **só anotações JSDoc**, nenhuma mudança de comportamento

**Interfaces:**
- Consumes:
  - Task 1: `npm test` e `.env.test`.
  - Task 4: `src/app.ts` já reescrito com `globalLimiter`/`authLimiter`. **Rodar depois da Task 4.**
  - Task 5: as rotas de `advertiser.ts`, `driver.ts` e `admin.ts` já com `validateRequest`.
  - Task 7: `POST /auth/2fa/verify`, `POST /admin/2fa/setup` e `POST /admin/2fa/enable` já existem — esta task documenta os três. **Rodar depois da Task 7.**
- Produces:
  - `src/config/swagger.ts` exporta `swaggerSpec` (nomeado) e `default`.
  - `GET /docs` → Swagger UI. `GET /docs.json` → o documento OpenAPI cru.
  - Componentes reutilizáveis que **toda** anotação de rota referencia: `securitySchemes.bearerAuth`, `securitySchemes.deviceToken`, `schemas.ErrorResponse`, e as responses `Unauthorized`, `Forbidden`, `NotFound`, `ValidationFailed`, `TooManyRequests`.
- **Escopo:** o único arquivo do módulo financeiro tocado é `src/routes/payments.ts`, e só com comentário — nenhuma linha de código muda ali (ver Global Constraints).
- **`apis` usa caminhos relativos ao `process.cwd()`, não `__dirname`.** Motivo: o Vitest transforma os arquivos para ESM e `__dirname` não é garantido; `process.cwd()` é a raiz do projeto nos três cenários (`npm run dev`, `npm start`, `npm test`). Os dois globs (`./src/routes/*.ts` e `./dist/routes/*.js`) ficam declarados: em produção o `dist` existe, e o `tsc` preserva comentários (o `tsconfig.json` não define `removeComments`), então os JSDoc chegam lá. Se os dois casarem, o swagger-jsdoc mescla conteúdo idêntico — inofensivo.
- **`/docs` fica FORA do `globalLimiter`:** a Swagger UI baixa vários assets numa única visita e queimaria boa parte das 100 requisições por janela do teto geral. É documentação estática.

- [ ] **Step 1: Instalar as dependências**

```bash
cd /Users/Matheus/Desktop/FastLead
npm install swagger-jsdoc@^6.3.0 swagger-ui-express@^5.0.1
npm install --save-dev @types/swagger-jsdoc@^6.0.4 @types/swagger-ui-express@^4.1.8
```

- [ ] **Step 2: Escrever o teste que ainda falha**

`src/config/__tests__/swagger.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { swaggerSpec } from '../swagger';
import app from '../../app';

interface OpenApiDoc {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, { summary?: string; tags?: string[]; security?: unknown[] }>>;
  components: { securitySchemes: Record<string, unknown>; responses: Record<string, unknown> };
}

const spec = swaggerSpec as unknown as OpenApiDoc;

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];

function operations(): Array<[string, string, { summary?: string; tags?: string[] }]> {
  const found: Array<[string, string, { summary?: string; tags?: string[] }]> = [];
  for (const [route, byMethod] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(byMethod)) {
      if (HTTP_METHODS.includes(method)) found.push([route, method, operation]);
    }
  }
  return found;
}

describe('documento OpenAPI', () => {
  it('declara OpenAPI 3 e identifica a API', () => {
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.info.title).toBe('FastLead API');
  });

  it('publica os esquemas de segurança das duas formas de autenticação', () => {
    expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
    // O tablet do carro não usa JWT: ele manda X-Device-Token.
    expect(spec.components.securitySchemes.deviceToken).toBeDefined();
  });

  it('publica as responses reutilizáveis', () => {
    expect(Object.keys(spec.components.responses)).toEqual(
      expect.arrayContaining([
        'Unauthorized',
        'Forbidden',
        'NotFound',
        'ValidationFailed',
        'TooManyRequests',
      ])
    );
  });
});

describe('cobertura das rotas', () => {
  it('documenta ao menos uma rota de cada arquivo de rotas', () => {
    const rotas = Object.keys(spec.paths);

    expect(rotas).toContain('/health');
    expect(rotas).toContain('/auth/login');
    expect(rotas).toContain('/auth/2fa/verify');
    expect(rotas).toContain('/driver/me');
    expect(rotas).toContain('/advertiser/campaigns');
    expect(rotas).toContain('/admin/overview');
    expect(rotas).toContain('/admin/2fa/setup');
    expect(rotas).toContain('/campaigns/{campaignId}');
    expect(rotas).toContain('/tablet/playlist');
    expect(rotas).toContain('/r/{campaignId}');
    expect(rotas).toContain('/meta/segmentation');
    expect(rotas).toContain('/payments/motorista/{motoristaId}/earnings');
  });

  it('documenta os 9 arquivos de rota, com 40+ operações', () => {
    expect(operations().length).toBeGreaterThanOrEqual(40);
  });

  it('toda operação tem summary — é o que aparece na lista da Swagger UI', () => {
    const semSummary = operations()
      .filter(([, , op]) => !op.summary)
      .map(([rota, metodo]) => `${metodo.toUpperCase()} ${rota}`);

    expect(semSummary).toEqual([]);
  });

  it('toda operação tem tag — sem tag a Swagger UI joga tudo em "default"', () => {
    const semTag = operations()
      .filter(([, , op]) => !op.tags || op.tags.length === 0)
      .map(([rota, metodo]) => `${metodo.toUpperCase()} ${rota}`);

    expect(semTag).toEqual([]);
  });

  it('as rotas autenticadas declaram o esquema de segurança', () => {
    const rotasProtegidas = ['/driver/me', '/advertiser/me', '/admin/overview'];

    for (const rota of rotasProtegidas) {
      expect(spec.paths[rota].get.security).toEqual([{ bearerAuth: [] }]);
    }
  });
});

describe('endpoints de documentação', () => {
  it('serve o documento cru em /docs.json', async () => {
    const res = await request(app).get('/docs.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.paths['/health']).toBeDefined();
  });

  it('serve a Swagger UI em /docs', async () => {
    const res = await request(app).get('/docs/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
  });
});
```

- [ ] **Step 3: Rodar o teste e ver falhar**

```bash
cd /Users/Matheus/Desktop/FastLead
npm test -- src/config/__tests__/swagger.test.ts
```

Esperado: FAIL com `Failed to resolve import "../swagger"`.

- [ ] **Step 4: Criar `src/config/swagger.ts`**

```ts
import swaggerJsdoc from 'swagger-jsdoc';
import config from './config';

/**
 * Documento OpenAPI montado a partir dos blocos `@openapi` que vivem nos
 * próprios arquivos de rota.
 *
 * Anotação junto do código, e não um YAML separado, porque um YAML à parte
 * envelhece calado: ninguém percebe que ele divergiu até um integrador
 * reclamar.
 */

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'FastLead API',
      version: '0.1.0',
      description:
        'API da FastLead — publicidade em tablets dentro de carros de aplicativo.\n\n' +
        'O funil é impressão → scan → lead: o tablet exibe o anúncio, o passageiro ' +
        'escaneia o QR e deixa o contato na landing de captura.\n\n' +
        'Autenticação: JWT Bearer para empresa/motorista/MASTER; o tablet do carro ' +
        'usa o header `X-Device-Token`, emitido no pareamento.',
    },
    servers: [{ url: config.apiUrl, description: 'Ambiente atual' }],
    tags: [
      { name: 'Health', description: 'Verificação de vida da API' },
      { name: 'Auth', description: 'Cadastro, login, refresh e segundo fator' },
      { name: 'Motorista', description: 'Área logada do motorista' },
      { name: 'Anunciante', description: 'Área logada da empresa anunciante' },
      { name: 'MASTER', description: 'Visão global de todas as empresas (ADMIN)' },
      { name: 'Campanhas', description: 'Leitura de campanha por qualquer usuário logado' },
      { name: 'Tablet', description: 'Aparelho dentro do carro (X-Device-Token)' },
      { name: 'Público', description: 'Rotas sem autenticação: QR, captura de lead e catálogos' },
      { name: 'Pagamentos', description: 'Ganhos do motorista' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        deviceToken: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Device-Token',
          description: 'Token emitido em POST /tablet/pair. O tablet nunca guarda JWT de usuário.',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'ValidationError' },
            message: { type: 'string', example: 'body.pricePerLead: precisa ser maior que zero' },
            statusCode: { type: 'integer', example: 400 },
            timestamp: { type: 'string', format: 'date-time' },
          },
          required: ['error', 'message', 'statusCode', 'timestamp'],
        },
      },
      responses: {
        Unauthorized: {
          description: 'Token ausente, inválido, expirado ou ainda pendente de 2FA',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        Forbidden: {
          description: 'Autenticado, mas o tipo de conta não alcança esta rota',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        NotFound: {
          description: 'Recurso inexistente ou fora do tenant de quem pediu',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        ValidationFailed: {
          description: 'Corpo, parâmetro de rota ou filtro de query inválido',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
        TooManyRequests: {
          description: 'Rate limit estourado',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        },
      },
    },
  },
  /**
   * Caminhos relativos ao process.cwd() (a raiz do projeto) e não __dirname:
   * o Vitest transforma os módulos para ESM, onde __dirname não é garantido.
   * O glob de dist existe para produção — o tsc preserva comentários, então os
   * JSDoc sobrevivem ao build. Se os dois casarem, o conteúdo é idêntico.
   */
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
```

- [ ] **Step 5: Montar `/docs` e `/docs.json` em `src/app.ts`**

Acrescentar aos imports do topo (depois do `import cors from 'cors';`):

```ts
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
```

E acrescentar, logo depois de `app.use('/health', healthRoutes);` e **antes** de `app.use(globalLimiter);`:

```ts
/**
 * Documentação da API. Fica antes do rate limit de propósito: a Swagger UI
 * baixa vários assets numa visita só e queimaria boa parte do teto geral.
 * É documentação estática, não superfície de ataque.
 */
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/docs.json', (_req: Request, res: Response) => {
  res.json(swaggerSpec);
});
```

- [ ] **Step 6: Anotar `src/routes/health.ts`**

Trocar o bloco de comentário acima de `router.get('/', ...)` por:

```ts
/**
 * @openapi
 * /health:
 *   get:
 *     summary: Verifica se a API está de pé
 *     description: Fora do rate limit — health check de plataforma não pode ser barrado.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API no ar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 timestamp: { type: string, format: date-time }
 *                 uptime: { type: number, example: 1234.5 }
 *                 environment: { type: string, example: production }
 */
```

- [ ] **Step 7: Anotar `src/routes/auth.ts`**

Trocar cada bloco de comentário acima do handler correspondente por:

```ts
/**
 * @openapi
 * /auth/verify-cnpj/{cnpj}:
 *   get:
 *     summary: Confere o dígito verificador do CNPJ e consulta a Receita
 *     description: Sempre responde 200 — falha de rede não bloqueia o cadastro, o checksum já garante o formato.
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: cnpj
 *         required: true
 *         schema: { type: string, example: '11222333000181' }
 *     responses:
 *       200:
 *         description: Resultado da verificação
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid: { type: boolean }
 *                     found: { type: boolean, nullable: true }
 *                     active: { type: boolean }
 *                     razaoSocial: { type: string, nullable: true }
 *                     situacao: { type: string, nullable: true }
 */
```

```ts
/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Cadastra empresa anunciante ou motorista
 *     description: Cada cadastro sem companyId cria a própria Company (um tenant novo).
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, type, fullName, phone]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, description: '8+ caracteres, maiúscula, minúscula, número e especial' }
 *               type: { type: string, enum: [driver, advertiser, admin] }
 *               fullName: { type: string }
 *               phone: { type: string, example: '(11) 98765-4321' }
 *               companyName: { type: string, description: 'Obrigatório quando type=advertiser' }
 *               cnpj: { type: string, description: 'Obrigatório quando type=advertiser' }
 *               role: { type: string, description: 'Obrigatório quando type=advertiser' }
 *               cpf: { type: string, description: 'Obrigatório quando type=driver' }
 *               city: { type: string, description: 'Obrigatório quando type=driver' }
 *               vehicle: { type: string, description: 'Obrigatório quando type=driver' }
 *               plate: { type: string, description: 'Obrigatório quando type=driver' }
 *     responses:
 *       201:
 *         description: Conta criada, com os tokens já emitidos
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       409:
 *         description: E-mail ou placa já cadastrados
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
```

```ts
/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Faz login com e-mail e senha
 *     description: >
 *       Se a conta for ADMIN com 2FA ativo, a resposta traz `mfaRequired: true` e um
 *       `mfaToken` de 5 minutos em vez dos tokens — troque-o em POST /auth/2fa/verify.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login concluído, ou segundo fator pendente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   oneOf:
 *                     - type: object
 *                       properties:
 *                         token: { type: string }
 *                         refreshToken: { type: string }
 *                         user:
 *                           type: object
 *                           properties:
 *                             id: { type: string }
 *                             email: { type: string }
 *                             type: { type: string, enum: [driver, advertiser, admin] }
 *                             companyId: { type: string }
 *                     - type: object
 *                       properties:
 *                         mfaRequired: { type: boolean, example: true }
 *                         mfaToken: { type: string }
 *                         expiresIn: { type: integer, example: 300 }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       429: { $ref: '#/components/responses/TooManyRequests' }
 */
```

```ts
/**
 * @openapi
 * /auth/2fa/verify:
 *   post:
 *     summary: Conclui o login do admin com o código do app autenticador
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mfaToken, code]
 *             properties:
 *               mfaToken: { type: string, description: 'Devolvido por POST /auth/login' }
 *               code: { type: string, example: '123456' }
 *     responses:
 *       200: { description: 'Tokens emitidos' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
```

```ts
/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Troca o refresh token por um par novo de tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: 'Tokens renovados' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
```

```ts
/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Invalida o refresh token informado
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: 'Sessão encerrada' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
```

```ts
/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Devolve o usuário do token, com o perfil da persona
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 'Usuário autenticado' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
```

- [ ] **Step 8: Anotar `src/routes/driver.ts`**

Acrescentar acima de cada handler:

```ts
/**
 * @openapi
 * /driver/opportunities:
 *   get:
 *     summary: Lista campanhas abertas que o motorista pode aceitar
 *     tags: [Motorista]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 'Oportunidades compatíveis com a segmentação do motorista' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *
 * /driver/opportunities/{campaignId}/accept:
 *   post:
 *     summary: Motorista aceita rodar a campanha no tablet dele
 *     tags: [Motorista]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201: { description: 'Vínculo criado' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /driver/campaigns/{campaignId}:
 *   delete:
 *     summary: Motorista tira o anúncio do tablet dele
 *     description: Vale até para campanha empurrada pelo MASTER — a tela é dele.
 *     tags: [Motorista]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 'Anúncio removido' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /driver/me:
 *   get:
 *     summary: Perfil do motorista logado
 *     tags: [Motorista]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 'Perfil do motorista' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /driver/earnings:
 *   get:
 *     summary: Resumo de ganhos (total, mês, 7 dias, hoje e por campanha)
 *     tags: [Motorista]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 'Ganhos do motorista' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *
 * /driver/campaigns:
 *   get:
 *     summary: Campanhas ativas no tablet do motorista
 *     tags: [Motorista]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 'Campanhas ativas com scans e leads' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *
 * /driver/payments:
 *   get:
 *     summary: Histórico de pagamentos do motorista
 *     tags: [Motorista]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200: { description: 'Pagamentos paginados' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *
 * /driver/profile:
 *   patch:
 *     summary: Atualiza o perfil do motorista
 *     description: Aceita atualização parcial; a região é sempre derivada da UF, nunca informada.
 *     tags: [Motorista]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               phone: { type: string, example: '(11) 98765-4321' }
 *               vehicleInfo: { type: string, maxLength: 500 }
 *               licensePlate: { type: string, example: 'ABC1D23' }
 *               status: { type: string, enum: [ATIVO, INATIVO, SUSPENSO] }
 *               bio: { type: string, maxLength: 500 }
 *               city: { type: string }
 *               state: { type: string, example: SP, minLength: 2, maxLength: 2 }
 *               rideApps:
 *                 type: array
 *                 items: { type: string, enum: [UBER, NOVENOVE, INDRIVE, CABIFY, BLABLACAR, TAXI, OUTRO] }
 *               rideCategories:
 *                 type: array
 *                 items: { type: string, example: UBER_X }
 *               avatarUrl: { type: string, description: 'data-URL redimensionada no cliente' }
 *     responses:
 *       200: { description: 'Perfil atualizado' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *
 * /driver/devices/pair-code:
 *   post:
 *     summary: Gera o código de 6 dígitos para parear o tablet do carro
 *     tags: [Motorista]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label: { type: string, description: 'Apelido do aparelho' }
 *     responses:
 *       201: { description: 'Código gerado' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *
 * /driver/sessions:
 *   get:
 *     summary: Histórico de jornadas encerradas
 *     tags: [Motorista]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 30, maximum: 90 }
 *     responses:
 *       200: { description: 'Jornadas encerradas' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *
 * /driver/devices:
 *   get:
 *     summary: Tablets vinculados a este motorista
 *     tags: [Motorista]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 'Aparelhos pareados' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *
 * /driver/devices/{deviceId}:
 *   delete:
 *     summary: Desvincula um tablet (venda do carro, roubo)
 *     tags: [Motorista]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 'Aparelho desvinculado' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /driver/status:
 *   patch:
 *     summary: Atualiza o status do motorista
 *     tags: [Motorista]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [ATIVO, INATIVO, SUSPENSO] }
 *     responses:
 *       200: { description: 'Status atualizado' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
```

**Onde colar:** este bloco único documenta o arquivo inteiro. Ponha-o logo abaixo de `const router = Router();` em `src/routes/driver.ts` — o swagger-jsdoc não exige que a anotação encoste no handler, e um bloco só evita 13 comentários espalhados que saem de sincronia um a um.

- [ ] **Step 9: Anotar `src/routes/advertiser.ts`**

Colar logo abaixo de `const router = Router();`:

```ts
/**
 * @openapi
 * /advertiser/motoristas:
 *   get:
 *     summary: Lista motoristas disponíveis, com nota, para a empresa escolher
 *     tags: [Anunciante]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *     responses:
 *       200: { description: 'Motoristas disponíveis' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *
 * /advertiser/me:
 *   get:
 *     summary: Perfil da empresa anunciante logada
 *     tags: [Anunciante]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: 'Perfil do anunciante' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /advertiser/campaigns:
 *   get:
 *     summary: Campanhas da empresa
 *     tags: [Anunciante]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED] }
 *     responses:
 *       200: { description: 'Campanhas da empresa' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *   post:
 *     summary: Cria uma campanha
 *     description: Lista de segmentação vazia significa "qualquer motorista". O QR é gerado no momento da criação.
 *     tags: [Anunciante]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, numVehicles, durationDays, pricePerLead]
 *             properties:
 *               title: { type: string, minLength: 3, maxLength: 255 }
 *               description: { type: string }
 *               imageUrl: { type: string, description: 'Banner em data-URL' }
 *               numVehicles: { type: integer, minimum: 1 }
 *               durationDays: { type: integer, minimum: 1, maximum: 365 }
 *               pricePerLead: { type: number, minimum: 0.01 }
 *               publish: { type: boolean, description: 'false salva como DRAFT' }
 *               destinationUrl: { type: string, format: uri }
 *               ctaText: { type: string, maxLength: 160 }
 *               showQr: { type: boolean, default: true }
 *               qrPosition: { type: string, enum: [TOP_LEFT, TOP_CENTER, TOP_RIGHT, MIDDLE_LEFT, CENTER, MIDDLE_RIGHT, BOTTOM_LEFT, BOTTOM_CENTER, BOTTOM_RIGHT] }
 *               showText: { type: boolean, default: true }
 *               targetRegions:
 *                 type: array
 *                 items: { type: string, enum: [NORTE, NORDESTE, CENTRO_OESTE, SUDESTE, SUL] }
 *               targetStates:
 *                 type: array
 *                 items: { type: string, example: SP }
 *               targetCities:
 *                 type: array
 *                 items: { type: string }
 *               targetRideApps:
 *                 type: array
 *                 items: { type: string, enum: [UBER, NOVENOVE, INDRIVE, CABIFY, BLABLACAR, TAXI, OUTRO] }
 *               targetCategories:
 *                 type: array
 *                 items: { type: string, example: UBER_X }
 *     responses:
 *       201: { description: 'Campanha criada, já com QR gerado' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *
 * /advertiser/campaigns/{campaignId}:
 *   get:
 *     summary: Detalhes de uma campanha da empresa
 *     tags: [Anunciante]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 'Detalhes da campanha' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   patch:
 *     summary: Atualiza título, status ou valor por lead
 *     tags: [Anunciante]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, minLength: 3, maxLength: 255 }
 *               status: { type: string, enum: [DRAFT, ACTIVE, PAUSED, COMPLETED, CANCELLED] }
 *               pricePerLead: { type: number, minimum: 0.01 }
 *     responses:
 *       200: { description: 'Campanha atualizada' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     summary: Empresa apaga a campanha que criou
 *     tags: [Anunciante]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 'Campanha apagada' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /advertiser/campaigns/{campaignId}/leads:
 *   get:
 *     summary: Leads capturados pela campanha
 *     tags: [Anunciante]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, CONVERTED, INVALID] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200: { description: 'Leads paginados' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
```

- [ ] **Step 10: Anotar `src/routes/admin.ts`**

Colar logo abaixo do `router.use(verifyJWT, authorize(UserType.ADMIN), validateRequest({ query: MasterQuerySchema }));`:

```ts
/**
 * Todos os filtros abaixo são os mesmos do MasterQuerySchema; por isso estão
 * repetidos em cada rota que os aceita — o OpenAPI 3.0 não tem herança de
 * parâmetros entre operações.
 *
 * @openapi
 * /admin/overview:
 *   get:
 *     summary: Números do topo e funil impressão→scan→lead de todas as empresas
 *     tags: [MASTER]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: region, schema: { type: string, enum: [NORTE, NORDESTE, CENTRO_OESTE, SUDESTE, SUL] } }
 *       - { in: query, name: state, schema: { type: string, example: SP } }
 *       - { in: query, name: city, schema: { type: string } }
 *       - { in: query, name: rideApp, schema: { type: string, enum: [UBER, NOVENOVE, INDRIVE, CABIFY, BLABLACAR, TAXI, OUTRO] } }
 *       - { in: query, name: rideCategory, schema: { type: string, example: UBER_X } }
 *       - { in: query, name: from, schema: { type: string, format: date } }
 *       - { in: query, name: to, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: 'Agregados globais' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *
 * /admin/timeseries:
 *   get:
 *     summary: Série diária de impressões, scans e leads
 *     tags: [MASTER]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: days, schema: { type: integer, default: 14, minimum: 1, maximum: 90 } }
 *       - { in: query, name: region, schema: { type: string, enum: [NORTE, NORDESTE, CENTRO_OESTE, SUDESTE, SUL] } }
 *       - { in: query, name: state, schema: { type: string, example: SP } }
 *       - { in: query, name: city, schema: { type: string } }
 *     responses:
 *       200: { description: 'Série temporal' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *
 * /admin/drivers:
 *   get:
 *     summary: Motoristas de todas as empresas, com filtros
 *     tags: [MASTER]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 50, maximum: 200 } }
 *       - { in: query, name: region, schema: { type: string, enum: [NORTE, NORDESTE, CENTRO_OESTE, SUDESTE, SUL] } }
 *       - { in: query, name: state, schema: { type: string, example: SP } }
 *       - { in: query, name: city, schema: { type: string } }
 *       - { in: query, name: rideApp, schema: { type: string, enum: [UBER, NOVENOVE, INDRIVE, CABIFY, BLABLACAR, TAXI, OUTRO] } }
 *       - { in: query, name: rideCategory, schema: { type: string, example: UBER_X } }
 *     responses:
 *       200: { description: 'Motoristas paginados' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *
 * /admin/companies:
 *   get:
 *     summary: Empresas anunciantes e o que cada uma gerou
 *     tags: [MASTER]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 50, maximum: 200 } }
 *     responses:
 *       200: { description: 'Empresas paginadas' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *
 * /admin/campaigns:
 *   get:
 *     summary: Campanhas de todas as empresas
 *     tags: [MASTER]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 50, maximum: 200 } }
 *     responses:
 *       200: { description: 'Campanhas paginadas' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *
 * /admin/campaigns/{campaignId}/distribute:
 *   post:
 *     summary: Distribui a campanha automaticamente entre motoristas compatíveis
 *     description: Só entra quem tem tablet pareado; para ao fechar as vagas.
 *     tags: [MASTER]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 'Resultado da distribuição' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /admin/assignments:
 *   post:
 *     summary: Curadoria híbrida — força, bloqueia ou devolve ao marketplace
 *     tags: [MASTER]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [campaignId, motoristaId, action]
 *             properties:
 *               campaignId: { type: string }
 *               motoristaId: { type: string }
 *               action:
 *                 type: string
 *                 enum: [FORCE, BLOCK, CLEAR]
 *                 description: 'FORCE põe no tablet; BLOCK tira só dele; CLEAR devolve a decisão ao marketplace'
 *     responses:
 *       200: { description: 'Decisão registrada' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *
 * /admin/2fa/setup:
 *   post:
 *     summary: Gera o segredo TOTP e devolve o QR (não ativa ainda)
 *     tags: [MASTER]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201:
 *         description: Segredo e QR gerados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     secret: { type: string, description: 'Base32, para digitação manual' }
 *                     otpauthUrl: { type: string }
 *                     qrCodeDataUrl: { type: string, description: 'PNG em data-URL' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 *
 * /admin/2fa/enable:
 *   post:
 *     summary: Confirma o primeiro código e liga o 2FA na conta
 *     tags: [MASTER]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: '123456' }
 *     responses:
 *       200: { description: '2FA ativado' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       403: { $ref: '#/components/responses/Forbidden' }
 */
```

- [ ] **Step 11: Anotar `src/routes/campaigns.ts`, `src/routes/tablet.ts`, `src/routes/public.ts` e `src/routes/payments.ts`**

Em `src/routes/campaigns.ts`, colar abaixo de `const router = Router();`:

```ts
/**
 * @openapi
 * /campaigns/{campaignId}:
 *   get:
 *     summary: Detalhes da campanha, para qualquer usuário logado do tenant
 *     tags: [Campanhas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 'Detalhes da campanha' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *   delete:
 *     summary: Apaga a campanha (soft delete)
 *     tags: [Campanhas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 'Campanha apagada' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /campaigns/{campaignId}/image:
 *   get:
 *     summary: Redireciona para o banner da campanha
 *     tags: [Campanhas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       302: { description: 'Redirect para a URL da imagem' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /campaigns/{campaignId}/qr:
 *   get:
 *     summary: QR code da campanha
 *     tags: [Campanhas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 'QR em data-URL' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
```

Em `src/routes/tablet.ts`, colar abaixo de `const router = Router();`:

```ts
/**
 * @openapi
 * /tablet/pair:
 *   post:
 *     summary: Tablet troca o código de 6 dígitos pelo device token
 *     description: O tablet nunca guarda credencial do motorista — ele mora dentro do carro.
 *     tags: [Tablet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, example: '123456' }
 *     responses:
 *       200: { description: 'Aparelho pareado, com o device token' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *
 * /tablet/playlist:
 *   get:
 *     summary: O que roda na tela deste carro agora
 *     tags: [Tablet]
 *     security: [{ deviceToken: [] }]
 *     responses:
 *       200: { description: 'Playlist de anúncios' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *
 * /tablet/impressions:
 *   post:
 *     summary: Tablet reporta o que já exibiu
 *     tags: [Tablet]
 *     security: [{ deviceToken: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [campaignId]
 *                   properties:
 *                     campaignId: { type: string }
 *                     durationMs: { type: integer }
 *     responses:
 *       200: { description: 'Impressões registradas' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *
 * /tablet/session/end:
 *   post:
 *     summary: Motorista encerra a jornada na tela do tablet
 *     description: Fecha a jornada, devolve o resumo e solta o aparelho — ele volta a pedir código de pareamento.
 *     tags: [Tablet]
 *     security: [{ deviceToken: [] }]
 *     responses:
 *       200: { description: 'Resumo da jornada encerrada' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 */
```

Em `src/routes/public.ts`, colar abaixo de `const router = Router();`:

```ts
/**
 * @openapi
 * /r/{campaignId}:
 *   get:
 *     summary: Destino de TODO QR code — registra o scan e redireciona
 *     description: >
 *       Nunca falha para o passageiro: se o tracking quebrar, o redirect ainda acontece.
 *       Perder um número é melhor que perder a pessoa.
 *     tags: [Público]
 *     parameters:
 *       - { in: path, name: campaignId, required: true, schema: { type: string } }
 *       - { in: query, name: m, schema: { type: string }, description: 'ID do motorista' }
 *       - { in: query, name: d, schema: { type: string }, description: 'ID do aparelho' }
 *     responses:
 *       302: { description: 'Redirect para o destino da campanha ou para a landing de captura' }
 *
 * /r/{scanEventId}/lead:
 *   post:
 *     summary: Passageiro deixa o contato na landing — fecha o funil
 *     tags: [Público]
 *     parameters:
 *       - in: path
 *         name: scanEventId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: 'Ao menos um entre email e phone é obrigatório'
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               phone: { type: string }
 *     responses:
 *       200: { description: 'Lead registrado' }
 *       400: { $ref: '#/components/responses/ValidationFailed' }
 *
 * /meta/campaign/{id}:
 *   get:
 *     summary: Dados públicos da campanha, para a landing de captura
 *     description: Fica sob /meta e não sob /r para não colidir com o redirect do QR.
 *     tags: [Público]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 'Título, descrição, banner, CTA e nome do anunciante' }
 *       404: { $ref: '#/components/responses/NotFound' }
 *
 * /meta/segmentation:
 *   get:
 *     summary: Catálogo de regiões, UFs, apps e modalidades
 *     description: Fonte única para os filtros do frontend não divergirem dos enums do banco.
 *     tags: [Público]
 *     responses:
 *       200: { description: 'Catálogo de segmentação' }
 */
```

Em `src/routes/payments.ts`, trocar o bloco de comentário acima do handler por:

```ts
/**
 * @openapi
 * /payments/motorista/{motoristaId}/earnings:
 *   get:
 *     summary: Resumo de ganhos de um motorista
 *     tags: [Pagamentos]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: motoristaId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: 'Ganhos calculados' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *       404: { $ref: '#/components/responses/NotFound' }
 */
```

- [ ] **Step 12: Rodar o teste e ver passar**

```bash
npm test -- src/config/__tests__/swagger.test.ts
```

Esperado: PASS — 10 testes verdes. Se `toda operação tem summary` falhar, a própria mensagem lista qual rota ficou sem — corrija a anotação daquela rota e rode de novo.

- [ ] **Step 13: Conferir a UI de verdade no navegador**

```bash
cd /Users/Matheus/Desktop/FastLead
docker compose up -d postgres
npm run dev
```

Abrir `http://localhost:3000/docs`. Esperado: as 9 tags na lateral (Health, Auth, Motorista, Anunciante, MASTER, Campanhas, Tablet, Público, Pagamentos), o botão **Authorize** oferecendo `bearerAuth` e `deviceToken`, e `GET /health` respondendo pelo "Try it out". Encerrar com `Ctrl+C`.

- [ ] **Step 14: Rodar a suíte inteira e o check**

```bash
npm test && npm run check
```

Esperado: tudo verde.

- [ ] **Step 15: Commit**

```bash
cd /Users/Matheus/Desktop/FastLead
git add package.json package-lock.json src/config/swagger.ts src/config/__tests__/swagger.test.ts src/app.ts src/routes/
git commit -m "docs(api): documentacao OpenAPI servida em /docs

Anotacoes @openapi nos proprios arquivos de rota — um YAML separado envelhece
calado. Um teste falha se alguma operacao ficar sem summary ou sem tag.

/docs fica antes do rate limit global: a Swagger UI baixa varios assets numa
visita so e queimaria o teto da janela.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Limpeza de código morto no frontend

**Files:**
- Delete: `frontend/src/pages/Dashboard.jsx`
- Delete: `frontend/src/pages/Login.jsx`
- Delete: `frontend/src/pages/Register.jsx`
- Test: `frontend/src/__tests__/deadCode.test.js`
- **Não modificar:** `frontend/src/App.jsx`, `frontend/src/components/Sidebar.jsx`, `frontend/src/components/Navbar.jsx`, `frontend/src/components/index.js`, `frontend/src/components/KPICard.jsx` — ver as evidências abaixo

**Interfaces:**
- Consumes: Task 2 — `npm test` dentro de `frontend/`, `frontend/vite.config.js` com o bloco `test` e a convenção `frontend/src/**/__tests__/*.test.{js,jsx,ts,tsx}`. **Rodar depois da Task 2.**
- Produces: nenhuma API nova. O único artefato duradouro é `frontend/src/__tests__/deadCode.test.js`, que trava a regressão: se alguém recriar `Dashboard.jsx`/`Login.jsx`/`Register.jsx` sem rota, o teste acusa.

**Evidências levantadas no código real (as duas decisões desta task):**

- **Descoberta D5 — os três arquivos são órfãos, confirmado.** `grep -rn "Dashboard\|/Login\|/Register" frontend/src --include="*.jsx" --include="*.js" --include="*.ts" | grep -i "import\|lazy("` devolve **só** `LoginEmpresa`, `LoginMotorista` e o `LoginForm` de `components/auth/` — nenhum deles é um dos três arquivos. No `App.jsx`, `/dashboard` aponta para `HomeRedirect` (linha 109), `/login` para `<Navigate to="/entrar">` (linha 107) e `/register` para `<Navigate to="/cadastro">` (linha 108). Nenhum `lazy(() => import('./pages/Dashboard'))` existe.

- **Descoberta D6 — as 4 rotas legadas estão VIVAS. Esta task não as remove.** `frontend/src/components/Sidebar.jsx` monta um menu que navega para `/dashboard`, `/create-campaign`, `/campaigns`, `/leads` e `/profile`; e `CreateCampaign.jsx`, `Campaigns.jsx`, `Leads.jsx` e `Profile.jsx` renderizam esse mesmo `Sidebar` (`grep -rn "import.*Sidebar" frontend/src` lista os cinco arquivos: os quatro mais o `Dashboard.jsx` que vai embora). É um subsistema fechado, coerente e alcançável por URL. Removê-lo é **decisão de produto** ("a empresa ainda usa essas telas?"), não limpeza de código morto — e o spec deixava a escolha em aberto ("manter se ainda servem alguma tela viva"). Com `Dashboard.jsx` deletado, `Sidebar` e `Navbar` continuam importados pelas 4 telas restantes.

- **`components/KPICard.jsx` fica.** Depois de deletar `Dashboard.jsx` ele passa a ser o único componente do barril sem nenhuma página consumindo. Mesmo assim **não** o apagamos: `frontend/src/components/index.js` é a superfície pública daquela pasta e exporta `KPICard` junto com `Button`, `Card`, `Input` e `Alert`; um componente de UI genérico exportado pelo barril é biblioteca, não tela morta. As três páginas apagadas são outra coisa: telas inteiras que nenhuma rota alcança.

- [ ] **Step 1: Registrar as evidências antes de apagar**

```bash
cd /Users/Matheus/Desktop/FastLead/frontend
grep -rn "pages/Dashboard\|pages/Login'\|pages/Register'" src
grep -rn "import.*Sidebar" src
```

Esperado: o primeiro comando **não devolve nada** (nenhum import dos três). O segundo lista exatamente 5 arquivos: `pages/Campaigns.jsx`, `pages/CreateCampaign.jsx`, `pages/Dashboard.jsx`, `pages/Leads.jsx`, `pages/Profile.jsx`.

Se o primeiro comando devolver alguma linha, **pare**: o arquivo em questão não é órfão e a premissa da task caiu.

- [ ] **Step 2: Escrever o teste que ainda falha**

`frontend/src/__tests__/deadCode.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Trava a limpeza feita nesta task.
 *
 * Sem este teste, alguém recria Dashboard.jsx daqui a três meses, nenhuma rota
 * aponta para ele, e o arquivo volta a apodrecer em silêncio.
 */

// process.cwd() e não __dirname: o frontend é "type": "module" e o Vitest
// transforma os testes para ESM, onde __dirname não existe. O Vitest roda com
// o cwd em frontend/.
const src = resolve(process.cwd(), 'src');
const appJsx = readFileSync(resolve(src, 'App.jsx'), 'utf8');

describe('páginas órfãs foram removidas', () => {
  it.each(['pages/Dashboard.jsx', 'pages/Login.jsx', 'pages/Register.jsx'])(
    '%s não existe mais',
    (arquivo) => {
      expect(existsSync(resolve(src, arquivo))).toBe(false);
    }
  );

  it('o App.jsx não importa nenhuma delas', () => {
    expect(appJsx).not.toMatch(/import\(['"]\.\/pages\/(Dashboard|Login|Register)['"]\)/);
  });
});

describe('as rotas de compatibilidade continuam de pé', () => {
  it('/login e /register redirecionam para o fluxo AccessHub', () => {
    expect(appJsx).toContain('path="/login"');
    expect(appJsx).toContain('path="/register"');
    expect(appJsx).toContain('path="/dashboard"');
  });
});

describe('o subsistema legado do anunciante continua vivo', () => {
  it.each(['/create-campaign', '/campaigns', '/leads', '/profile'])(
    'a rota %s continua registrada — é alcançável pelo Sidebar',
    (rota) => {
      expect(appJsx).toContain(`path="${rota}"`);
    }
  );

  it.each([
    'pages/CreateCampaign.jsx',
    'pages/Campaigns.jsx',
    'pages/Leads.jsx',
    'pages/Profile.jsx',
    'components/Sidebar.jsx',
    'components/Navbar.jsx',
  ])('%s continua existindo', (arquivo) => {
    expect(existsSync(resolve(src, arquivo))).toBe(true);
  });

  it('o Sidebar continua navegando para as 4 rotas legadas', () => {
    const sidebar = readFileSync(resolve(src, 'components/Sidebar.jsx'), 'utf8');

    for (const rota of ['/create-campaign', '/campaigns', '/leads', '/profile']) {
      expect(sidebar).toContain(rota);
    }
  });
});
```

- [ ] **Step 3: Rodar o teste e ver falhar**

```bash
cd /Users/Matheus/Desktop/FastLead/frontend
npm test -- src/__tests__/deadCode.test.js
```

Esperado: FAIL — os três primeiros casos quebram porque `Dashboard.jsx`, `Login.jsx` e `Register.jsx` ainda existem. Todo o resto passa.

- [ ] **Step 4: Apagar os três arquivos órfãos**

```bash
cd /Users/Matheus/Desktop/FastLead
git rm frontend/src/pages/Dashboard.jsx frontend/src/pages/Login.jsx frontend/src/pages/Register.jsx
```

- [ ] **Step 5: Rodar o teste e ver passar**

```bash
cd /Users/Matheus/Desktop/FastLead/frontend
npm test -- src/__tests__/deadCode.test.js
```

Esperado: PASS — 16 casos verdes.

- [ ] **Step 6: Rodar a suíte inteira do frontend**

```bash
cd /Users/Matheus/Desktop/FastLead/frontend
npm test
```

Esperado: PASS — os 3 arquivos da Task 2 mais este, todos verdes. Nenhum deles importava as páginas apagadas.

- [ ] **Step 7: Provar que o build continua de pé**

```bash
cd /Users/Matheus/Desktop/FastLead/frontend
npm run lint && npm run build
```

Esperado: `oxlint` sem erros e build do Vite concluído. É a verificação que importa aqui: se alguma dessas páginas ainda fosse alcançável, o Vite quebraria com `Could not resolve "./pages/Dashboard"` ao montar o grafo de módulos.

- [ ] **Step 8: Conferir as rotas legadas no navegador**

```bash
cd /Users/Matheus/Desktop/FastLead/frontend
npm run dev
```

Abrir `http://localhost:5173/campaigns` logado como empresa. Esperado: a tela renderiza com o `Sidebar` à esquerda e os itens do menu levam a `/create-campaign`, `/leads` e `/profile` sem erro no console. É a confirmação visual da descoberta D6. Encerrar com `Ctrl+C`.

- [ ] **Step 9: Commit**

```bash
cd /Users/Matheus/Desktop/FastLead
git add frontend/src/__tests__/deadCode.test.js
git commit -m "chore(frontend): remover Dashboard, Login e Register orfaos

Nenhum arquivo os importava; /dashboard aponta para HomeRedirect e /login e
/register sao redirects para o fluxo AccessHub.

As rotas legadas /create-campaign, /campaigns, /leads e /profile FICAM: sao
alcancaveis pelo Sidebar, que elas mesmas renderizam. Tira-las e decisao de
produto, nao limpeza de codigo morto.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Ambiente de desenvolvimento completo no Docker

**Files:**
- Create: `Dockerfile.dev`
- Create: `frontend/Dockerfile.dev`
- Create: `.dockerignore`
- Create: `frontend/.dockerignore`
- Modify: `docker-compose.yml` (dois serviços novos, depois de `postgres` e `pgadmin`)

**Interfaces:**
- Consumes:
  - Task 3: com o fail-fast, os segredos de JWT precisam ter 32+ caracteres. Os valores do `docker-compose.yml` já respeitam isso — sem eles, o backend só imprimiria o aviso de desenvolvimento, mas explicitá-los deixa o ambiente do compose igual ao de produção.
  - Task 6: `ENCRYPTION_KEY`. Também explicitada no compose para o container não subir imprimindo aviso.
  - Task 4: `RATE_LIMIT_*`. Sem elas o container usa os defaults do `config.ts`, que já servem para desenvolvimento.
- Produces:
  - `docker compose up` passa a subir **postgres + pgadmin + backend + frontend**. Hoje sobe só banco e pgadmin.
  - `backend` em `http://localhost:3000`, `frontend` em `http://localhost:5173`, ambos com hot-reload por bind mount.
- **Nada disso toca o deploy.** O Railway continua construindo com Nixpacks a partir do `package.json`; os `Dockerfile.dev` existem só para `docker compose` local (Global Constraints).
- **`node_modules` em volume anônimo, em cada serviço.** O bind mount `.:/app` cobriria o `/app/node_modules` do container com o do host — que no macOS/ARM tem binários nativos (`bcryptjs`, os engines do Prisma, o esbuild do Vite) incompatíveis com o `node:22-alpine` do container. O volume anônimo montado por cima devolve o `node_modules` que o `npm ci` da imagem instalou.
- **Watch por polling.** Em bind mount de macOS/Windows os eventos `inotify` não atravessam para o container; sem `CHOKIDAR_USEPOLLING=true` o nodemon e o Vite simplesmente não veem os arquivos mudarem. O chokidar é o watcher dos dois.

- [ ] **Step 1: Criar o `.dockerignore` do backend**

`.dockerignore` (raiz):

```
# O node_modules do host tem binário nativo do SO do host (bcryptjs, engines do
# Prisma). Copiar para dentro da imagem quebra o container e engorda o build.
node_modules
dist
.git
.env
.env.local
coverage
logs
*.log
frontend
docs
.claude
```

- [ ] **Step 2: Criar o `Dockerfile.dev` do backend**

`Dockerfile.dev` (raiz):

```dockerfile
# Imagem de DESENVOLVIMENTO. Produção continua sendo Nixpacks no Railway —
# este arquivo existe só para `docker compose up` na máquina de quem desenvolve.
FROM node:22-alpine

WORKDIR /app

# O openssl é exigido pelos query engines do Prisma; a imagem alpine não o traz.
RUN apk add --no-cache openssl

# package.json + lock ANTES do resto do código: enquanto as dependências não
# mudarem, o Docker reaproveita a camada do npm ci a cada rebuild.
COPY package.json package-lock.json ./

# O schema precisa existir antes do npm ci: o script postinstall roda
# `prisma generate` e falha sem ele.
COPY prisma ./prisma

RUN npm ci

# O código real chega por bind mount do docker-compose. Copiar aqui garante que
# a imagem funcione sozinha (`docker run`) mesmo sem o mount.
COPY . .

EXPOSE 3000

# nodemon, definido em package.json:"dev". O nodemon.json já observa src/**.
CMD ["npm", "run", "dev"]
```

- [ ] **Step 3: Criar o `.dockerignore` e o `Dockerfile.dev` do frontend**

`frontend/.dockerignore`:

```
node_modules
dist
.git
.env
.env.local
coverage
*.log
```

`frontend/Dockerfile.dev`:

```dockerfile
# Imagem de DESENVOLVIMENTO do frontend. O build de produção sai do Nixpacks.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

EXPOSE 5173

# --host 0.0.0.0 é obrigatório: por padrão o Vite escuta só em 127.0.0.1 dentro
# do container, e a porta publicada no host responderia connection refused.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

- [ ] **Step 4: Acrescentar os serviços ao `docker-compose.yml`**

Inserir os dois blocos abaixo entre o serviço `pgadmin` e a chave `volumes:` do fim do arquivo (mesma indentação dos serviços existentes):

```yaml
  backend:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: fastlead_backend
    environment:
      NODE_ENV: development
      PORT: 3000
      API_URL: http://localhost:3000
      APP_BASE_URL: http://localhost:5173
      QR_BASE_URL: http://localhost:3000
      # host "postgres": dentro da rede do compose o serviço é resolvido pelo nome.
      DATABASE_URL: postgresql://fastlead_user:fastlead_password_dev@postgres:5432/fastlead_db
      # 32+ caracteres: com o fail-fast do config.ts, segredo curto derruba o boot.
      JWT_SECRET: fastlead-docker-dev-jwt-secret-nao-use-em-producao
      JWT_REFRESH_SECRET: fastlead-docker-dev-refresh-secret-nao-use-em-producao
      JWT_EXPIRES_IN: 24h
      JWT_REFRESH_EXPIRES_IN: 7d
      # 64 hex = 32 bytes. Chave de desenvolvimento, publicada de propósito.
      ENCRYPTION_KEY: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
      CORS_ORIGIN: http://localhost:5173,http://localhost:3000
      LOG_LEVEL: debug
      # Em bind mount de macOS/Windows os eventos inotify não chegam ao
      # container; sem polling o nodemon nunca percebe uma edição.
      CHOKIDAR_USEPOLLING: 'true'
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      # Volume anônimo por cima do bind mount: preserva o node_modules que o
      # npm ci da imagem instalou (linux/musl) em vez do do host.
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - fastlead_network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: fastlead_frontend
    environment:
      # O NAVEGADOR roda no host, então ele fala com a porta publicada do
      # backend — e não com o hostname interno "backend".
      VITE_API_URL: http://localhost:3000
      CHOKIDAR_USEPOLLING: 'true'
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    depends_on:
      - backend
    networks:
      - fastlead_network
```

- [ ] **Step 5: Construir as imagens**

```bash
cd /Users/Matheus/Desktop/FastLead
docker compose build backend frontend
```

Esperado: as duas imagens são construídas sem erro. O `npm ci` do backend termina com o `prisma generate` do `postinstall`.

- [ ] **Step 6: Subir o ambiente completo**

```bash
cd /Users/Matheus/Desktop/FastLead
docker compose up -d
docker compose ps
```

Esperado: `fastlead_postgres`, `fastlead_pgadmin`, `fastlead_backend` e `fastlead_frontend` todos em `running`.

- [ ] **Step 7: Aplicar o schema no banco do compose**

```bash
docker compose exec backend npx prisma db push --skip-generate
```

Esperado: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 8: Provar que os dois serviços respondem**

```bash
curl -s http://localhost:3000/health
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173
```

Esperado: o primeiro devolve `{"status":"ok",...}`; o segundo imprime `200`.

- [ ] **Step 9: Provar que o hot-reload funciona dos dois lados**

```bash
cd /Users/Matheus/Desktop/FastLead
docker compose logs -f backend
```

Em outro terminal, salve qualquer alteração trivial em `src/app.ts` (por exemplo, um espaço a mais numa linha em branco) e desfaça em seguida. Esperado nos logs: `[nodemon] restarting due to changes...` seguido de `[nodemon] starting`.

Depois, com `http://localhost:5173` aberto no navegador, edite `frontend/src/pages/Landing.jsx` de forma visível e salve. Esperado: a página atualiza sozinha, sem F5. Desfaça a edição.

Se o restart não acontecer, o `CHOKIDAR_USEPOLLING` não pegou — confira com `docker compose exec backend printenv CHOKIDAR_USEPOLLING`.

- [ ] **Step 10: Derrubar o ambiente e conferir que o fluxo antigo continua valendo**

```bash
cd /Users/Matheus/Desktop/FastLead
docker compose down
docker compose up -d postgres
npm test
```

Esperado: os testes continuam passando contra o `fastlead_test` do Postgres local — quem prefere rodar backend e frontend fora do Docker não perde nada com esta task.

- [ ] **Step 11: Commit**

```bash
cd /Users/Matheus/Desktop/FastLead
git add Dockerfile.dev .dockerignore frontend/Dockerfile.dev frontend/.dockerignore docker-compose.yml
git commit -m "chore(docker): ambiente de dev completo no compose

docker compose up passa a subir backend e frontend alem do banco, com bind
mount e hot-reload. node_modules fica em volume anonimo: o do host tem binario
nativo do SO do host e quebraria dentro do alpine.

Producao segue no Nixpacks do Railway — estes Dockerfile sao .dev.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Remover os documentos de auditoria desatualizados

**Files:**
- Delete: `.claude/AUDITORIA_PROJETO.md`
- Delete: `.claude/PROXIMOS_PASSOS.md`
- **Não tocar:** `.claude/MODELO_FINANCEIRO.md`, `.claude/launch.json`, `.claude/settings.local.json`, `.claude/skills/`

**Interfaces:**
- Consumes: nada. Esta task é independente de todas as outras e pode rodar a qualquer momento.
- Produces: nada que outra task consuma.
- **Evidência de que nada referencia os dois arquivos** (levantada no repositório real): `grep -rln "AUDITORIA\|PROXIMOS_PASSOS" . --exclude-dir=node_modules --exclude-dir=.git` devolve exatamente três caminhos — `./.claude/AUDITORIA_PROJETO.md` (a própria menção ao nome dentro dele), `./docs/superpowers/specs/2026-08-07-hardening-completude-design.md` (o spec, que pede a remoção) e `./docs/superpowers/plans/2026-08-07-hardening-completude.md` (este plano). Nenhum código, script, README, CI ou configuração aponta para eles.
- **`.claude/MODELO_FINANCEIRO.md` fica.** É do módulo financeiro, que está fora de escopo deste ciclo (Global Constraints) e não foi apontado como desatualizado pelo spec.
- **Os dois arquivos estão versionados** (`git ls-files .claude/` lista `AUDITORIA_PROJETO.md`, `MODELO_FINANCEIRO.md`, `PROXIMOS_PASSOS.md` e `launch.json`), então a remoção é `git rm` e entra no histórico — nada se perde de verdade.

- [ ] **Step 1: Confirmar que nada aponta para os dois arquivos**

```bash
cd /Users/Matheus/Desktop/FastLead
grep -rln "AUDITORIA_PROJETO\|PROXIMOS_PASSOS" . --exclude-dir=node_modules --exclude-dir=.git
```

Esperado: exatamente três caminhos — `./.claude/AUDITORIA_PROJETO.md`, `./docs/superpowers/specs/2026-08-07-hardening-completude-design.md` e `./docs/superpowers/plans/2026-08-07-hardening-completude.md`.

Se aparecer qualquer outro arquivo (um README, um script, um workflow), **pare** e leia a referência antes de apagar: alguém passou a depender do documento desde o levantamento.

- [ ] **Step 2: Confirmar que os dois estão versionados**

```bash
cd /Users/Matheus/Desktop/FastLead
git ls-files .claude/
```

Esperado: a lista inclui `.claude/AUDITORIA_PROJETO.md` e `.claude/PROXIMOS_PASSOS.md`. Estando versionados, o conteúdo continua recuperável pelo histórico (`git show HEAD~1:.claude/AUDITORIA_PROJETO.md`) depois da remoção.

- [ ] **Step 3: Remover os dois arquivos**

```bash
cd /Users/Matheus/Desktop/FastLead
git rm .claude/AUDITORIA_PROJETO.md .claude/PROXIMOS_PASSOS.md
```

- [ ] **Step 4: Conferir que só eles saíram**

```bash
cd /Users/Matheus/Desktop/FastLead
git status --short
ls .claude/
```

Esperado: o `git status` mostra apenas as duas remoções (`D .claude/AUDITORIA_PROJETO.md` e `D .claude/PROXIMOS_PASSOS.md`), e o `ls` ainda lista `MODELO_FINANCEIRO.md`, `launch.json`, `settings.local.json` e `skills/`.

- [ ] **Step 5: Provar que o projeto continua íntegro**

```bash
cd /Users/Matheus/Desktop/FastLead
npm run check && npm run build
```

Esperado: tudo verde. São documentos em markdown fora de `src/` — nada compila a partir deles, e este passo existe só para descartar a hipótese de algum script ler o arquivo.

- [ ] **Step 6: Commit**

```bash
cd /Users/Matheus/Desktop/FastLead
git commit -m "docs: remover AUDITORIA_PROJETO.md e PROXIMOS_PASSOS.md

Documentos do levantamento de 2026-07-29, ja superados pela auditoria de
2026-08-07. Nenhum codigo, script ou workflow os referenciava; manter uma copia
em markdown no repo so cria uma segunda fonte de verdade para divergir.

O conteudo continua no historico do git.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 13: Testes do funil impressão→scan→lead e smoke das rotas de persona

**Files:**
- Create: `src/__tests__/helpers/funnel.ts`
- Test: `src/services/__tests__/trackingService.test.ts`
- Test: `src/routes/__tests__/publicFunnel.test.ts`
- Test: `src/routes/__tests__/personas.test.ts`
- **Nenhum arquivo de produção muda.**

**Interfaces:**
- Consumes:
  - Task 1: `npm test`, o `vitest.config.ts` com `fileParallelism: false` (os três arquivos escrevem no mesmo `fastlead_test`), o `.env.test` com `APP_BASE_URL=http://localhost:5173` — é o `config.appBaseUrl` com que os testes de redirect comparam — e `src/__tests__/helpers/auth.ts` (`driverAuthHeader`).
  - Task 7: `src/__tests__/helpers/db.ts` (`createTestUser`, `deleteTestUser`, `TestUser`) e o `.env.test` já com `RATE_LIMIT_AUTH_WINDOW_MS`/`RATE_LIMIT_AUTH_MAX_REQUESTS` altos. `personas.test.ts` faz três `POST /auth/register` e três `POST /auth/login` em sequência e bateria no teto de 10 por 5 minutos do `authLimiter` da Task 4 sem esse aumento. **Rodar depois da Task 7.**
  - Task 5: as rotas de `driver`/`advertiser` já com Zod. Os smoke tests desta task só usam `GET`, e a Task 5 valida `PATCH`/`POST` — a ordem entre 5 e 13 é indiferente.
- Produces:
  - `src/__tests__/helpers/funnel.ts`: `createFunnelFixture(): Promise<FunnelFixture>`, `createCampaign(fixture: FunnelFixture, destinationUrl: string | null): Promise<string>`, `destroyFunnelFixture(fixture: FunnelFixture): Promise<void>` e a interface `FunnelFixture`.
  - Nada mais que outra task consuma, exceto a **Task 14 (CI)**, que passa a executar estes três arquivos no pipeline. **Rodar esta task antes da Task 14.**
- **Esta task não altera nenhum arquivo de produção**, e por isso o ciclo teste-falha→implementa→teste-passa **não se aplica**: `TrackingService`, `src/routes/public.ts`, `src/routes/driver.ts`, `src/routes/advertiser.ts` e `AuthService.register/login/refreshToken` já existem, já funcionam e nenhuma task deste ciclo os toca. No lugar do vermelho-antes entra um **passo de falsificação** (Steps 5 e 8): quebrar de propósito uma linha do código de produção, ver o teste ficar vermelho, desfazer e ver ficar verde. É o que prova que o teste exercita mesmo o caminho, em vez de passar por acidente.
- **Decisão sobre `AuthService.register`** (que o Self-review apontava como descoberto), **descoberta D12 aplicada aqui**: **entra aqui**, coberto por `POST /auth/register` em `personas.test.ts`. Motivo verificado no código: `register` é o **único** caminho que cria `MotoristProfile` e `AnuncianteProfile` (`src/services/authService.ts:106-133`), e sem esses perfis `GET /driver/me` e `GET /advertiser/me` respondem **404** — `MotoristaService.getProfile` e `AnuncianteService.getProfile` lançam `NotFoundError` quando não acham o perfil. O `createTestUser` da Task 7 cria só `Company` + `User`. Reproduzir a criação de perfil dentro de um helper seria testar a cópia, não o código. `refreshToken` entra junto no mesmo arquivo porque sai de graça do `refreshToken` que o cadastro já devolve — com isso o item "cobertura de `authService` (login/register/refresh)" do spec fica inteiro.
- **Descoberta D11 aplicada aqui:** `src/routes/auth.ts:81` chama `RegisterSchema.parse(req.body)` direto no handler, e `src/middleware/errorHandler.ts` não tem ramo para `ZodError` — corpo inválido em `POST /auth/register` responde **500**, não 400. `personas.test.ts` por isso **não** afirma 400 para cadastro inválido: afirmar 500 congelaria um defeito, e consertá-lo é mudança de produção fora do escopo desta task.
- **Limpeza explícita, sem confiar só no cascade:** no `prisma/schema.prisma`, `Campaign.anunciante` e `Lead.motorista` são `onDelete: Restrict`. Apagar a `Company` — que é tudo o que o `deleteTestUser` da Task 7 faz — dispara o cascade em `Campaign`, `AnuncianteProfile`, `ScanEvent` e `Lead` de uma vez, e a ordem entre as ações referenciais não é garantida: o `Restrict` pode disparar no meio e derrubar a limpeza. O `destroyFunnelFixture` apaga `Lead` → `ScanEvent` → `CampaignMotorista` → `Campaign` na mão **antes** de chamar `deleteTestUser`.

- [ ] **Step 1: Criar a fixture do funil**

`src/__tests__/helpers/funnel.ts`:

```ts
import { randomUUID } from 'crypto';
import prisma from '../../lib/prisma';
import { createTestUser, deleteTestUser, TestUser } from './db';

/**
 * O mínimo que o funil precisa para existir no banco: uma empresa anunciante
 * com perfil e campanha, e um motorista com perfil rodando essa campanha.
 *
 * O motorista é obrigatório: `ScanEvent.motorista_id` é NOT NULL no schema, e
 * sem ele o `TrackingService.recordScan` só redireciona sem gravar nada.
 */
export interface FunnelFixture {
  anunciante: TestUser;
  motorista: TestUser;
  anuncianteProfileId: string;
  motoristaProfileId: string;
  /** Campanha SEM destination_url: cai na landing de captura da FastLead. */
  campaignId: string;
  /** Campanha COM destination_url próprio do anunciante. */
  campaignComDestinoId: string;
  /** Toda campanha criada por createCampaign entra aqui, para a limpeza achar. */
  campaignIds: string[];
}

/** Cria uma campanha na empresa do anunciante da fixture. */
export async function createCampaign(
  fixture: FunnelFixture,
  destinationUrl: string | null
): Promise<string> {
  const campaign = await prisma.campaign.create({
    data: {
      company_id: fixture.anunciante.companyId,
      anunciante_id: fixture.anuncianteProfileId,
      created_by_id: fixture.anunciante.id,
      title: 'Campanha de teste do funil',
      // qr_code_data é UNIQUE global: um valor novo por campanha, sempre.
      qr_code_data: `https://fastlead.test/r/${randomUUID()}`,
      destination_url: destinationUrl,
      start_date: new Date(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    select: { id: true },
  });

  fixture.campaignIds.push(campaign.id);
  return campaign.id;
}

export async function createFunnelFixture(): Promise<FunnelFixture> {
  const anunciante = await createTestUser({ type: 'ANUNCIANTE' });
  const motorista = await createTestUser({ type: 'MOTORISTA' });

  const perfilAnunciante = await prisma.anuncianteProfile.create({
    data: {
      user_id: anunciante.id,
      company_id: anunciante.companyId,
      company_name: 'Anunciante de teste',
    },
    select: { id: true },
  });

  const perfilMotorista = await prisma.motoristProfile.create({
    data: {
      user_id: motorista.id,
      company_id: motorista.companyId,
      city: 'São Paulo',
      state: 'SP',
      status: 'ATIVO',
    },
    select: { id: true },
  });

  const fixture: FunnelFixture = {
    anunciante,
    motorista,
    anuncianteProfileId: perfilAnunciante.id,
    motoristaProfileId: perfilMotorista.id,
    campaignId: '',
    campaignComDestinoId: '',
    campaignIds: [],
  };

  fixture.campaignId = await createCampaign(fixture, null);
  fixture.campaignComDestinoId = await createCampaign(
    fixture,
    'https://loja-do-anunciante.exemplo/promo'
  );

  // Vínculo aceito entre campanha e motorista: é onde scans_count e
  // leads_generated caem. Sem ele o TrackingService engole o update no .catch().
  await prisma.campaignMotorista.create({
    data: {
      company_id: fixture.anunciante.companyId,
      campaign_id: fixture.campaignId,
      motorista_id: fixture.motoristaProfileId,
    },
  });

  return fixture;
}

/**
 * Desfaz a fixture na ordem inversa das dependências.
 *
 * Não dá para simplesmente apagar as duas empresas: Campaign.anunciante e
 * Lead.motorista são onDelete: Restrict, e o cascade da Company dispara todas
 * as ações referenciais ao mesmo tempo, sem ordem garantida entre elas.
 */
export async function destroyFunnelFixture(fixture: FunnelFixture): Promise<void> {
  const campanhas = fixture.campaignIds;

  await prisma.lead.deleteMany({ where: { campaign_id: { in: campanhas } } });
  await prisma.scanEvent.deleteMany({ where: { campaign_id: { in: campanhas } } });
  await prisma.campaignMotorista.deleteMany({ where: { campaign_id: { in: campanhas } } });
  await prisma.campaign.deleteMany({ where: { id: { in: campanhas } } });

  await deleteTestUser(fixture.anunciante);
  await deleteTestUser(fixture.motorista);
}
```

- [ ] **Step 2: Escrever o teste do `TrackingService`**

`src/services/__tests__/trackingService.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TrackingService } from '../trackingService';
import prisma from '../../lib/prisma';
import config from '../../config/config';
import {
  createCampaign,
  createFunnelFixture,
  destroyFunnelFixture,
  FunnelFixture,
} from '../../__tests__/helpers/funnel';
import { NotFoundError } from '../../utils/errors';

let funil: FunnelFixture;

beforeAll(async () => {
  funil = await createFunnelFixture();
});

afterAll(async () => {
  await destroyFunnelFixture(funil);
  await prisma.$disconnect();
});

describe('TrackingService.recordScan', () => {
  it('sem motorista atribuível, não grava ScanEvent mas ainda manda o passageiro para a landing', async () => {
    const antes = await prisma.scanEvent.count({ where: { campaign_id: funil.campaignId } });

    const result = await TrackingService.recordScan({
      campaignId: funil.campaignId,
      ip: '203.0.113.10',
      userAgent: 'visitante-sem-motorista',
    });

    // ScanEvent.motorista_id é NOT NULL: sem motorista não há o que gravar,
    // e perder o número é melhor que perder o passageiro.
    expect(result.scanEventId).toBeNull();
    expect(result.redirectTo).toBe(`${config.appBaseUrl}/lp/${funil.campaignId}`);
    expect(await prisma.scanEvent.count({ where: { campaign_id: funil.campaignId } })).toBe(antes);
  });

  it('ignora motorista inexistente em vez de derrubar o scan', async () => {
    const result = await TrackingService.recordScan({
      campaignId: funil.campaignId,
      motoristaId: 'motorista-que-nao-existe',
      ip: '203.0.113.11',
      userAgent: 'visitante-motorista-fantasma',
    });

    expect(result.scanEventId).toBeNull();
    expect(result.redirectTo).toBe(`${config.appBaseUrl}/lp/${funil.campaignId}`);
  });

  it('com motorista, grava o ScanEvent e devolve a landing com ?s=<scanEventId>', async () => {
    const result = await TrackingService.recordScan({
      campaignId: funil.campaignId,
      motoristaId: funil.motoristaProfileId,
      ip: '203.0.113.20',
      userAgent: 'visitante-A',
    });

    expect(result.scanEventId).toBeTruthy();
    expect(result.redirectTo).toBe(
      `${config.appBaseUrl}/lp/${funil.campaignId}?s=${result.scanEventId}`
    );

    const scan = await prisma.scanEvent.findUnique({
      where: { id: result.scanEventId! },
      select: { motorista_id: true, is_unique: true, ip_address: true, user_device: true },
    });
    expect(scan!.motorista_id).toBe(funil.motoristaProfileId);
    expect(scan!.is_unique).toBe(true);
    expect(scan!.ip_address).toBe('203.0.113.20');
    expect(scan!.user_device).toBe('visitante-A');
  });

  it('conta o mesmo visitante duas vezes como um alcance só', async () => {
    const antes = await prisma.campaign.findUnique({
      where: { id: funil.campaignId },
      select: { unique_scans: true },
    });

    const primeiro = await TrackingService.recordScan({
      campaignId: funil.campaignId,
      motoristaId: funil.motoristaProfileId,
      ip: '203.0.113.30',
      userAgent: 'visitante-B',
    });
    const segundo = await TrackingService.recordScan({
      campaignId: funil.campaignId,
      motoristaId: funil.motoristaProfileId,
      ip: '203.0.113.30',
      userAgent: 'visitante-B',
    });

    const scans = await prisma.scanEvent.findMany({
      where: { id: { in: [primeiro.scanEventId!, segundo.scanEventId!] } },
      select: { id: true, is_unique: true },
    });
    const unicoPorId = new Map(scans.map((s) => [s.id, s.is_unique]));
    expect(unicoPorId.get(primeiro.scanEventId!)).toBe(true);
    expect(unicoPorId.get(segundo.scanEventId!)).toBe(false);

    const depois = await prisma.campaign.findUnique({
      where: { id: funil.campaignId },
      select: { unique_scans: true },
    });
    // Dois scans aconteceram; só um deles é alcance novo.
    expect(depois!.unique_scans - antes!.unique_scans).toBe(1);
  });

  it('incrementa o scans_count do vínculo entre campanha e motorista', async () => {
    const antes = await prisma.campaignMotorista.findFirst({
      where: { campaign_id: funil.campaignId, motorista_id: funil.motoristaProfileId },
      select: { scans_count: true },
    });

    await TrackingService.recordScan({
      campaignId: funil.campaignId,
      motoristaId: funil.motoristaProfileId,
      ip: '203.0.113.40',
      userAgent: 'visitante-C',
    });

    const depois = await prisma.campaignMotorista.findFirst({
      where: { campaign_id: funil.campaignId, motorista_id: funil.motoristaProfileId },
      select: { scans_count: true },
    });
    expect(depois!.scans_count - antes!.scans_count).toBe(1);
  });

  it('respeita o destination_url do anunciante em vez da landing da FastLead', async () => {
    const result = await TrackingService.recordScan({
      campaignId: funil.campaignComDestinoId,
      motoristaId: funil.motoristaProfileId,
      ip: '203.0.113.50',
      userAgent: 'visitante-D',
    });

    expect(result.redirectTo).toBe('https://loja-do-anunciante.exemplo/promo');
    expect(result.redirectTo).not.toContain('?s=');
  });

  it('recusa campanha inexistente', async () => {
    await expect(
      TrackingService.recordScan({ campaignId: 'campanha-que-nao-existe' })
    ).rejects.toThrow(NotFoundError);
  });

  it('trata campanha com soft delete como inexistente', async () => {
    const apagada = await createCampaign(funil, null);
    await prisma.campaign.update({ where: { id: apagada }, data: { deleted_at: new Date() } });

    await expect(TrackingService.recordScan({ campaignId: apagada })).rejects.toThrow(NotFoundError);
  });
});

describe('TrackingService.captureLead', () => {
  it('converte o scan em lead e herda dele o contexto do scan', async () => {
    const scan = await TrackingService.recordScan({
      campaignId: funil.campaignId,
      motoristaId: funil.motoristaProfileId,
      ip: '203.0.113.60',
      userAgent: 'visitante-E',
    });

    const result = await TrackingService.captureLead({
      scanEventId: scan.scanEventId!,
      name: 'Passageiro Teste',
      email: 'passageiro@exemplo.com',
      phone: '(11) 98765-4321',
    });

    expect(result.alreadyExisted).toBe(false);

    const lead = await prisma.lead.findUnique({
      where: { id: result.leadId },
      select: {
        campaign_id: true,
        motorista_id: true,
        scan_event_id: true,
        contact_name: true,
        contact_email: true,
        contact_phone: true,
        ip_address: true,
        user_device: true,
      },
    });
    expect(lead!.campaign_id).toBe(funil.campaignId);
    expect(lead!.motorista_id).toBe(funil.motoristaProfileId);
    expect(lead!.scan_event_id).toBe(scan.scanEventId);
    expect(lead!.contact_name).toBe('Passageiro Teste');
    expect(lead!.contact_email).toBe('passageiro@exemplo.com');
    // IP e user-agent vêm do ScanEvent, nunca do corpo do formulário —
    // é o que impede o passageiro de forjar a própria origem.
    expect(lead!.ip_address).toBe('203.0.113.60');
    expect(lead!.user_device).toBe('visitante-E');
  });

  it('não cria um segundo lead para o mesmo scan', async () => {
    const scan = await TrackingService.recordScan({
      campaignId: funil.campaignId,
      motoristaId: funil.motoristaProfileId,
      ip: '203.0.113.61',
      userAgent: 'visitante-F',
    });

    const primeiro = await TrackingService.captureLead({
      scanEventId: scan.scanEventId!,
      email: 'primeiro@exemplo.com',
    });
    const segundo = await TrackingService.captureLead({
      scanEventId: scan.scanEventId!,
      email: 'segundo@exemplo.com',
    });

    expect(segundo).toEqual({ leadId: primeiro.leadId, alreadyExisted: true });
    expect(await prisma.lead.count({ where: { scan_event_id: scan.scanEventId! } })).toBe(1);
  });

  it('incrementa total_leads da campanha e leads_generated do motorista', async () => {
    const campanhaAntes = await prisma.campaign.findUnique({
      where: { id: funil.campaignId },
      select: { total_leads: true },
    });
    const vinculoAntes = await prisma.campaignMotorista.findFirst({
      where: { campaign_id: funil.campaignId, motorista_id: funil.motoristaProfileId },
      select: { leads_generated: true },
    });

    const scan = await TrackingService.recordScan({
      campaignId: funil.campaignId,
      motoristaId: funil.motoristaProfileId,
      ip: '203.0.113.62',
      userAgent: 'visitante-G',
    });
    await TrackingService.captureLead({
      scanEventId: scan.scanEventId!,
      phone: '(11) 91234-5678',
    });

    const campanhaDepois = await prisma.campaign.findUnique({
      where: { id: funil.campaignId },
      select: { total_leads: true },
    });
    const vinculoDepois = await prisma.campaignMotorista.findFirst({
      where: { campaign_id: funil.campaignId, motorista_id: funil.motoristaProfileId },
      select: { leads_generated: true },
    });

    expect(campanhaDepois!.total_leads - campanhaAntes!.total_leads).toBe(1);
    expect(vinculoDepois!.leads_generated - vinculoAntes!.leads_generated).toBe(1);
  });

  it('recusa scan inexistente', async () => {
    await expect(
      TrackingService.captureLead({ scanEventId: 'scan-que-nao-existe', email: 'a@exemplo.com' })
    ).rejects.toThrow(NotFoundError);
  });
});
```

- [ ] **Step 3: Preparar o banco de teste e rodar o teste do serviço**

```bash
cd /Users/Matheus/Desktop/FastLead
docker compose up -d postgres
npm run db:test:setup
npm test -- src/services/__tests__/trackingService.test.ts
```

Esperado: PASS — 12 testes verdes.

Este é o único teste do plano que já nasce verde: ele descreve código que existe e que nenhuma task deste ciclo altera. **Se algum destes 12 falhar, não conserte o teste** — leia o `TrackingService` primeiro, porque é bug de produção no core do funil.

- [ ] **Step 4: Falsificar o teste do serviço, para provar que ele morde**

Em `src/services/trackingService.ts`, trocar a linha `const is_unique = !previous;` (linha 85) por:

```ts
    const is_unique = true;
```

```bash
npm test -- src/services/__tests__/trackingService.test.ts
```

Esperado: FAIL em `conta o mesmo visitante duas vezes como um alcance só` — o segundo scan aparece como `is_unique: true` e `unique_scans` sobe 2 em vez de 1. Se esse teste continuar verde com a linha quebrada, ele não está exercitando nada.

Desfazer:

```bash
git checkout -- src/services/trackingService.ts
npm test -- src/services/__tests__/trackingService.test.ts
```

Esperado: PASS — 12 testes verdes de novo.

- [ ] **Step 5: Escrever o smoke test das rotas públicas do funil**

`src/routes/__tests__/publicFunnel.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';
import config from '../../config/config';
import {
  createFunnelFixture,
  destroyFunnelFixture,
  FunnelFixture,
} from '../../__tests__/helpers/funnel';

let funil: FunnelFixture;

beforeAll(async () => {
  funil = await createFunnelFixture();
});

afterAll(async () => {
  await destroyFunnelFixture(funil);
  await prisma.$disconnect();
});

/**
 * Passa pela rota de verdade e devolve o id do ScanEvent que ela criou.
 *
 * Cada chamada usa um User-Agent próprio de propósito: o visitor_hash é
 * (ip + user-agent + dia + campanha), e o supertest sempre sai do mesmo IP.
 */
async function novoScan(userAgent: string): Promise<string> {
  const res = await request(app)
    .get(`/r/${funil.campaignId}?m=${funil.motoristaProfileId}`)
    .set('User-Agent', userAgent);

  return String(res.headers.location).split('?s=')[1];
}

describe('GET /r/:campaignId — o redirect que todo QR aponta', () => {
  it('sem ?m=, manda para a landing de captura sem ?s=', async () => {
    const res = await request(app)
      .get(`/r/${funil.campaignId}`)
      .set('User-Agent', 'passageiro-sem-motorista');

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${config.appBaseUrl}/lp/${funil.campaignId}`);
  });

  it('com ?m=<motorista>, registra o scan e leva o id no ?s=', async () => {
    const res = await request(app)
      .get(`/r/${funil.campaignId}?m=${funil.motoristaProfileId}`)
      .set('User-Agent', 'passageiro-com-motorista');

    expect(res.status).toBe(302);
    const location = String(res.headers.location);
    expect(location.startsWith(`${config.appBaseUrl}/lp/${funil.campaignId}?s=`)).toBe(true);

    const scan = await prisma.scanEvent.findUnique({
      where: { id: location.split('?s=')[1] },
      select: { motorista_id: true, user_device: true },
    });
    expect(scan!.motorista_id).toBe(funil.motoristaProfileId);
    expect(scan!.user_device).toBe('passageiro-com-motorista');
  });

  it('campanha inexistente não derruba o passageiro: redireciona para a home', async () => {
    const res = await request(app)
      .get('/r/campanha-que-nao-existe')
      .set('User-Agent', 'passageiro-perdido');

    // O handler engole o NotFoundError de propósito. Sem esse catch, quem
    // escaneou veria um 404 em branco — perder o número é melhor que a pessoa.
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(config.appBaseUrl);
  });

  it('o segundo scan do mesmo visitante não conta como alcance novo', async () => {
    const primeiro = await novoScan('passageiro-repetido');
    const segundo = await novoScan('passageiro-repetido');

    const scans = await prisma.scanEvent.findMany({
      where: { id: { in: [primeiro, segundo] } },
      select: { id: true, is_unique: true },
    });

    expect(scans).toHaveLength(2);
    expect(scans.filter((s) => s.is_unique)).toHaveLength(1);
  });
});

describe('POST /r/:scanEventId/lead — o fecho do funil', () => {
  it('recusa corpo sem e-mail e sem telefone', async () => {
    const scanEventId = await novoScan('passageiro-so-nome');

    const res = await request(app).post(`/r/${scanEventId}/lead`).send({ name: 'Só o nome' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Informe ao menos e-mail ou telefone');
    expect(await prisma.lead.count({ where: { scan_event_id: scanEventId } })).toBe(0);
  });

  it('cria o lead quando o passageiro deixa só o telefone', async () => {
    const scanEventId = await novoScan('passageiro-telefone');

    const res = await request(app)
      .post(`/r/${scanEventId}/lead`)
      .send({ name: 'Passageiro', phone: '(11) 98765-4321' });

    expect(res.status).toBe(200);
    expect(res.body.data.alreadyExisted).toBe(false);
    expect(res.body.data.leadId).toBeTruthy();

    const lead = await prisma.lead.findUnique({
      where: { id: res.body.data.leadId },
      select: { contact_phone: true, contact_email: true },
    });
    expect(lead!.contact_phone).toBe('(11) 98765-4321');
    expect(lead!.contact_email).toBeNull();
  });

  it('devolve o mesmo lead quando o formulário é enviado duas vezes', async () => {
    const scanEventId = await novoScan('passageiro-duplo-clique');

    const primeiro = await request(app)
      .post(`/r/${scanEventId}/lead`)
      .send({ email: 'passageiro@exemplo.com' });
    const segundo = await request(app)
      .post(`/r/${scanEventId}/lead`)
      .send({ email: 'passageiro@exemplo.com' });

    expect(segundo.status).toBe(200);
    expect(segundo.body.data.leadId).toBe(primeiro.body.data.leadId);
    expect(segundo.body.data.alreadyExisted).toBe(true);
  });

  it('responde 404 para scan inexistente', async () => {
    const res = await request(app)
      .post('/r/scan-que-nao-existe/lead')
      .send({ email: 'passageiro@exemplo.com' });

    expect(res.status).toBe(404);
    expect(res.body.statusCode).toBe(404);
  });
});
```

- [ ] **Step 6: Rodar o smoke das rotas públicas**

```bash
npm test -- src/routes/__tests__/publicFunnel.test.ts
```

Esperado: PASS — 8 testes verdes.

- [ ] **Step 7: Falsificar o smoke das rotas públicas**

Em `src/routes/public.ts`, comentar o guarda de contato do handler `POST /r/:scanEventId/lead` (linhas 57-60):

```ts
    // if (!email && !phone) {
    //   res.status(400).json({ error: 'Informe ao menos e-mail ou telefone' });
    //   return;
    // }
```

```bash
npm test -- src/routes/__tests__/publicFunnel.test.ts
```

Esperado: FAIL em `recusa corpo sem e-mail e sem telefone` — a rota responde 200 e cria um lead sem nenhuma forma de contato, que é exatamente o lixo que o guarda existe para barrar.

Desfazer:

```bash
git checkout -- src/routes/public.ts
npm test -- src/routes/__tests__/publicFunnel.test.ts
```

Esperado: PASS — 8 testes verdes de novo.

- [ ] **Step 8: Escrever o smoke test das rotas de persona**

`src/routes/__tests__/personas.test.ts`:

```ts
import { describe, it, expect, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../../app';
import prisma from '../../lib/prisma';
import { deleteTestUser, TestUser } from '../../__tests__/helpers/db';
import { driverAuthHeader } from '../../__tests__/helpers/auth';

/** CNPJ e CPF com dígito verificador válido — o RegisterSchema confere os dois. */
const CNPJ_TESTE = '11.222.333/0001-81';
const CPF_TESTE = '529.982.247-25';

/**
 * Placa nova a cada execução: MotoristProfile.license_plate é UNIQUE, e uma
 * execução interrompida no meio deixaria uma placa fixa presa no banco,
 * fazendo todo cadastro seguinte responder 409.
 */
function placaAleatoria(): string {
  const digito = Math.floor(Math.random() * 9) + 1;
  const fim = String(Math.floor(Math.random() * 90) + 10);
  return `TST-${digito}A${fim}`;
}

const emailMotorista = `motorista-${randomUUID()}@fastlead.com.br`;
const emailAnunciante = `anunciante-${randomUUID()}@fastlead.com.br`;
const SENHA = 'Senha@2026';

/**
 * Escada: os `it` numerados dependem do estado deixado pelo anterior. O Vitest
 * roda os testes de um arquivo em ordem e o vitest.config.ts da Task 1 põe
 * fileParallelism: false — mesma convenção do auth2fa.test.ts da Task 7.
 */
let motorista: TestUser | undefined;
let anunciante: TestUser | undefined;
let tokenMotorista: string;
let tokenAnunciante: string;
let refreshMotorista: string;

afterAll(async () => {
  if (motorista) await deleteTestUser(motorista);
  if (anunciante) await deleteTestUser(anunciante);
  await prisma.$disconnect();
});

describe('POST /auth/register — cadastro das duas personas', () => {
  it('1. cadastra motorista e já cria o MotoristProfile', async () => {
    const res = await request(app).post('/auth/register').send({
      email: emailMotorista,
      password: SENHA,
      type: 'driver',
      fullName: 'Motorista de Teste',
      phone: '(11) 98765-4321',
      cpf: CPF_TESTE,
      city: 'São Paulo',
      vehicle: 'Toyota Corolla 2020',
      plate: placaAleatoria(),
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.type).toBe('driver');
    expect(res.body.data.token).toBeTruthy();

    motorista = {
      id: res.body.data.user.id,
      email: res.body.data.user.email,
      password: SENHA,
      companyId: res.body.data.user.companyId,
    };
    tokenMotorista = res.body.data.token;
    refreshMotorista = res.body.data.refreshToken;

    // O perfil é o que separa um User de um motorista de verdade: sem ele,
    // GET /driver/me responde 404.
    const perfil = await prisma.motoristProfile.findUnique({
      where: { user_id: motorista.id },
      select: { city: true, vehicle_info: true, status: true },
    });
    expect(perfil!.city).toBe('São Paulo');
    expect(perfil!.vehicle_info).toBe('Toyota Corolla 2020');
    expect(perfil!.status).toBe('INATIVO');
  });

  it('2. cadastra anunciante e já cria o AnuncianteProfile', async () => {
    // Company.document_number é UNIQUE e o CNPJ do teste é fixo: uma execução
    // anterior interrompida deixaria a empresa para trás e daria 409 aqui.
    await prisma.company.deleteMany({ where: { document_number: '11222333000181' } });

    const res = await request(app).post('/auth/register').send({
      email: emailAnunciante,
      password: SENHA,
      type: 'advertiser',
      fullName: 'Responsável de Teste',
      phone: '(11) 3456-7890',
      companyName: 'Empresa Anunciante Teste LTDA',
      cnpj: CNPJ_TESTE,
      role: 'Diretor de Marketing',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.user.type).toBe('advertiser');

    anunciante = {
      id: res.body.data.user.id,
      email: res.body.data.user.email,
      password: SENHA,
      companyId: res.body.data.user.companyId,
    };
    tokenAnunciante = res.body.data.token;

    const perfil = await prisma.anuncianteProfile.findUnique({
      where: { user_id: anunciante.id },
      select: { company_name: true, document_number: true, contact_person: true },
    });
    expect(perfil!.company_name).toBe('Empresa Anunciante Teste LTDA');
    // O CNPJ é gravado só com os dígitos.
    expect(perfil!.document_number).toBe('11222333000181');
    expect(perfil!.contact_person).toBe('Responsável de Teste');
  });

  it('3. recusa e-mail já cadastrado com 409', async () => {
    const res = await request(app).post('/auth/register').send({
      email: emailMotorista,
      password: SENHA,
      type: 'driver',
      fullName: 'Motorista Repetido',
      phone: '(11) 98765-4321',
      cpf: CPF_TESTE,
      city: 'São Paulo',
      vehicle: 'Honda Civic 2021',
      plate: placaAleatoria(),
    });

    expect(res.status).toBe(409);
  });
});

describe('POST /auth/login e POST /auth/refresh', () => {
  it('4. login do motorista devolve os tokens e o tipo driver', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: emailMotorista, password: SENHA });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    // O banco guarda MOTORISTA; o token carrega driver.
    expect(res.body.data.user.type).toBe('driver');
  });

  it('5. login com senha errada responde 401', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: emailMotorista, password: 'SenhaErrada@2026' });

    expect(res.status).toBe(401);
  });

  it('6. refresh troca o refreshToken por um par novo', async () => {
    const res = await request(app).post('/auth/refresh').send({ refreshToken: refreshMotorista });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    expect(res.body.data.user.email).toBe(emailMotorista);
  });

  it('7. refresh recusa token inválido com 401', async () => {
    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'nao.e.um.token' });

    expect(res.status).toBe(401);
  });
});

describe('smoke das rotas do motorista', () => {
  it('8. GET /driver/me devolve o perfil criado no cadastro', async () => {
    const res = await request(app)
      .get('/driver/me')
      .set('Authorization', `Bearer ${tokenMotorista}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(emailMotorista);
    expect(res.body.data.city).toBe('São Paulo');
    expect(res.body.data.status).toBe('INATIVO');
  });

  it('9. GET /driver/earnings devolve o resumo zerado de quem acabou de entrar', async () => {
    const res = await request(app)
      .get('/driver/earnings')
      .set('Authorization', `Bearer ${tokenMotorista}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.data.totalEarnings)).toBe(0);
    expect(Number(res.body.data.currentMonth)).toBe(0);
    expect(res.body.data.byCampaign).toEqual([]);
  });

  it('10. GET /driver/campaigns devolve lista vazia', async () => {
    const res = await request(app)
      .get('/driver/campaigns')
      .set('Authorization', `Bearer ${tokenMotorista}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('11. GET /driver/me sem Authorization responde 401', async () => {
    const res = await request(app).get('/driver/me');

    expect(res.status).toBe(401);
  });

  it('12. GET /driver/me com token de anunciante responde 403', async () => {
    const res = await request(app)
      .get('/driver/me')
      .set('Authorization', `Bearer ${tokenAnunciante}`);

    // 403 e não 401: o token é válido, a persona é que está errada.
    expect(res.status).toBe(403);
  });
});

describe('smoke das rotas do anunciante', () => {
  it('13. GET /advertiser/me devolve a razão social do cadastro', async () => {
    const res = await request(app)
      .get('/advertiser/me')
      .set('Authorization', `Bearer ${tokenAnunciante}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(emailAnunciante);
    expect(res.body.data.companyName).toBe('Empresa Anunciante Teste LTDA');
  });

  it('14. GET /advertiser/campaigns devolve lista vazia', async () => {
    const res = await request(app)
      .get('/advertiser/campaigns')
      .set('Authorization', `Bearer ${tokenAnunciante}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it('15. GET /advertiser/campaigns sem Authorization responde 401', async () => {
    const res = await request(app).get('/advertiser/campaigns');

    expect(res.status).toBe(401);
  });

  it('16. GET /advertiser/me com token de motorista responde 403', async () => {
    const res = await request(app)
      .get('/advertiser/me')
      .set('Authorization', `Bearer ${tokenMotorista}`);

    expect(res.status).toBe(403);
  });
});

describe('token válido de usuário que não existe', () => {
  it('17. passa pelo verifyJWT e pelo authorize, e morre no serviço com 404', async () => {
    const res = await request(app).get('/driver/me').set(driverAuthHeader());

    // verifyJWT só confere assinatura e authorize só olha o claim `type` —
    // nenhum dos dois toca no banco. Quem descobre que o perfil não existe é
    // o MotoristaService, e a resposta certa aí é 404, não 401.
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 9: Rodar o smoke das personas**

```bash
npm test -- src/routes/__tests__/personas.test.ts
```

Esperado: PASS — 17 testes verdes.

Se o teste 1 ou 3 falhar com 409 logo na primeira execução, sobrou lixo de uma execução anterior interrompida. Limpe e repita:

```bash
docker compose exec -T postgres psql -U fastlead_user -d fastlead_test \
  -c "DELETE FROM \"Company\" WHERE email LIKE 'motorista-%@fastlead.com.br' OR email LIKE 'anunciante-%@fastlead.com.br'"
```

- [ ] **Step 10: Rodar a suíte inteira e o check**

```bash
cd /Users/Matheus/Desktop/FastLead
npm test && npm run check
```

Esperado: tudo verde, com 37 testes novos (12 + 8 + 17) somados aos das tasks anteriores. O `tsc --noEmit -p tsconfig.test.json` também type-checa `src/__tests__/helpers/funnel.ts`, porque o `tsconfig.test.json` da Task 1 inclui `src` inteiro.

- [ ] **Step 11: Confirmar que o banco de teste ficou limpo**

```bash
cd /Users/Matheus/Desktop/FastLead
docker compose exec -T postgres psql -U fastlead_user -d fastlead_test \
  -c 'SELECT (SELECT count(*) FROM "ScanEvent") AS scans, (SELECT count(*) FROM "Lead") AS leads, (SELECT count(*) FROM "Campaign") AS campanhas;'
```

Esperado: `0 | 0 | 0`. Se sobrar linha, o `destroyFunnelFixture` não deu conta e a próxima execução vai acumular lixo — vale investigar antes de commitar.

- [ ] **Step 12: Commit**

```bash
cd /Users/Matheus/Desktop/FastLead
git add src/__tests__/helpers/funnel.ts src/services/__tests__/trackingService.test.ts src/routes/__tests__/publicFunnel.test.ts src/routes/__tests__/personas.test.ts
git commit -m "test: cobrir o funil impressao-scan-lead e as rotas de persona

trackingService (recordScan/captureLead), as rotas publicas /r/:id e
/r/:id/lead, e o smoke de driver/advertiser com cadastro, login, refresh,
401 sem header e 403 com a persona errada.

Nenhum arquivo de producao muda: sao testes de caracterizacao do core do
funil, que ate agora rodava em producao sem nenhuma rede de seguranca.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 14: CI rodando os testes dos dois lados

**Files:**
- Modify: `.github/workflows/ci.yml` (job `backend`: bloco `services` novo e dois steps novos; job `frontend`: um step novo)

**Interfaces:**
- Consumes:
  - Task 1: o script `npm test` (`vitest run`), o `npm run db:test:setup` (`dotenv -e .env.test -- prisma db push --skip-generate --accept-data-loss`) e o `.env.test` versionado, cujo `DATABASE_URL` é `postgresql://fastlead_user:fastlead_password_dev@localhost:5432/fastlead_test`. O serviço Postgres do CI é configurado com **exatamente** esse usuário, senha e nome de banco, para o mesmo `.env.test` servir na máquina de quem desenvolve e no runner.
  - Task 2: o script `npm test` dentro de `frontend/`.
  - Task 13: os três arquivos de teste do funil e das personas. Sem ela, o pipeline sobe sem a cobertura do core do funil — é o motivo de a Task 13 vir antes desta.
  - **Esta é a última task do ciclo.** Rodar depois de 1, 2 e 13 no mínimo; idealmente depois de todas, para o CI já validar o conjunto inteiro.
- Produces: o CI passa a reprovar PR que quebre teste, e não só lint/tipos/build.
- **Por que `POSTGRES_DB: fastlead_test` direto no serviço:** o `db:test:setup` roda `prisma db push`, que cria as tabelas mas **não** cria o banco. Pedir ao container que já suba com o banco certo evita um `CREATE DATABASE` extra no workflow.
- **O `env.DATABASE_URL` do job continua existindo e continua sendo um valor de mentira.** Ele serve ao `prisma validate` e ao `prisma generate` do `postinstall`, que só precisam de uma URL bem formada. Quem manda nos testes é o `.env.test`: o `src/__tests__/setup.ts` da Task 1 o carrega com `override: true`, justamente para o `DATABASE_URL` do ambiente nunca vencer.

- [ ] **Step 1: Acrescentar o serviço Postgres ao job `backend`**

Em `.github/workflows/ci.yml`, no job `backend`, inserir o bloco `services` logo **depois** do bloco `env:` e **antes** de `steps:`:

```yaml
    # Postgres real para os testes. Usuário, senha e nome de banco são os
    # mesmos do .env.test versionado, para o arquivo servir aqui e na máquina
    # de quem desenvolve sem nenhuma variação.
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: fastlead_user
          POSTGRES_PASSWORD: fastlead_password_dev
          POSTGRES_DB: fastlead_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U fastlead_user -d fastlead_test"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
```

- [ ] **Step 2: Acrescentar os steps de teste ao job `backend`**

Ainda no job `backend`, inserir entre o step `Formatação, lint e tipos` e o step `Build`:

```yaml
      # prisma db push contra o fastlead_test do serviço acima. O banco já
      # existe (POSTGRES_DB); o que falta é o schema.
      - name: Preparar o banco de teste
        run: npm run db:test:setup

      - name: Testes
        run: npm test
```

- [ ] **Step 3: Acrescentar o step de teste ao job `frontend`**

No job `frontend`, inserir entre `- run: npm run lint` e `- run: npm run build`:

```yaml
      - run: npm test
```

- [ ] **Step 4: Conferir que o YAML continua válido**

```bash
cd /Users/Matheus/Desktop/FastLead
python3 -c "import yaml; d = yaml.safe_load(open('.github/workflows/ci.yml')); print(sorted(d['jobs'])); print([s.get('name') or s.get('run') or s.get('uses') for s in d['jobs']['backend']['steps']]); print(sorted(d['jobs']['backend']['services']))"
```

Esperado: `['backend', 'frontend']`, a lista de steps do backend terminando em `Preparar o banco de teste`, `Testes`, `Build`, e `['postgres']` nos serviços. Se o Python reclamar de indentação, o bloco foi colado no nível errado.

- [ ] **Step 5: Reproduzir localmente a sequência exata do job do backend**

```bash
cd /Users/Matheus/Desktop/FastLead
docker rm -f ci_postgres_local 2>/dev/null || true
docker run -d --name ci_postgres_local \
  -e POSTGRES_USER=fastlead_user \
  -e POSTGRES_PASSWORD=fastlead_password_dev \
  -e POSTGRES_DB=fastlead_test \
  -p 5433:5432 postgres:15-alpine
```

O container sobe na porta **5433** de propósito, para não brigar com o Postgres do `docker-compose.yml` que já ocupa a 5432. Confirme que ele responde:

```bash
docker exec ci_postgres_local pg_isready -U fastlead_user -d fastlead_test
```

Esperado: `accepting connections`.

- [ ] **Step 6: Rodar a sequência do CI contra esse banco limpo**

```bash
cd /Users/Matheus/Desktop/FastLead
DATABASE_URL='postgresql://fastlead_user:fastlead_password_dev@localhost:5433/fastlead_test' \
  npx dotenv -e /dev/null -- npx prisma db push --skip-generate --accept-data-loss
DATABASE_URL='postgresql://fastlead_user:fastlead_password_dev@localhost:5433/fastlead_test' \
  npx vitest run
```

Esperado: `Your database is now in sync with your Prisma schema.` seguido da suíte inteira verde. É a prova de que um banco **vazio** — como o do runner, que não tem nada do desenvolvimento local — basta para os testes passarem.

Se algum teste depender de dado que só existe na máquina de quem desenvolve, ele quebra aqui, e não no primeiro push.

- [ ] **Step 7: Derrubar o Postgres de simulação**

```bash
docker rm -f ci_postgres_local
```

- [ ] **Step 8: Rodar a verificação completa local**

```bash
cd /Users/Matheus/Desktop/FastLead
docker compose up -d postgres
npm run check && npm test && npm run build
cd frontend && npm run lint && npm test && npm run build
```

Esperado: tudo verde nos dois lados — é exatamente o que o CI vai executar.

- [ ] **Step 9: Commit e conferir o CI de verdade**

```bash
cd /Users/Matheus/Desktop/FastLead
git add .github/workflows/ci.yml
git commit -m "ci: rodar os testes nos dois jobs

O job do backend ganha um servico Postgres com o mesmo usuario, senha e banco
do .env.test versionado, e roda db:test:setup antes de npm test. O job do
frontend ganha npm test entre o lint e o build.

Antes o CI so provava que o codigo compilava.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git push
```

Depois do push, acompanhar a execução:

```bash
gh run watch
```

Esperado: os dois jobs verdes. Se o job do backend falhar em `Preparar o banco de teste` com `Can't reach database server at localhost:5432`, o bloco `services` foi colado no lugar errado (precisa estar dentro do job `backend`, no mesmo nível de `steps:`).

---

## Self-review

### 1. Cobertura do spec, item a item

| Spec | Requisito | Task | Situação |
|---|---|---|---|
| §1 (l.15-16) | Vitest + Supertest no backend, `vitest.config.ts` na raiz, ambiente `node` | 1 | ✅ |
| §1 (l.17) | Banco `fastlead_test` na mesma instância do compose, `DATABASE_URL` próprio em `.env.test`, script `db:test:setup` | 1 | ✅ com desvio **D1**: usa `prisma db push`, não `migrate deploy` — a cadeia de migrations não constrói um banco do zero |
| §1 (l.18) | Testes em `src/**/__tests__/*.test.ts`, sem pasta `tests/` na raiz | 1 | ✅ convenção seguida por 3, 4, 5, 6, 7, 8, 13 |
| §1 (l.19) | Cobertura de `authService` (login/register/refresh) | 7, **13** | ✅ login com e sem 2FA na Task 7 (`auth2fa.test.ts`); `register` (as duas personas + 409 de e-mail repetido), `login` de motorista/anunciante e `refresh` (par novo + 401 com token inválido) na Task 13 (`personas.test.ts`) |
| §1 (l.19) | Cobertura de `trackingService` (captureLead/recordScan) | **13** | ✅ `trackingService.test.ts` (12 testes: scan com e sem motorista, visitante repetido, contadores, `destination_url`, campanha inexistente e com soft delete, lead único por scan, contexto herdado do scan) |
| §1 (l.19) | Cobertura dos middlewares novos (`rateLimiter`, `validateRequest`, `totp`) | 4, 5, 7 | ✅ `rateLimiter.test.ts` (8), `validation.test.ts` (10), `totpService.test.ts` (13) |
| §1 (l.19) | Rotas via Supertest, caminhos felizes + 401/403 | 1, 7, 8, **13** | ✅ `smoke.test.ts` cobre `/health` e o 404; `auth2fa.test.ts` cobre `/auth/*` e `/admin/*` com 401; `swagger.test.ts` cobre `/docs`; a Task 13 fecha com `publicFunnel.test.ts` (`/r/*`) e `personas.test.ts` (`/driver/*` e `/advertiser/*`, com 200, 401 sem header e 403 com a persona errada) |
| §1 (l.21) | Frontend: Vitest + Testing Library + jsdom; cobertura de `AccessHub`, validação CNPJ/CPF/senha, `api.ts` | 2 | ✅ 3 arquivos, 21 testes. ⚠️ os componentes de formulário em si (`LoginForm`, `CadastroEmpresa`…) não são montados — a lógica de validação que eles usam é testada via `lib/validation.js` |
| §1 (l.23) | CI ganha `npm test` em cada job | 14 | ✅ mais o serviço Postgres no job do backend |
| §2 (l.27) | `express-rate-limit`, sem Redis, limiter global em `app.ts` usando `config.rateLimit` | 4 | ✅ |
| §2 (l.27) | Limiter mais agressivo em `/auth/login` e `/auth/register`, janela mais curta | 4 | ✅ com desvio **D10**: precisou de `authWindowMs`/`authMaxRequests` novos no `config.ts` |
| §3 (l.31) | Corrigir o bug do `validateRequest` (namespaces fundidos) | 5 | ✅ com desvio **D3**: query validada vai para `req.validatedQuery`, porque no Express 5 `req.query` é getter |
| §3 (l.33) | `campaignSchemas.ts`, `driverSchemas.ts`, `adminSchemas.ts` | 5 | ✅ em `src/validators/` |
| §3 (l.33) | `POST/PATCH /advertiser/campaigns` rejeitando `pricePerLead` NaN/≤0 e `numVehicles`/`durationDays` não inteiros positivos | 5 | ✅ testes explícitos para os 4 casos |
| §3 (l.33) | `PATCH /driver/profile`, `PATCH /driver/status` | 5 | ✅ |
| §3 (l.33) | Filtros de query do admin (hoje `as Region` sem checagem) | 5 | ✅ enum/UF/data rejeitam; paginação é saneada (decisão documentada na task) |
| §4 (l.37) | `otplib` + `qrcode` já instalado, sem API externa | 7 | ✅ com desvio **D7**: API funcional da v13, não `authenticator.*` da v12 |
| §4 (l.39) | `User.totp_secret` (cifrado) + `User.totp_enabled` | 7 | ✅ schema + migration `20260807a_totp` |
| §4 (l.39) | `src/utils/crypto.ts` AES-256-GCM, `iv:authTag:ciphertext`, recusa produção sem `ENCRYPTION_KEY` | 6 | ✅ |
| §4 (l.42) | `POST /admin/2fa/setup` → QR + segredo, sem habilitar | 7 | ✅ |
| §4 (l.43) | `POST /admin/2fa/enable` → valida o primeiro código e habilita | 7 | ✅ |
| §4 (l.45) | Login devolve `mfa_pending` de 5min para ADMIN com 2FA; `POST /auth/2fa/verify` emite os tokens normais | 7 | ✅ mais a recusa explícita do token `mfa` em `verifyToken` |
| §5 (l.49) | `swagger-jsdoc` + `swagger-ui-express`, anotações JSDoc nas rotas, servido em `/docs`, habilitado sempre | 8 | ✅ 9 arquivos de rota, 51 operações |
| §6 (l.53) | Deletar `Dashboard.jsx`, `Login.jsx`, `Register.jsx` | 9 | ✅ órfãos confirmados (**D5**) |
| §6 (l.53) | Checar as rotas legadas `/create-campaign`, `/campaigns`, `/leads`, `/profile` | 9 | ✅ **mantidas**, com a evidência do `Sidebar` (**D6**) — o spec deixava a escolha em aberto |
| §7 (l.57-60) | `Dockerfile.dev` backend + frontend, serviços no compose, volumes de hot-reload, `depends_on` com healthcheck | 10 | ✅ |
| §7 (l.60) | Não mexer no deploy do Railway | 10 | ✅ Nixpacks intocado; `.dev` no nome dos dois Dockerfile |
| §8 (l.64) | Fail-fast de `JWT_SECRET` em produção, valor de conveniência em dev com aviso | 3 | ✅ com desvio **D2**: `console.warn` e não `logger.warn` (import circular) |
| §9 (l.68) | Deletar `.claude/AUDITORIA_PROJETO.md` e `.claude/PROXIMOS_PASSOS.md` | 11 | ✅ evidência de que nada os referencia |
| §Ordem (l.72) | Fundação sequencial: infra de teste + fix do `JWT_SECRET` primeiro | — | ✅ grafo de dependências: 1 → 3 → 4 |
| §Ordem (l.73) | Demais itens paralelizáveis | — | ✅ grafo + lista de conflitos de arquivo |
| §Testing (l.77) | `npm test` verde nos dois lados, CI rodando os dois | 14 | ✅ |
| §1 (l.19) | Cobertura das rotas públicas do funil (`GET /r/:campaignId`, `POST /r/:scanEventId/lead`) | **13** | ✅ `publicFunnel.test.ts` — redirect com e sem motorista, campanha inexistente que ainda redireciona, visitante repetido, 400 sem contato, lead único por scan, 404 de scan inexistente |

### 2. Gaps encontrados

**G1 — cobertura de teste abaixo do que o spec priorizou. ✅ Coberto pela Task 13.**
O spec (§1, l.19) pediu explicitamente teste de `trackingService` (`captureLead`/`recordScan`, "o core do funil"), cobertura de `authService` incluindo `register`/`refresh`, e smoke de rota para `driver` e `advertiser`. As Tasks 1-11 e 14 constroem a infraestrutura e cobrem tudo que **elas mesmas** criam ou alteram, mas o funil impressão→scan→lead já existia e não é tocado por nenhuma delas — ficaria sem teste.

A **Task 13** fecha o gap inteiro, com três arquivos e 37 testes:

| Arquivo | O que cobre |
|---|---|
| `src/services/__tests__/trackingService.test.ts` (12) | `recordScan` com e sem motorista atribuível, motorista inexistente que não derruba o scan, visitante repetido contando um alcance só, `scans_count` do vínculo, `destination_url` do anunciante versus landing da FastLead, campanha inexistente e com soft delete; `captureLead` herdando IP/user-agent do scan, lead único por scan, `total_leads`/`leads_generated`, scan inexistente |
| `src/routes/__tests__/publicFunnel.test.ts` (8) | `GET /r/:campaignId` (302 com e sem `?m=`, campanha inexistente que ainda redireciona para a home, alcance repetido) e `POST /r/:scanEventId/lead` (400 sem contato, criação com só telefone, duplo envio devolvendo o mesmo lead, 404 de scan inexistente) |
| `src/routes/__tests__/personas.test.ts` (17) | `POST /auth/register` das duas personas com o perfil criado e 409 de e-mail repetido, `POST /auth/login` (200 + tipo `driver`, 401 com senha errada), `POST /auth/refresh` (par novo, 401 com token inválido), e o smoke de `/driver/me`, `/driver/earnings`, `/driver/campaigns`, `/advertiser/me`, `/advertiser/campaigns` com 200, 401 sem header e 403 com a persona errada |

Duas coisas mudaram em relação ao esboço original deste gap, por causa do que a exploração do código mostrou:

- O esboço dizia "200 no caminho feliz com o helper `createTestUser`". Não funciona: `createTestUser` cria só `Company` + `User`, e `GET /driver/me` responde **404** sem `MotoristProfile`. A Task 13 monta as personas por `POST /auth/register` de verdade (**D12**) — o que cobre `register` e `refresh` de quebra, fechando também a parte de `authService` do gap.
- O esboço previa dois arquivos; são três, porque as rotas públicas do funil (`public.ts`) e as rotas de persona (`driver.ts`/`advertiser.ts`) não têm nada em comum além do Supertest.

A Task 13 **não altera nenhum arquivo de produção**, então o ciclo teste-falha→implementa→teste-passa não se aplica: no lugar dele ela usa um passo de falsificação (quebrar uma linha de propósito, ver o vermelho, desfazer), documentado no bloco Interfaces da task.

**Nenhum outro gap.** Todos os itens do spec têm task apontada, e os sete pontos onde o plano diverge do spec (D1, D2, D3, D7, D10, D11, D12) estão documentados na tabela de descobertas e repetidos na task correspondente, com o motivo verificado no código real.

### 3. Scan de placeholder

Varredura por `TBD`, `TODO`, `implement later`, `fill in details`, "add appropriate error handling", "add validation", "handle edge cases", "write tests for the above", "similar to Task N", e por steps que descrevem sem mostrar: **nenhuma ocorrência**.

Checagens específicas do formato:
- Todo step com código traz o código real, completo e colável — inclusive as 51 anotações OpenAPI da Task 8 (nada de "anote as demais rotas do mesmo jeito").
- Nenhuma task diz "igual à Task N": a Task 6 repete o raciocínio do `resolveSecret` da Task 3 em vez de mandar o leitor voltar, e a Task 5 repete o código dos três schemas por inteiro. A Task 13 traz os três arquivos de teste completos, com os 37 casos escritos, em vez de "cubra também os demais caminhos do funil".
- Os passos de falsificação da Task 13 (Steps 4 e 7) dizem qual linha trocar, por qual valor, qual teste tem que ficar vermelho e como desfazer — não são "quebre algo e veja falhar".
- Todo tipo, função e método citado é definido em alguma task ou existe no código de hoje. Os únicos símbolos vindos de fora do plano são de dependências (`z`, `jwt`, `crypto`, `QRCode`, `otplib`, `swaggerJsdoc`, `swaggerUi`, `rateLimit`) ou do código atual (`AppError`, `ValidationError`, `AuthenticationError`, `NotFoundError`, `isValidPhoneBR`, `isValidPlate`, `hashPassword`, `prisma`, `logger`, `AnuncianteService`, `MotoristaService`, `AdminService`, `MasterFilters`, `TabletService`, `TrackingService`, `MarketplaceService`, `CampaignService`, `PaymentService`).
- Todo step de verificação diz o resultado esperado, com número de testes ou saída literal.

### 4. Consistência de tipos e assinaturas entre as 13 tasks

| Símbolo | Definido em | Consumido em | Confere? |
|---|---|---|---|
| `npm test` = `vitest run`, `src/**/__tests__/*.test.ts` | 1 | 3, 4, 5, 6, 7, 8, 13, 14 | ✅ mesmo padrão de caminho em todos |
| `signAuthHeader(payload: Partial<AuthPayload> & { type: UserType })`, `adminAuthHeader(overrides?)` | 1 | 7 (`adminAuthHeader({ id, email, companyId })`), 13 (`driverAuthHeader()` sem overrides) | ✅ `{id, email, companyId}` é um `Partial<AuthPayload>` válido, e o parâmetro tem default `{}` — chamar sem argumento é legal |
| `createTestUser` / `deleteTestUser` / `TestUser` | **7** | 7, 13 (`funnel.ts` e `personas.test.ts`) | ✅ resolvido: a tabela "File Structure" lista `src/__tests__/helpers/db.ts` como criado, mas os steps da Task 1 **não** o criam — quem o cria é a Task 7, e o Step 6 dela diz isso explicitamente. A Task 13 consome daqui, e por isso roda depois da 7 |
| `createFunnelFixture()` / `createCampaign(fixture, destinationUrl)` / `destroyFunnelFixture(fixture)` / `FunnelFixture` | **13** (`src/__tests__/helpers/funnel.ts`) | 13 (`trackingService.test.ts`, `publicFunnel.test.ts`) | ✅ os dois arquivos usam `funil.campaignId`, `funil.campaignComDestinoId` e `funil.motoristaProfileId`, todos campos declarados na interface |
| `.env.test` com `ENCRYPTION_KEY` (64 hex) | 1 | 6 | ✅ a Task 6 depende do valor já existir; a Task 1 já o coloca |
| `.env.test` com `RATE_LIMIT_AUTH_*` | **7** | 7 | ✅ a Task 1 só define `RATE_LIMIT_MAX_REQUESTS`; a Task 7 acrescenta os de auth porque o teste dela faz vários logins e bateria no teto de 10/5min da Task 4 |
| `resolveSecret(envName, rawValue, devFallback)` | 3 | — | ✅ a Task 6 **espelha o padrão** com nome próprio (`resolveEncryptionKey`), sem colisão |
| `createRateLimiter({ windowMs, limit, message })`, `globalLimiter`, `authLimiter` | 4 | 8 (posição no `app.ts`) | ✅ a Task 8 insere `/docs` entre `/health` e `globalLimiter`, exatamente no bloco que a Task 4 reescreveu |
| `config.rateLimit.authWindowMs` / `.authMaxRequests` ↔ `RATE_LIMIT_AUTH_WINDOW_MS` / `RATE_LIMIT_AUTH_MAX_REQUESTS` | 4 | 4 (`.env.example`), 7 (`.env.test`), 10 (compose) | ✅ mesmos nomes de variável nos três lugares |
| `validateRequest(schemas: RequestSchemas)` — **assinatura nova** | 5 | 5 (advertiser, driver, admin), 7 (admin 2fa, auth 2fa) | ✅ a Task 7 sempre usa a forma `{ body: … }`, nunca a antiga `validateRequest(schema)` |
| `getValidatedQuery<T>(req)` / `req.validatedQuery` | 5 | 5 (`admin.ts`) | ✅ |
| `CreateCampaignInput` ↔ `AnuncianteService.createCampaign(userId, companyId, data)` | 5 | 5 | ✅ todos os 17 campos batem, com `targetRegions: Region[]`, `targetRideApps: RideApp[]`, `targetCategories: RideCategory[]`, `qrPosition?: QrPosition` — os mesmos tipos do Prisma que o serviço declara |
| `UpdateCampaignInput` ↔ `AnuncianteService.updateCampaign` | 5 | 5 | ✅ `{ title?, status?: CampaignStatus, pricePerLead? }`; o `CampaignStatus` do Prisma é exatamente a união `'DRAFT'\|'ACTIVE'\|'PAUSED'\|'COMPLETED'\|'CANCELLED'` que o serviço declara |
| `UpdateDriverProfileInput` ↔ `MotoristaService.updateProfile` | 5 | 5 | ✅ os 11 campos batem; `status` sai do schema já em maiúsculas, então o `status?.toUpperCase()` da rota some sem mudar o que o serviço recebe |
| `UpdateDriverStatusInput.status` ↔ `MotoristaService.updateStatus(…, status)` | 5 | 5 | ✅ `MotoristStatus` = `'ATIVO'\|'INATIVO'\|'SUSPENSO'` |
| `MasterQuery` ↔ `MasterFilters` | 5 | 5 (`admin.ts`) | ✅ `region: Region`, `rideApp: RideApp`, `rideCategory: RideCategory`, `from`/`to: Date`, `state`/`city: string` — campo a campo |
| `encrypt(plaintext): string` / `decrypt(payload): string` | 6 | 7 (`totpService`) | ✅ |
| `MFA_PENDING_TTL_SECONDS = 300` | 7 (`jwt.ts`) | 7 (`authService`, e o teste que afirma `expiresIn === 300`) | ✅ |
| `generateMfaPendingToken` / `verifyMfaPendingToken` | 7 | 7 (`authService`) | ✅ |
| `verifyToken` recusando `mfa: true` | 7 | 7 (teste `GET /auth/me` com o mfaToken → 401) | ✅ é o que impede o token intermediário de virar token de acesso |
| `login(): Promise<LoginResult>` — **mudança de tipo de retorno** | 7 | 7 (`src/routes/auth.ts`, único chamador no backend) | ✅ o `grep` de `AuthService.login` no backend acha só `src/routes/auth.ts`, que a Task 7 ajusta com `isMfaPending` |
| `TotpSetupResult { secret, otpauthUrl, qrCodeDataUrl }` | 7 | 7 (rota `/admin/2fa/setup`), 8 (schema da resposta na anotação) | ✅ os três campos aparecem iguais na anotação OpenAPI |
| `swaggerSpec` | 8 | 8 (`app.ts`, teste) | ✅ exportado nomeado **e** como default |
| Convenção `frontend/src/**/__tests__/*.test.{js,jsx,ts,tsx}` | 2 | 9 (`src/__tests__/deadCode.test.js`) | ✅ casa com o `include` do `vite.config.js` |
| `npm run db:test:setup` | 1 | 13 (Step 3), 14 (step do CI) | ✅ mesmo nome de script |
| `DATABASE_URL` do `.env.test` ↔ serviço Postgres do CI | 1 | 14 | ✅ `fastlead_user` / `fastlead_password_dev` / `fastlead_test` / porta 5432 nos dois |
| `APP_BASE_URL` do `.env.test` ↔ `config.appBaseUrl` | 1 | 13 (asserções de redirect) | ✅ os testes comparam com `config.appBaseUrl`, não com a string literal — se o `.env.test` mudar, o teste acompanha |
| `tsconfig.json` excluindo `src/**/__tests__/**` + `tsconfig.test.json` | 1 | 5, 6, 7, 8, 13 (todos criam testes) e 7/13 (`src/__tests__/helpers/db.ts`, `src/__tests__/helpers/funnel.ts`) | ✅ o glob `src/**/__tests__/**` pega tanto `src/config/__tests__/` quanto `src/__tests__/helpers/`; o `tsconfig.test.json` inclui `src` inteiro, então os helpers continuam type-checados no `npm run check` |
| Fixture do funil ↔ schema do Prisma (`Campaign.qr_code_data` UNIQUE, `ScanEvent.motorista_id` NOT NULL, `Campaign.anunciante`/`Lead.motorista` `onDelete: Restrict`) | 13 | 13 | ✅ `qr_code_data` sai de `randomUUID()`, a fixture sempre cria `MotoristProfile`, e `destroyFunnelFixture` apaga na ordem inversa em vez de confiar no cascade da `Company` |
| Ordem em arquivos disputados (`admin.ts`, `auth.ts`, `advertiser.ts`, `driver.ts`, `app.ts`, `.env.example`) | cabeçalho | 4, 5, 6, 7, 8 | ✅ a regra **5 → 7 → 8** está repetida no bloco Interfaces das três tasks, e o conflito de `.env.example` (4 e 6) está anotado na Task 6 |

Nenhuma divergência de nome, tipo ou assinatura entre as 13 tasks.

---
