# Quick Start - FastLead Dashboard Anunciante

Guia rápido para começar a usar o dashboard.

## Setup (2 minutos)

```bash
# 1. Entrar na pasta
cd frontend

# 2. Instalar dependências
npm install

# 3. Iniciar servidor
npm run dev
```

Abra http://localhost:5173 no navegador.

## Primeiro Acesso

### 1. Fazer Login ou Criar Conta

```
URL: http://localhost:5173/login
ou
URL: http://localhost:5173/register
```

**Credenciais de teste:**
```
Email: teste@fastlead.com
Senha: SenhaSegura123
```

Se usar credenciais de teste, o backend deve ter este usuário pré-criado.

### 2. Dashboard

Após login, você vai para o dashboard com:
- KPIs (campanhas ativas, leads, ROI)
- Campanhas ativas em tabela
- Botão "+ Nova Campanha"

### 3. Criar Primeira Campanha

Clique em "+ Nova Campanha" e preencha:

```
Nome: Promoção de Verão
Descrição: Sua descrição aqui
Imagem: Selecione um arquivo
Táxis: 50
Duração: 7 dias
Preço/Lead: R$ 50
Orçamento: R$ 1000
```

**Preview em tempo real:**
- Imagem aparece no preview
- Leads estimados: 20 (R$ 1000 / R$ 50)
- ROI estimado: 1900% (simulado)

Clique em "Criar Campanha" → vai para /campaigns

### 4. Minhas Campanhas

Tabela mostra:
- Nome da campanha
- Status (Ativa, Pausada, Finalizada)
- Leads gerados
- ROI
- Orçamento

**Ações:**
- Ver Leads
- Pausar/Retomar
- Ordenar por data/leads/ROI
- Filtrar por status

### 5. Leads

Lista todos os leads de todas as campanhas:
- Data/hora
- Campanha
- Motorista
- Status (Convertido/Aguardando)

**Filtrar:**
- Por campanha
- Ordenação

**Exportar:**
- Botão "Exportar CSV" baixa arquivo

### 6. Perfil

Seu perfil com:
- Email
- Tipo de usuário (Anunciante)
- ID da conta
- Configurações de segurança (futuro)
- API keys (futuro)

## Fluxo Completo

```
1. Login
   ↓
2. Dashboard (visualiza overview)
   ↓
3. Criar Campanha (configura primeira campanha)
   ↓
4. Minhas Campanhas (gerencia campanhas)
   ↓
5. Ver Leads (acompanha leads)
   ↓
6. Pausar campanha (quando necessário)
   ↓
7. Exportar dados (relatório)
```

## Componentes Principais

### Dashboard
```jsx
// KPIs automáticos
<KPICard
  title="Campanhas Ativas"
  value={5}
  icon="📊"
/>

// Tabela dinâmica
campaigns.map(c => <CampaignRow key={c.id} />)
```

### Criar Campanha
```jsx
// Form com validação
<Input label="Nome" />
<Input label="Descrição" type="textarea" />
<Input label="Imagem" type="file" />

// Preview
{preview && <img src={preview} />}

// Estimativas
Leads: {budget / pricePerLead}
ROI: {((leads * 100) - budget) / budget}%
```

### Campanhas
```jsx
// Filtros
<select value={filter}>
  <option value="all">Todas</option>
  <option value="active">Ativas</option>
</select>

// Ordenação
<select value={sortBy}>
  <option value="date">Data</option>
  <option value="leads">Leads</option>
  <option value="roi">ROI</option>
</select>

// Tabela
campaigns.map(c => <tr>
  <td>{c.name}</td>
  <td>{getStatus(c.status)}</td>
  <td>{c.leads}</td>
  <td>{c.roi}%</td>
</tr>)
```

### Leads
```jsx
// Filtro por campanha
<select value={filterCampaign}>
  {campaigns.map(c => <option value={c.id}>{c.name}</option>)}
</select>

// Estatísticas
Total: {leads.length}
Convertidos: {leads.filter(l => l.converted).length}
Taxa: {(convertidos/total*100)}%

// Tabela
leads.map(l => <tr>
  <td>{l.timestamp}</td>
  <td>{l.campaignName}</td>
  <td>{l.driverName}</td>
  <td>{l.converted ? '✓' : '⏳'}</td>
</tr>)

// Exportar
<Button onClick={handleExportCSV}>
  Exportar CSV
</Button>
```

## Variáveis de Ambiente

**.env**
```env
VITE_API_URL=http://localhost:3000
```

Mude se o backend estiver em outro lugar:
```env
VITE_API_URL=https://api.fastlead.com
```

## Autenticação

Token JWT é armazenado em localStorage:
```javascript
localStorage.getItem('auth_token')
```

É enviado em cada request:
```
Authorization: Bearer <token>
```

Auto-refresh quando expira (transparente).

## Troubleshooting Rápido

### "API não responde"
```bash
# Certifique-se que o backend está rodando
# Verifique VITE_API_URL no .env
# Backend deve estar em http://localhost:3000
```

### "Erro ao fazer upload de imagem"
```bash
# Imagem deve ser < 5MB
# Formatos: PNG, JPG, WebP
# Backend deve ter endpoint POST /advertiser/campaigns
```

### "Leads não aparecem"
```bash
# Aguarde que leads sejam gerados pelo backend
# Verifique se campaignId está correto
# Tente refetch com F5
```

### "Login não funciona"
```bash
# Verifique credenciais
# Backend deve ter endpoint POST /auth/login
# Verifique CORS no backend
```

## Scripts Úteis

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Lint
npm run lint

# Preview do build
npm run preview

# Limpar dados
# No browser console:
localStorage.clear()
```

## Testar Fluxo Completo

1. **Abrir devtools** (F12)
2. **Ir para Network tab**
3. **Login** → ver requisição POST /auth/login
4. **Criar Campanha** → ver requisição POST /advertiser/campaigns
5. **Ver Campanhas** → ver requisição GET /advertiser/campaigns
6. **Ver Leads** → ver requisição GET /advertiser/leads

Todos os requests devem ter:
```
Authorization: Bearer <seu-token>
```

## Sugestões de Dados de Teste

### Campanhas
- **Nome**: Promoção de Verão 2024
- **Descrição**: Conheça nossos novos produtos!
- **Táxis**: 50-100
- **Duração**: 7-30 dias
- **Orçamento**: R$ 500-5000
- **Preço/Lead**: R$ 25-100

### Análise de Performance
- ROI esperado: 50-200% (dependendo do preço)
- Taxa de conversão: 10-20%
- Leads esperados: orçamento ÷ preço por lead

## Próximos Passos

- [ ] Explorar Dashboard
- [ ] Criar primeira campanha
- [ ] Acompanhar leads
- [ ] Exportar dados
- [ ] Pausar campanha
- [ ] Alterar configurações no Perfil

## Dúvidas?

Contate: suporte@fastlead.com

---

**Versão**: 1.0
**Última atualização**: 2024
**Status**: Production Ready
