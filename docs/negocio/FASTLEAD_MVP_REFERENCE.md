# FastLead MVP - Documento de Referência Técnico

**Data:** 09/07/2026
**Versão:** 1.0 (MVP Blueprint)
**Status:** Pronto para Desenvolvimento

---

## 📋 Visão Geral do MVP

**Objetivo:** Criar protótipo funcional que demonstre o modelo FastLead (publicidade em tablets em táxis) com foco em:
- ✅ Motorista recebendo renda extra
- ✅ Anunciante vendo ROI em tempo real
- ✅ FastLead gerenciando tudo

**Timeline:** Definir baseado em decisões abaixo
**Orçamento:** Definir baseado em escopo

---

## 🎯 O QUE DEVE TER NO MVP

### Fase 1: Core (ESSENCIAL)
- [ ] App Motorista (mobile - Android/iOS ou web)
  - [ ] Login + Cadastro
  - [ ] Dashboard: Visualizar ganhos do mês
  - [ ] Status do tablet (online/offline)
  - [ ] Histórico de campanhas ativas

- [ ] Dashboard Anunciante (web)
  - [ ] Login + Cadastro
  - [ ] Criar campanha (selecionar imagem, duração, qtd táxis)
  - [ ] Gerar QR Code único por campanha
  - [ ] Visualizar leads gerados (contador básico)
  - [ ] Histórico de campanhas

- [ ] Tablet Display (web - responsive)
  - [ ] Carrossel de anúncios (offline-first)
  - [ ] Mostrar QR code grande
  - [ ] Rodar sem internet (cache local)

### Fase 2: Adicional (NICE-TO-HAVE para MVP)
- [ ] Integração WhatsApp (lead → vendedor)
- [ ] CRM para anunciante (lead tracking completo)
- [ ] IA gerando histórico de sucesso
- [ ] Pagamento integrado

### Fase 3: Futuro (NÃO no MVP)
- [ ] Multi-idioma
- [ ] App TV/Chromecast
- [ ] Análise de heatmap
- [ ] Integração de video ads

---

## 🏗️ ARQUITETURA RECOMENDADA

### Frontend
```
├── App Motorista (React Native ou Flutter)
│   ├── Telas: Login, Dashboard, Campanhas
│   ├── Storage: LocalStorage/AsyncStorage
│   └── API: REST/GraphQL para backend
│
├── Dashboard Anunciante (React.js ou Vue.js)
│   ├── Telas: Login, Criar Campanha, Leaderboard, Leads
│   ├── Estado: Redux ou Pinia
│   └── API: REST/GraphQL para backend
│
└── Display Tablet (React.js - web)
    ├── Carrossel de anúncios (offline)
    ├── Mostrar QR Code
    └── Service Worker (cache imagens)
```

### Backend
```
├── API REST (Node.js/Express ou Python/FastAPI)
│   ├── Endpoints:
│   │   ├── /auth (login, registro)
│   │   ├── /campaigns (criar, atualizar, listar)
│   │   ├── /leads (rastrear QR scans)
│   │   ├── /motorista (dados, ganhos)
│   │   └── /anunciante (campanhas, ROI)
│   │
│   └── Autenticação: JWT
│
├── Banco de Dados (PostgreSQL ou Firebase)
│   ├── Tabelas:
│   │   ├── users (motorista, anunciante)
│   │   ├── campaigns (campanhas, imagens, QR)
│   │   ├── leads (tracking de QR scans)
│   │   ├── payments (ganhos motorista)
│   │   └── statistics (ROI, conversões)
│   │
│   └── Índices em: user_id, campaign_id, qr_code
│
└── Storage (AWS S3 ou Firebase Storage)
    └── Armazenar imagens de campanhas
```

---

## 💾 BANCO DE DADOS - Estrutura Mínima

### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  name VARCHAR(255),
  type ENUM('motorista', 'anunciante', 'admin'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Motorista Profile
```sql
CREATE TABLE motorista_profile (
  id UUID PRIMARY KEY,
  user_id UUID FOREIGN KEY,
  vehicle_info VARCHAR(500),
  phone VARCHAR(20),
  total_earnings DECIMAL(10,2),
  status ENUM('ativo', 'inativo'),
  last_online TIMESTAMP
);
```

### Campaigns
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  anunciante_id UUID FOREIGN KEY,
  image_url VARCHAR(500),
  qr_code_data VARCHAR(500),
  qr_code_image_url VARCHAR(500),
  title VARCHAR(255),
  description TEXT,
  start_date DATE,
  end_date DATE,
  num_vehicles INT,
  total_investment DECIMAL(10,2),
  status ENUM('draft', 'active', 'completed', 'paused'),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Leads (Tracking de QR)
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  campaign_id UUID FOREIGN KEY,
  motorista_id UUID FOREIGN KEY,
  qr_scan_time TIMESTAMP,
  user_location POINT, -- geolocation opcional
  user_device VARCHAR(255),
  created_at TIMESTAMP
);
```

### Payments
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  motorista_id UUID FOREIGN KEY,
  campaign_id UUID FOREIGN KEY,
  amount DECIMAL(10,2),
  payment_type ENUM('fixed', 'per_lead'),
  status ENUM('pending', 'completed'),
  created_at TIMESTAMP,
  paid_at TIMESTAMP
);
```

---

## 🛠️ STACK RECOMENDADO (Mais rápido para MVP)

### Option A: Fullstack JavaScript (MAIS RÁPIDO)
```
Frontend:
  - React.js (web + tablet display)
  - React Native (app motorista)
  - Vite (build)

Backend:
  - Node.js + Express
  - PostgreSQL ou Firebase
  - JWT para auth

Hosting:
  - Vercel (frontend)
  - Render ou Heroku (backend)
  - Firebase Storage (imagens)
```

### Option B: Python + React (MAIS ROBUSTO)
```
Frontend:
  - React.js
  - React Native
  
Backend:
  - Python + FastAPI
  - PostgreSQL
  - JWT para auth

Hosting:
  - Vercel (frontend)
  - AWS ou DigitalOcean (backend)
  - AWS S3 (imagens)
```

### Option C: Prototipagem Rápida (MAIS RÁPIDO AINDA)
```
Frontend:
  - HTML/CSS/JavaScript puro
  - Responsivo para mobile
  
Backend:
  - Firebase (Realtime DB + Auth + Storage)
  
Vantagens:
  - Zero DevOps
  - Deploy automático
  - Offline support built-in
  - Muito mais rápido para MVP
```

**RECOMENDAÇÃO:** Option C (Firebase) para MVP, depois migrar para Option A se escalar

---

## 📱 INTERFACE - Telas Principais

### 1. App Motorista
```
├── Login
│   ├── Email
│   ├── Senha
│   └── "Registrar como motorista"
│
├── Dashboard Motorista
│   ├── Saldo do mês: R$ 1.250
│   ├── Campanhas ativas: 3
│   ├── Status tablet: ✅ Online
│   ├── QR scans hoje: 47
│   └── Histórico de ganhos (gráfico)
│
└── Detalhes Campanha
    ├── Nome: "Patriani Imóveis"
    ├── Período: 01/07 - 31/07
    ├── Seu ganho: R$ 450 (30%)
    ├── Leads gerados: 100+
    └── Status: Ativo
```

### 2. Dashboard Anunciante
```
├── Login
│   ├── Email
│   ├── Senha
│   └── "Registrar como anunciante"
│
├── Dashboard Anunciante
│   ├── Campanhas ativas: 2
│   ├── Total investido: R$ 5.000
│   ├── Total de leads: 200+
│   ├── ROI estimado: 200.000%
│   └── Botão: "+ Nova Campanha"
│
├── Criar Campanha
│   ├── Título
│   ├── Upload de imagem
│   ├── Qtd de táxis
│   ├── Duração (dias)
│   ├── Preço: R$ X por lead
│   └── Gerar QR (automático)
│
└── Ver Leads
    ├── Tabela: Data, Hora, Local (opcional)
    ├── Total de scans
    ├── Conversão (%)
    └── Exportar dados
```

### 3. Tablet Display
```
[FULLSCREEN]
├── Anúncio (Patriani Imóveis)
│   ├── Imagem grande
│   ├── QR Code gigante (abaixo)
│   ├── Texo: "Scan para mais info!"
│   └── Auto-scroll para próximo em 10s
│
└── Funciona offline (cache local)
```

---

## 🔌 API - Endpoints Mínimos

```
Authentication
  POST /auth/register         (email, password, type)
  POST /auth/login            (email, password)
  POST /auth/logout           (token)

Motorista
  GET  /motorista/me          (dados do motorista)
  GET  /motorista/earnings    (ganhos do mês)
  GET  /motorista/campaigns   (campanhas ativas)

Anunciante
  GET  /anunciante/me         (dados do anunciante)
  GET  /anunciante/campaigns  (todas campanhas)
  POST /anunciante/campaigns  (criar campanha)
  GET  /anunciante/leads      (leads gerados)
  GET  /anunciante/roi        (calcular ROI)

Campaigns
  GET  /campaigns/:id         (detalhes)
  GET  /campaigns/:id/image   (download imagem)
  GET  /campaigns/:id/qr      (download QR)

Leads
  POST /leads/track-qr        (quando QR é scaneado)
  GET  /leads/campaign/:id    (leads de uma campanha)

Health
  GET  /health                (status da API)
```

---

## 🚀 FASES DE DESENVOLVIMENTO

### Semana 1-2: Setup + Autenticação
- [ ] Setup projeto (React, Node, DB)
- [ ] Modelo de banco de dados
- [ ] Autenticação (login/registro)
- [ ] Deploy pipeline

### Semana 3-4: Core Features
- [ ] App Motorista (dashboard básico)
- [ ] Dashboard Anunciante (criar campanha)
- [ ] QR Code generation
- [ ] Tablet Display (carrossel)

### Semana 5-6: Integração + Testes
- [ ] Rastreamento de QR scans
- [ ] Cálculo de leads e ROI
- [ ] Offline mode (Service Worker)
- [ ] Testes e bugs

### Semana 7-8: Polimento + Deploy
- [ ] UI/UX final
- [ ] Performance optimization
- [ ] Deploy para produção
- [ ] Documentação

---

## ✅ CHECKLIST DE DESENVOLVIMENTO

### Frontend
- [ ] Página de login (motorista + anunciante)
- [ ] Dashboard motorista com ganhos
- [ ] Dashboard anunciante com campanhas
- [ ] Tela de criar campanha
- [ ] Tablet display com carrossel
- [ ] Responsividade (mobile + tablet)
- [ ] Tela de leads/ROI (básica)
- [ ] Offline support (Service Worker)
- [ ] Testes E2E

### Backend
- [ ] Autenticação (JWT)
- [ ] CRUD de usuários
- [ ] CRUD de campanhas
- [ ] Gerador de QR Code
- [ ] Rastreamento de leads
- [ ] Cálculo de ROI
- [ ] Pagamentos (mock ou real)
- [ ] Testes unitários
- [ ] Documentação de API

### DevOps
- [ ] CI/CD pipeline
- [ ] Staging environment
- [ ] Produção environment
- [ ] Monitoramento (logs, errors)
- [ ] Backups automáticos

### Documentação
- [ ] README.md (como rodar)
- [ ] API docs (Swagger/OpenAPI)
- [ ] Arquitetura (diagrama)
- [ ] User guide (motorista + anunciante)

---

## 📊 MÉTRICAS DO MVP

**Sucesso = demonstrar:**
- ✅ Motorista recebeu (simulado R$ 100-500)
- ✅ Anunciante viu leads gerados (50+ scans)
- ✅ QR tracking funcionando (100% acurácia)
- ✅ Offline mode funcionando (sem internet)
- ✅ ROI calculado corretamente

---

## ⚠️ RISCOS & MITIGAÇÕES

| Risco | Impacto | Mitigação |
|-------|--------|-----------|
| Offline não funciona | CRÍTICO | Usar Service Worker + IndexedDB |
| QR geração lenta | MÉDIO | Gerar pré-computado |
| Deploy quebra | CRÍTICO | CI/CD robusto + staging |
| Perda de leads | CRÍTICO | Dupla persistência (BD + local) |
| Performance em mobile | MÉDIO | Otimizar imagens, lazy load |

---

## 📞 PRÓXIMOS PASSOS

1. **Responda as 4 perguntas:**
   - Qual escopo? (Fase 1, 2, ou 3?)
   - Timeline? (2-4 sem, 1-2 meses, 3+ meses?)
   - Validação? (vídeo, protótipo, app real, teste com táxis?)
   - Orçamento? (R$ 0, 5-10K, 10-20K, sem limite?)

2. **Defina o stack:**
   - Option A: JavaScript completo (Express + React)
   - Option B: Python + React
   - Option C: Firebase (mais rápido)

3. **Comece desenvolvimento:**
   - Clone template
   - Setup banco de dados
   - Deploy hello world

---

**Pronto para começar? Responda as 4 perguntas acima!** 🚀
