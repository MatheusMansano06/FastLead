# FastLead Dashboard Anunciante

Dashboard premium para anunciantes gerenciarem campanhas publicitárias em tablets de táxis.

## Stack Tecnológico

- **React 18.x** - UI Framework
- **Vite** - Build tool (HMR, otimizações)
- **TailwindCSS 3.x** - Utility CSS
- **Zustand** - State management
- **Axios** - HTTP client
- **React Router v6** - Navigation

## Instalação Rápida

```bash
# Instalar dependências
npm install

# Iniciar desenvolvimento
npm run dev
```

Acesse `http://localhost:5173`

## Páginas Implementadas

- **Login** - Autenticação com email + senha
- **Register** - Cadastro de anunciantes
- **Dashboard** - Overview com KPIs e campanhas ativas
- **Criar Campanha** - Form com upload de imagem e estimativas
- **Minhas Campanhas** - Tabela com filtros, ordenação e ações
- **Leads** - Lista de leads com filtros e exportação CSV
- **Perfil** - Configurações, segurança e API keys

## Estrutura

```
src/
├── components/   # Button, Card, Input, Alert, KPICard, Navbar, Sidebar
├── pages/        # Login, Register, Dashboard, CreateCampaign, Campaigns, Leads, Profile
├── stores/       # authStore, campaignStore, leadsStore (Zustand)
├── services/     # api.ts (Axios + interceptors)
├── types/        # TypeScript types
└── styles/       # Tailwind globals.css
```

## Componentes Disponíveis

- **Button** - 6 variantes (primary, secondary, outline, ghost, danger, success)
- **Card** - Container com sombra e hover
- **Input** - Com label, validação e helper text
- **Alert** - Notificações (success, error, warning, info)
- **KPICard** - Cards de métricas com trending
- **Navbar** - Barra superior sticky
- **Sidebar** - Menu lateral com navegação

## Features

- ✅ Autenticação com JWT
- ✅ State management com Zustand
- ✅ Integração API com Axios
- ✅ Dark mode nativo
- ✅ Responsivo (mobile, tablet, desktop)
- ✅ Componentes premium e acessíveis
- ✅ Validação de formulários
- ✅ Upload de imagens
- ✅ Exportação CSV
- ✅ KPIs e gráficos

## Desenvolvimento

```bash
npm run dev        # Desenvolvimento com HMR
npm run build      # Build para produção
npm run preview    # Preview do build
npm run lint       # ESLint check
```

## Variáveis de Ambiente

```env
VITE_API_URL=http://localhost:3000
```

## Design System

- **Cores**: Azul profundo (#1B3B9C) + Laranja vibrante (#FF6B35)
- **Tipografia**: Poppins (display) + Inter (body) + Fira Code (mono)
- **Espacings**: xs, sm, md, lg, xl, 2xl, 3xl, 4xl
- **Elevações**: elevation-1 a elevation-4
- **Animações**: fade-in, slide-in-right, pulse-soft

## Deploy

```bash
npm run build     # Cria pasta dist/
```

Pronto para Vercel, Netlify ou qualquer servidor estático.

## Suporte

contato@fastlead.com
