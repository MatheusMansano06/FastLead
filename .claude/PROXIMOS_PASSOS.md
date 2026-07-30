# 🎯 PRÓXIMOS PASSOS - FastLead

**Priorizado por impacto e urgência** | Última atualização: 2026-07-29

---

## 🔴 CRÍTICO (Hoje → 3 dias)

### 1. Setup de Testes
**Por quê?** Nenhum teste existe. Risco total em produção.

```bash
# Backend
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @testing-library/react

# Frontend
cd frontend && npm install --save-dev vitest @testing-library/react
```

**Tarefas**:
- [ ] Setup Jest em backend (tsconfig, jest.config.js)
- [ ] Setup Vitest em frontend
- [ ] Mock Prisma para testes unitários
- [ ] Test auth middleware
- [ ] Test API endpoints críticos (auth, campaigns)
- [ ] Test componentes UI principais

**Tempo estimado**: 2-3 dias

---

### 2. Completar Frontend de Verdade
**Por quê?** Apenas 5 arquivos em src/. Faltam telas inteiras.

**Estrutura de Pastas Necessária**:
```
frontend/src/
├── pages/
│   ├── auth/
│   │   ├── Login.tsx          (novo)
│   │   ├── Register.tsx       (novo)
│   │   └── ForgotPassword.tsx (novo)
│   ├── driver/
│   │   ├── Dashboard.tsx      (novo)
│   │   ├── Campaigns.tsx      (novo)
│   │   ├── Sessions.tsx       (novo)
│   │   └── Profile.tsx        (novo)
│   ├── advertiser/
│   │   ├── Dashboard.tsx      (novo)
│   │   ├── CreateCampaign.tsx (novo)
│   │   ├── Analytics.tsx      (novo)
│   │   └── Profile.tsx        (novo)
│   ├── admin/
│   │   └── Panel.tsx          (novo)
│   └── Home.tsx               (novo)
├── components/
│   ├── forms/
│   │   ├── LoginForm.tsx      (novo)
│   │   ├── CampaignForm.tsx   (novo)
│   │   └── ProfileForm.tsx    (novo)
│   ├── ui/                    (✅ Design system - já existe)
│   └── layout/
│       ├── Header.tsx         (novo)
│       ├── Sidebar.tsx        (novo)
│       └── Layout.tsx         (novo)
├── hooks/                     (novo)
│   ├── useAuth.ts
│   ├── useCampaigns.ts
│   └── useLeads.ts
├── middleware/                (novo)
│   └── ProtectedRoute.tsx
├── types/index.ts             (✅ já existe - expandir)
├── stores/                    (✅ já existe - completar)
│   ├── authStore.ts
│   ├── campaignStore.ts
│   └── leadsStore.ts
└── App.tsx                    (refactor + routing)
```

**Tarefas**:
- [ ] Setup React Router com layout dinâmico
- [ ] Implementar Login/Register (use authStore)
- [ ] Dashboard Motorista básico
- [ ] Dashboard Anunciante básico
- [ ] Tela de criação de campanha
- [ ] Tela de perfil (3 tipos: driver, advertiser, admin)
- [ ] Protected routes middleware
- [ ] Refresh token handling

**Tempo estimado**: 1 semana

---

### 3. Integração API + Frontend
**Por quê?** API client genérica sem tipagem. Falta integração real.

**Tarefas**:
- [ ] Gerar tipos TypeScript da API (usar Swagger ou manual)
- [ ] Tipificar axios client com endpoints
- [ ] Implementar request/response interceptors
- [ ] Handle de erros (display em toast)
- [ ] Token refresh automático
- [ ] Local storage de token (seguro)
- [ ] Testar cada endpoint

**Arquivo a criar**: `frontend/src/services/api.ts` (expandir)

---

## 🟡 IMPORTANTE (Semana 1-2)

### 4. QR Code Tracking Completo
**Problema**: `GET /api/qr/:code` não redireciona. Landing page falta.

**Tarefas**:
- [ ] Completar rota `/api/qr/:code` (decodificar QR → ID campanha)
- [ ] Redirecionar para URL destino OU landing page FastLead
- [ ] Criar landing page de captura de lead
  - [ ] Form: nome, email, telefone
  - [ ] Validação frontend + backend
  - [ ] Salvar lead em BD
  - [ ] Redirect to CTA ou obrigado
- [ ] Tracking de conversão
- [ ] Analytics do QR

**Arquivo**: `frontend/src/pages/public/QrCapture.tsx` (novo)

---

### 5. Swagger/OpenAPI
**Por quê?** Postman collection desatualizada. Precisa de documentação automática.

```bash
npm install express-swagger-ui swagger-jsdoc swagger-ui-express
```

**Tarefas**:
- [ ] Setup swagger-jsdoc
- [ ] Documentar todos 21+ endpoints
- [ ] Adicionar exemplos de request/response
- [ ] Disponibilizar em `/api-docs`
- [ ] Gerar tipos TypeScript automático (opcionalmente)

---

### 6. Rate Limiting Ativo
**Status**: Vars existem em .env, mas middleware não está plugado.

**Tarefas**:
- [ ] Implementar middleware rate-limit
- [ ] Aplicar em endpoints sensíveis
- [ ] Retornar 429 com retry-after
- [ ] Log de tentativas (spam)
- [ ] Whitelist para IPs confiáveis (admin)

---

## 🟢 SEMANA 2-3

### 7. Tablet Display App
**Novo repositório ou folder**: `tablet-app/`

Será a tela que motoristas veem no tablet dentro do táxi.

**Features**:
- [ ] App React otimizado para tablet
- [ ] Service Worker para offline
- [ ] Pairing code entry (6 dígitos)
- [ ] Carrossel de campanhas
- [ ] QR code exibição
- [ ] Click tracking
- [ ] Session management (iniciar/encerrar jornada)
- [ ] Battery + network status

**Stack**: React 19 + Vite + PWA manifest

---

### 8. Analytics Dashboard
**Por quê?** Anunciantes precisam ver ROI. Motoristas precisam ver ganhos.

**Tarefas** (Anunciante):
- [ ] Gráfico de impressões (timeline)
- [ ] Gráfico de scans (QR)
- [ ] Gráfico de leads gerados
- [ ] Taxa de conversão
- [ ] CPL (cost per lead)
- [ ] Motoristas top performing
- [ ] Segmentação por região
- [ ] Export (CSV/PDF)

**Tarefas** (Motorista):
- [ ] Ganhos por campanha
- [ ] Histórico de pagamentos
- [ ] Jornadas (sessões)
- [ ] Impressões count

**Usar**: dataviz skill para dashboards

---

### 9. Payment Gateway (Stripe) - Básico
**Por quê?** Motoristas precisam receber. Anunciantes precisam pagar.

**Tarefas**:
- [ ] Integrar Stripe API backend
- [ ] Webhook handling
- [ ] Processar pagamento por lead
- [ ] Pagamentos periódicos (mensal)
- [ ] Historico em BD
- [ ] Email de confirmação
- [ ] Frontend: payment methods form

**Não é crítico para MVP**: Pode ser mock/manual inicialmente

---

## 🏗️ BACKLOG (Pós-MVP)

### 10. Admin Panel
- [ ] Dashboard com KPIs globais
- [ ] Gerenciar anunciantes (ativar/desativar)
- [ ] Gerenciar motoristas
- [ ] Forçar assignment de campanhas
- [ ] Bloqueio de campanhas para drivers
- [ ] Segmentação automática
- [ ] Audit log viewer
- [ ] Support tickets

### 11. Performance
- [ ] Paginação em list endpoints
- [ ] Redis cache para campanhas
- [ ] CDN para imagens (S3)
- [ ] Lazy load em frontend
- [ ] Image optimization
- [ ] Bundle size optimization

### 12. Security
- [ ] 2FA para admins (TOTP)
- [ ] Refresh token rotation
- [ ] Criptografar bank_account
- [ ] Helmet.js para headers
- [ ] HSTS preload
- [ ] CSP headers
- [ ] Security audit (OWASP top 10)

### 13. Mobile Apps
- [ ] React Native app (motorista)
- [ ] React Native app (anunciante)
- [ ] Push notifications
- [ ] Deep linking

### 14. Advanced Features
- [ ] Machine learning para matching
- [ ] Recomendação automática de campanhas
- [ ] Chatbot support
- [ ] API v2 (GraphQL)
- [ ] Webhooks para partners
- [ ] White-label solution

---

## 📋 CHECKLIST DE PRIORIDADES

### Dia 1-2: Testes
```
[ ] Jest setup (backend)
[ ] Vitest setup (frontend)
[ ] Mock Prisma
[ ] 5 testes críticos
```

### Dia 3-7: Frontend MVP
```
[ ] Routing setup (React Router)
[ ] Login/Register
[ ] Dashboard Motorista (básico)
[ ] Dashboard Anunciante (básico)
[ ] Auth flow completo
```

### Semana 2: Integração
```
[ ] API client tipada
[ ] Todos endpoints conectados
[ ] Error handling
[ ] Token refresh
[ ] Swagger/OpenAPI
```

### Semana 3: Features
```
[ ] QR tracking completo
[ ] Rate limiting ativo
[ ] Analytics dashboard
[ ] Tablet app (básica)
```

### Semana 4: Polimento
```
[ ] Security audit
[ ] Performance optimization
[ ] Deployment (Railway)
[ ] Load testing
```

---

## 🚀 KICKOFF RECOMENDADO

### Opção 1: Completo (3 semanas)
Faça tudo em CRÍTICO + IMPORTANTE. Total: MVP sólido.

### Opção 2: Mínimo Viável (1 semana)
1. Setup testes (2 dias)
2. Frontend: login + 2 dashboards (3 dias)
3. Deploy em Railway

### Opção 3: Tablet-First (2 semanas)
1. Testes (2 dias)
2. Tablet app (5 dias)
3. QR tracking (3 dias)
4. Integração (3 dias)

---

## 📊 ESTIMATIVAS DE TEMPO

| Tarefa | Estimativa | Prioridade |
|--------|-----------|-----------|
| Tests | 2-3 dias | 🔴 |
| Frontend telas | 5-7 dias | 🔴 |
| API integration | 3-4 dias | 🔴 |
| QR tracking | 2-3 dias | 🟡 |
| Swagger | 1-2 dias | 🟡 |
| Rate limiting | 1 dia | 🟡 |
| Analytics | 3-4 dias | 🟡 |
| Tablet app | 5-7 dias | 🟡 |
| Payment (Stripe) | 2-3 dias | 🟢 |
| Security audit | 2-3 dias | 🟢 |
| **Total MVP** | **2-3 semanas** | - |

---

## 🎓 RECURSOS/REFERÊNCIAS

- **Design System**: `/DESIGN_SYSTEM.md` (2000+ linhas)
- **API Routes**: `/API_ROUTES.md`
- **Database**: `/DATABASE.md`
- **Schema**: `/prisma/schema.prisma`
- **Seed Data**: `/prisma/seed.ts`
- **Postman**: `/POSTMAN_COLLECTION.json`

---

## ✅ RECOMENDAÇÕES FINAIS

1. **Comece pelos testes** - Instale Jest/Vitest hoje
2. **Frontend é bloqueador** - Não pode testar fluxo completo sem UI real
3. **QR tracking é core** - Sem isso, não é MVP
4. **Deixe payment para depois** - Stripe pode ser manual/mock inicialmente
5. **Deploy cedo** - Railway está ready, faça preview em staging
6. **Segurança agora** - Rate limiting, refresh token, audit logging devem estar antes de produção

**Sugestão**: Dedique a próxima semana a:
- Dia 1-2: Testes
- Dia 3-5: Frontend MVP
- Dia 6-7: Integração + QR

Depois disso, vocês têm um produto que pode ser testado de verdade.

---

**Próxima revisão**: Recomendado em 1-2 semanas
