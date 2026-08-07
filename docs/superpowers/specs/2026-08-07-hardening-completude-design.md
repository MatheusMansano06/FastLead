# FastLead — Hardening & Completude (exceto financeiro)

## Contexto

Auditoria completa de 2026-08-07 mostrou que o backend/frontend do funil impressão→scan→lead está funcional, mas vários itens de qualidade/segurança ficaram pendentes desde o levantamento anterior (2026-07-29): zero testes automatizados, rate limiting configurado mas nunca plugado, validação de input inconsistente, sem 2FA no MASTER, sem documentação de API, código morto no frontend, sem Dockerfile de dev, `JWT_SECRET` com fallback inseguro, e dois documentos de auditoria desatualizados em `.claude/`.

O módulo financeiro/pagamento foi propositalmente deixado de fora deste ciclo (plano próprio já escrito em `~/.claude/plans/deep-stirring-castle.md`, para depois). Este spec cobre **tudo mais** que falta para o projeto chegar a 100% de prontidão fora do financeiro.

Escopo confirmado com o usuário: testes, rate limiting, validação, 2FA (TOTP, sem API externa), Swagger, limpeza de código morto no frontend, Dockerfile de dev, fix do `JWT_SECRET`, remoção dos docs desatualizados.

## Arquitetura por item

### 1. Testes (fundação — todo o resto depende disso pra ser verificável)

**Backend**: Vitest + Supertest. Justificativa: projeto já roda TS puro via `ts-node`, sem necessidade de transform pesado como `ts-jest`; Vitest usa esbuild nativamente. `package.json` atual tem `"test": "echo ... && exit 1"` — placeholder a substituir.
- `vitest.config.ts` na raiz, ambiente `node`.
- Banco de teste: reaproveita o `postgres` do `docker-compose.yml` (mesma instância), banco separado `fastlead_test` via `DATABASE_URL` próprio em `.env.test`. Script `db:test:setup` roda `prisma migrate deploy` contra essa URL.
- Estrutura: `src/**/__tests__/*.test.ts` colocados perto do código testado (não pasta `tests/` separada — mantém unidade e teste juntos, mais fácil de navegar).
- Cobertura inicial priorizada: `authService` (login/register/refresh — é o que protege tudo), `trackingService` (captureLead/recordScan — é o core do funil), middlewares novos (`rateLimiter`, `validateRequest`, `totp`), e as rotas via Supertest (`auth`, `driver`, `advertiser`, `admin` smoke tests dos caminhos felizes + 401/403).

**Frontend**: Vitest + `@testing-library/react` + `jsdom` (mesmo motor de build do Vite, zero config de transform extra). Cobertura inicial: `AccessHub`, formulários de login/cadastro (validação de CNPJ/CPF/senha já mencionada nas decisões de produto), `api.ts` (mock de axios).

CI (`.github/workflows/ci.yml`) ganha um step `npm test` em cada job (hoje só faz lint/build).

### 2. Rate limiting

`express-rate-limit` (dependência nova, leve, sem Redis — single instance no Railway hoje). Middleware global em `src/app.ts` usando os valores já existentes em `config.ts` (`rateLimit.windowMs`/`maxRequests`, hoje órfãos). Limite mais agressivo específico em `/auth/login` e `/auth/register` (força bruta é o risco real ali) via um segundo limiter com janela mais curta.

### 3. Validação de input (Zod)

`validateRequest` (`src/middleware/validation.ts`) já existe mas tem um bug a corrigir no caminho: hoje faz `schema.parse({...req.body, ...req.params, ...req.query})` e escreve tudo de volta em `req.body` — isso mistura namespaces (um `:id` de rota vira campo do body) e é frágil. Trocar por schemas por-parte (`z.object({ body, params, query })`) ou três `validateRequest` distintos, e escrever de volta cada um no lugar certo (`req.body`, `req.params`, `req.query`).

Novos arquivos `src/validators/*.schemas.ts` por domínio (`campaignSchemas.ts`, `driverSchemas.ts`, `adminSchemas.ts`) cobrindo as rotas de escrita que hoje só checam "campo presente": `POST/PATCH /advertiser/campaigns` (rejeita `pricePerLead` NaN/≤0, `numVehicles`/`durationDays` não inteiros positivos — bug concreto já identificado na auditoria), `PATCH /driver/profile`, `PATCH /driver/status`, filtros de query em `admin.ts` (hoje faz cast direto `as Region` sem checagem).

### 4. 2FA — TOTP para ADMIN/MASTER

Sem API externa: `otplib` (gera segredo + valida código de 6 dígitos localmente) + `qrcode` (**já é dependência do projeto**, reutilizado).

Schema: `User` ganha `totp_secret String?` (cifrado) e `totp_enabled Boolean @default(false)`. Cifra do segredo usa um utilitário novo e genérico `src/utils/crypto.ts` (AES-256-GCM, formato `iv:authTag:ciphertext`, recusa subir em produção sem `ENCRYPTION_KEY` setada) — desacoplado do financeiro, mesmo padrão que seria usado lá depois.

Fluxo de enrollment (`src/routes/admin.ts`, admin autenticado):
- `POST /admin/2fa/setup` → gera segredo TOTP, retorna QR code (data URL via `qrcode`) + segredo em texto (fallback manual), **não habilita ainda**.
- `POST /admin/2fa/enable` → recebe o primeiro código de 6 dígitos, valida, só então seta `totp_enabled=true`.

Fluxo de login (`src/services/authService.ts::login`): depois da senha válida, se `user.type === ADMIN && user.totp_enabled`, não emite os tokens completos ainda — retorna um token de curta duração `mfa_pending` (JWT separado, TTL 5min, claim específica). Novo endpoint `POST /auth/2fa/verify` recebe `{ mfaToken, code }`, valida o TOTP contra o segredo decifrado, só então emite os tokens normais (mesmo formato de hoje).

### 5. Swagger/OpenAPI

`swagger-jsdoc` + `swagger-ui-express`. Anotações JSDoc `@openapi` direto nos arquivos de rota existentes (não um YAML separado — mantém a doc perto do código, menos chance de divergir). Servido em `GET /docs` (só habilitado fora de produção, ou atrás de `authorize(ADMIN)` se exposto em prod — decisão de baixo risco, seguir o padrão mais simples: habilitado sempre, é documentação de API pública mesmo). Gerado a partir das rotas já existentes: `auth`, `driver`, `advertiser`, `admin`, `campaigns`, `tablet`, `public`, `health`.

### 6. Limpeza de código morto (frontend)

Deletar `frontend/src/pages/Dashboard.jsx`, `Login.jsx`, `Register.jsx` (confirmado: não importados em nenhum lugar, substituídos pelo fluxo `AccessHub`/persona homes atual). Checar `frontend/src/App.jsx` por qualquer rota morta apontando pra eles (rotas legadas `/create-campaign`, `/campaigns`, `/leads`, `/profile` mencionadas na auditoria — remover se também não usadas, manter se ainda servem alguma tela viva).

### 7. Dockerfile — paridade de dev local

Dois `Dockerfile.dev` (backend e `frontend/`), adicionados como novos serviços no `docker-compose.yml` existente (hoje só tem `postgres`+`pgadmin`):
- `backend`: node:22-alpine, `npm ci`, `npm run dev` (nodemon), volume montado pro código pra hot-reload, `depends_on: postgres` com healthcheck.
- `frontend`: node:22-alpine, `npm ci`, `npm run dev` (vite), volume montado.
`docker compose up` passa a subir o ambiente completo (hoje só sobe banco). Não mexe no deploy do Railway (Nixpacks continua sendo o caminho de produção — fora de escopo trocar isso).

### 8. `JWT_SECRET` — remover fallback inseguro

Hoje cai silenciosamente em `'your-secret-key'` se a env faltar. Mesmo padrão do `ENCRYPTION_KEY`: em `src/config/config.ts`, se `NODE_ENV=production` e `JWT_SECRET` ausente/curto, o processo recusa subir (`throw` no boot). Em dev, mantém um valor fixo de conveniência mas loga `logger.warn`.

### 9. Docs desatualizados

Deletar `.claude/AUDITORIA_PROJETO.md` e `.claude/PROXIMOS_PASSOS.md` — conteúdo já coberto pela memória de auditoria do Claude (`auditoria_2026-08-07.md`), manter arquivo duplicado em markdown no repo só gera divergência.

## Ordem de execução (para o plano/subagentes)

1. **Fundação, sequencial**: item 1 (infra de teste) e item 8 (fix `JWT_SECRET`, trivial) — pequeno, desbloqueia verificação de tudo mais.
2. **Paralelo** (arquivos/domínios não se sobrepõem): item 2 (rate limit), item 3 (validação), item 4 (2FA), item 5 (Swagger), item 6 (limpeza frontend), item 7 (Dockerfile), item 9 (docs) — cada um vira uma tarefa independente para subagent-driven-development.

## Testing (visão geral)

Cada item acima ganha teste automatizado como parte do próprio item (TDD: teste antes da implementação onde fizer sentido — validação, TOTP, rate limit são unitários fáceis; 2FA e rotas via Supertest). Critério de conclusão do ciclo: `npm test` verde no backend e no frontend, CI rodando os dois.
