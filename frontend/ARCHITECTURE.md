# FastLead Dashboard Anunciante - Arquitetura

## Visão Geral

Dashboard premium React para gerenciamento de campanhas publicitárias em tablets de táxis.

### Stack Técnico

- **Frontend**: React 18 + Vite + TailwindCSS
- **State Management**: Zustand
- **HTTP Client**: Axios com interceptors
- **Roteamento**: React Router v6
- **Tipagem**: TypeScript types
- **Build**: Vite com HMR

## Arquitetura em Camadas

```
┌─────────────────────────────────────┐
│      Pages / Containers             │  ← Lógica de negócio, orquestração
├─────────────────────────────────────┤
│      Stores (Zustand)               │  ← State management
├─────────────────────────────────────┤
│      Services (API Client)          │  ← Chamadas HTTP
├─────────────────────────────────────┤
│      Components (Presentational)    │  ← UI reutilizável
├─────────────────────────────────────┤
│      Styles (TailwindCSS)           │  ← Design tokens
└─────────────────────────────────────┘
```

## Fluxo de Dados

```
User Interaction
      ↓
Page/Component
      ↓
Zustand Store (dispatch action)
      ↓
API Client (Axios)
      ↓
Backend API
      ↓
API Response
      ↓
Zustand Store (update state)
      ↓
Component Re-render
```

## Estrutura de Diretórios

### `/src/pages`
Containers que representam rotas. Cada página:
- Gerencia seu próprio fluxo de dados
- Usa stores para estado compartilhado
- Compõe componentes reutilizáveis
- Trata autenticação e proteção de rotas

**Páginas**:
1. `Login.jsx` - Autenticação
2. `Register.jsx` - Cadastro
3. `Dashboard.jsx` - Overview principal
4. `CreateCampaign.jsx` - Criar campanha (crítica)
5. `Campaigns.jsx` - Listar campanhas
6. `Leads.jsx` - Listar leads
7. `Profile.jsx` - Perfil do usuário

### `/src/components`
Componentes reutilizáveis sem lógica de negócio:
- `Button.jsx` - 6 variantes
- `Card.jsx` - Container base
- `Input.jsx` - Field com validação
- `Alert.jsx` - Notificações
- `KPICard.jsx` - Card de métrica
- `Navbar.jsx` - Barra superior
- `Sidebar.jsx` - Menu lateral

### `/src/stores`
Zustand stores para state management global:

**authStore.ts**
- `user: User | null`
- `isAuthenticated: boolean`
- `login(payload)`
- `register(payload)`
- `logout()`

**campaignStore.ts**
- `campaigns: Campaign[]`
- `analytics: Analytics | null`
- `fetchCampaigns()`
- `createCampaign(data)`
- `updateCampaign(id, data)`
- `fetchAnalytics()`

**leadsStore.ts**
- `leads: Lead[]`
- `fetchLeads(page, limit)`

### `/src/services`
**api.ts** - Cliente HTTP com Axios
- Interceptors para autenticação (JWT)
- Auto-refresh de tokens
- Tratamento de erros
- Métodos para cada endpoint

Estrutura:
```typescript
export const apiClient = {
  // Auth
  login(),
  register(),
  logout(),
  
  // Advertiser
  getProfile(),
  getCampaigns(),
  createCampaign(),
  updateCampaign(),
  getCampaignAnalytics(),
  getLeads(),
  
  // Token management
  setToken(),
  getToken(),
}
```

### `/src/types`
**index.ts** - Tipos TypeScript para:
- User, AuthResponse, LoginPayload, RegisterPayload
- Campaign, CreateCampaignPayload, CampaignsResponse
- Lead, LeadsResponse
- Analytics, AnalyticsResponse
- ApiResponse, ApiError

### `/src/styles`
**globals.css** - Estilos globais:
- Import de fonts (Inter, Poppins, Fira Code)
- Tailwind directives
- Reset e base styles
- Scrollbar customizado
- Animações

## Fluxo de Autenticação

```
1. User Acessa /login
   ↓
2. Submit Form
   ↓
3. authStore.login()
   ↓
4. apiClient.login() [POST /auth/login]
   ↓
5. Backend retorna { token, refreshToken, user }
   ↓
6. localStorage.setItem('auth_token', token)
   ↓
7. authStore.isAuthenticated = true
   ↓
8. Navigate to /dashboard
   ↓
9. ProtectedRoute valida isAuthenticated
   ↓
10. Após expiração do token:
    - Interceptor detecta 401
    - Tenta refresh com refreshToken
    - Atualiza token
    - Retry da requisição original
```

## Fluxo de Campanhas

### Criar Campanha
```
CreateCampaign.jsx
   ↓
Form submission
   ↓
campaignStore.createCampaign(data)
   ↓
apiClient.createCampaign(FormData with image)
   ↓
POST /advertiser/campaigns
   ↓
Backend cria e retorna campaign
   ↓
campaignStore refetch campaigns
   ↓
Navigate to /campaigns
```

### Listar Campanhas
```
Campaigns.jsx
   ↓
useEffect → campaignStore.fetchCampaigns()
   ↓
apiClient.getCampaigns(page, limit)
   ↓
GET /advertiser/campaigns?page=1&limit=10
   ↓
Backend retorna { campaigns, total }
   ↓
campaignStore.campaigns = campaigns
   ↓
Render tabela com filtros e ordenação local
```

## Fluxo de Leads

```
Leads.jsx
   ↓
useEffect → leadsStore.fetchLeads()
   ↓
apiClient.getLeads(page, limit)
   ↓
GET /advertiser/leads?page=1&limit=20
   ↓
Backend retorna { leads, total }
   ↓
leadsStore.leads = leads
   ↓
Render tabela com filtros
   ↓
handleExportCSV()
   ↓
Generate e download CSV
```

## Decisões de Design

### 1. Zustand para State Management
- Simples e intuitivo
- Sem boilerplate (Redux/Context)
- Ideal para apps médios
- Suporta devtools

### 2. TailwindCSS para Styling
- Utility-first CSS
- Customização via tailwind.config.js
- Suporte nativo a dark mode
- Menor bundle size

### 3. React Router v6
- Roteamento declarativo
- Protected routes pattern
- Lazy loading suportado
- Nested routes

### 4. Axios com Interceptors
- Auto-refresh de tokens
- Tratamento centralizado de erros
- Retry logic
- Request/response normalization

### 5. TypeScript Types (sem compilação)
- Melhor DX com intellisense
- Validação em desenvolvimento
- Documentação inline
- Sem overhead de compilação

## Performance

### Code Splitting
- React Router lazy loading automático
- Vite chunks optimization
- Dynamic imports por rota

### Caching
- localStorage para tokens
- Zustand reativo (não re-renderiza se não muda)
- Axios cache headers

### Otimizações
- Lazy loading de imagens
- Memoization com React.memo (quando necessário)
- Virtual scrolling para listas grandes (futura)

## Segurança

### Autenticação
- JWT tokens em localStorage (XSS safe com CSP)
- Auto-refresh tokens
- Logout clears localStorage

### CORS
- Backend deve ter CORS configurado
- VITE_API_URL aponta ao backend

### Validação
- Client-side com Zustand stores
- Server-side no backend (não confiamos no cliente)

## Escalabilidade

### Para adicionar nova feature:

1. **Tipo**: `src/types/index.ts` → add novo tipo
2. **Store**: `src/stores/novoStore.ts` → criar store
3. **API**: `src/services/api.ts` → add método
4. **Componente**: `src/components/Novo.jsx` → criar
5. **Página**: `src/pages/Nova.jsx` → criar
6. **Rota**: `src/App.jsx` → add rota

### Para refatorar componentes:

1. Extrair lógica em hooks customizados
2. Mover styled-components para Tailwind classes
3. Dividir em sub-componentes menores
4. Documentar com JSDoc

## Testing (Futura)

### Estrutura sugerida:
```
src/__tests__/
├── components/
├── pages/
├── stores/
└── services/
```

### Ferramentas:
- Vitest (Vite-native)
- React Testing Library
- Msw (mock service worker)

## Deployment

### Build
```bash
npm run build  # → dist/
```

### Hosting
- Vercel (melhor integração com Vite)
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

### CI/CD (Sugerido)
```yaml
on: [push]
jobs:
  build:
    - npm install
    - npm run build
    - npm run lint
  deploy:
    - if: main branch
    - deploy to hosting
```

## Roadmap Futuro

- [ ] Setup Vitest + RTL para testes
- [ ] Storybook para documentação de componentes
- [ ] Temas customizáveis
- [ ] Internacionalização (i18n)
- [ ] Analytics (Google Analytics)
- [ ] Sentry para error tracking
- [ ] Virtual scrolling para listas
- [ ] Offline mode com Service Workers
- [ ] PWA capabilities
- [ ] Dark mode toggle no UI

## Troubleshooting

### CORS Error
Backend precisa ter CORS habilitado:
```javascript
app.use(cors({ origin: 'http://localhost:5173' }))
```

### Token Refresh Loop
Verificar se `refreshToken` é válido no backend.

### Blank Page
Verificar:
1. Console para erros
2. Network tab para 404/500
3. localStorage para token

### HMR não funciona
Reiniciar: `npm run dev`

## Contato

Para dúvidas sobre arquitetura: tech@fastlead.com
