# FastLead

> Plataforma de publicidade em tablets de táxis e apps de mobilidade.

O FastLead conecta três lados: **motoristas** (renda extra exibindo anúncios no tablet),
**anunciantes** (leads qualificados e ROI rastreável) e a **operação FastLead**
(curadoria, pareamento de dispositivos e repasses).

O funil central do produto é **impressão → scan → lead**: o tablet exibe a campanha,
o passageiro escaneia o QR code, e o scan vira um lead atribuído àquela campanha e àquele motorista.

---

## Arquitetura

O repositório contém duas aplicações:

| Aplicação | Local | Stack |
|---|---|---|
| **API / Backend** | `src/` | Node.js, Express 5, TypeScript, Prisma 5, PostgreSQL |
| **Dashboard / Frontend** | `frontend/` | React, Vite, TailwindCSS |

### Backend (`src/`)

```
src/
├── config/       # Configuração central + logger (Winston)
├── middleware/   # Auth JWT, validação (Zod), logging, error handler
├── routes/       # Endpoints HTTP
├── services/     # Regra de negócio
├── lib/          # Prisma client
├── types/        # Interfaces e enums
├── utils/        # JWT, hash de senha, validators, erros
├── app.ts        # Montagem do Express
└── server.ts     # Entry point (graceful shutdown)
```

Rotas montadas em `src/app.ts`:

| Prefixo | Arquivo | Responsabilidade |
|---|---|---|
| `/health` | `routes/health.ts` | Health check |
| `/` | `routes/public.ts` | Endpoints públicos (redirect de QR, captura de lead) |
| `/auth` | `routes/auth.ts` | Registro, login, refresh, logout |
| `/tablet` | `routes/tablet.ts` | Pareamento e sessão do dispositivo |
| `/driver` | `routes/driver.ts` | Perfil e ganhos do motorista |
| `/advertiser` | `routes/advertiser.ts` | Campanhas e analytics do anunciante |
| `/admin` | `routes/admin.ts` | Gestão de usuários e campanhas |
| `/campaigns` | `routes/campaigns.ts` | Campanhas |
| `/payments` | `routes/payments.ts` | Pagamentos e repasses |

Referência completa dos endpoints: [docs/api/API_ROUTES.md](docs/api/API_ROUTES.md)

### Banco de dados

Schema multi-tenant, isolado por `Company`. Models em `prisma/schema.prisma`:

`Company` · `User` · `MotoristProfile` · `AnuncianteProfile` · `Campaign` ·
`CampaignMotorista` · `Lead` · `TabletDevice` · `TabletSession` ·
`ImpressionEvent` · `ScanEvent` · `Payment` · `AuditLog`

Diagrama ER: [docs/database/SCHEMA_DIAGRAM.txt](docs/database/SCHEMA_DIAGRAM.txt)

---

## Começando

### Pré-requisitos

- Node.js 18+
- PostgreSQL 15 (ou Docker)

### 1. Backend

```bash
npm install
cp .env.example .env      # ajuste DATABASE_URL e os segredos JWT
```

Suba o banco e aplique o schema:

```bash
docker-compose up -d
npm run db:push
npm run db:seed
```

Rode a API (padrão: `http://localhost:3000`):

```bash
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Guia detalhado: [docs/QUICK_START.md](docs/QUICK_START.md) ·
setup do banco em [docs/database/DATABASE_SETUP.md](docs/database/DATABASE_SETUP.md)

---

## Scripts

### Backend (raiz)

| Comando | Ação |
|---|---|
| `npm run dev` | API em modo watch (nodemon + ts-node) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Roda o build de produção |
| `npm run lint` | ESLint em `src/` |
| `npm run format` | Prettier em `src/` |
| `npm run db:push` | Aplica o schema no banco |
| `npm run db:migrate:dev` | Cria e aplica migration em dev |
| `npm run db:seed` | Popula dados de teste |
| `npm run db:studio` | Abre o Prisma Studio |

### Frontend (`frontend/`)

| Comando | Ação |
|---|---|
| `npm run dev` | Dev server do Vite |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run lint` | oxlint |

> **Nota:** `npm test` ainda não está configurado — o projeto não possui suíte de testes automatizados.

---

## Documentação

```
docs/
├── QUICK_START.md              # Guia de setup completo
├── PROJECT_STRUCTURE.md        # Árvore detalhada do backend
├── CONTAS_TESTE_FASTLEAD.pdf   # Credenciais das contas de teste
├── api/
│   ├── API_ROUTES.md           # Referência de todos os endpoints
│   └── POSTMAN_COLLECTION.json # Collection para importar no Postman
├── database/
│   ├── DATABASE.md             # Modelagem e decisões de schema
│   ├── DATABASE_SETUP.md       # Setup do PostgreSQL (Docker / brew / cloud)
│   └── SCHEMA_DIAGRAM.txt      # Diagrama ER
├── design/
│   └── DESIGN_SYSTEM.md        # Cores, tipografia e componentes
└── negocio/
    ├── FASTLEAD_MVP_REFERENCE.md   # Blueprint do MVP
    └── FASTLEAD_PLANO_NEGOCIO.html # Plano de negócio
```

Docs específicos do frontend ficam em `frontend/`:
[ARCHITECTURE.md](frontend/ARCHITECTURE.md) · [TESTING.md](frontend/TESTING.md)

---

## Identidade visual

| Cor | Hex | Uso |
|---|---|---|
| Primary | `#1B3B9C` | Azul profundo — confiança, perfil empresa |
| Secondary | `#FF6B35` | Laranja vibrante — ação e destaque |
| Success | `#22C55E` | Verde — perfil motorista |
| Error | `#EF4444` | Erros e alertas |
| Warning | `#F59E0B` | Avisos |

Detalhes em [docs/design/DESIGN_SYSTEM.md](docs/design/DESIGN_SYSTEM.md).

---

## Deploy

O projeto está configurado para **Railway** (`.railwayignore` na raiz e
`frontend/railway.json`). Backend e frontend são deployados como serviços separados.
