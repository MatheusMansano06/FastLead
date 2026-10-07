# Configurar Domínio FASTLEAD.COM.BR no Railway

**Objetivo:** Apontar seu domínio próprio para o app que está no Railway  
**Tempo:** 10-15 minutos  
**Custaria:** ~R$0 (Railway faz redirect automático)

---

## Pré-requisitos

- ✅ Domínio `fastlead.com.br` registrado e ativo
- ✅ App rodando no Railway (backend + frontend)
- ✅ Acesso à conta Railway
- ✅ Acesso ao painel do seu registrador de domínio

---

## Passo 1: Encontrar URL Atual no Railway

### Via Railway Dashboard

1. Acesse https://railway.app
2. Login com sua conta
3. Selecione projeto **FastLead**
4. Clique em **Settings** (⚙️)
5. Procure por **Domains**

Você verá algo como:
```
fastlead-api-production.up.railway.app
fastlead-frontend-production.up.railway.app
```

Se o app está em um único serviço:
```
fastlead-production.up.railway.app
```

Anote isso → **RAILWAY_URL**

### Via CLI (Alternativo)

```bash
railway domain list
# Mostra domínios atuais do projeto
```

---

## Passo 2: Adicionar Domínio no Railway

### A. Criar Domínio Customizado

1. **Railway Dashboard** → Seu app → **Settings**
2. Procure por **Domains** ou **Custom Domain**
3. Clique em **+ Add Domain** ou **+ New Domain**
4. Digite: `fastlead.com.br`
5. Clique **Add**

Railway vai exibir:
```
Domain: fastlead.com.br
Status: Pending (aguardando DNS)
CNAME: railway.fastlead.com.br (ou similar)
```

Copie o **CNAME target** → **RAILWAY_CNAME**

### B. Via CLI

```bash
railway domain add fastlead.com.br
# Retorna: CNAME target do Railway
```

---

## Passo 3: Configurar DNS

**Você tem 2 opções:**

### Opção A: CNAME (Recomendado para subdomínios)

Se quer `api.fastlead.com.br`:

1. Acesse painel do seu registrador (GoDaddy, Hostinger, Registro.br, etc)
2. Vá para **DNS Records** ou **Registros DNS**
3. Procure por **CNAME** ou **Alias**
4. Crie novo registro:
   ```
   Tipo: CNAME
   Host/Subdomain: api
   Value/Target: railway.fastlead.com.br
   (ou o CNAME que Railway forneceu)
   TTL: 3600
   ```
5. Salve

**Resultado:** `api.fastlead.com.br` → Railway

---

### Opção B: A Record (Para root domain)

Se quer `fastlead.com.br` (sem subdomínio):

1. Acesse painel do registrador
2. Vá para **DNS Records**
3. Procure pelo **A Record** da root (pode aparecer como `@`)
4. Você precisa do **IP do Railway**:

```bash
# Via terminal
nslookup railway.fastlead.com.br
# Retorna: IPv4 Address (ex: 123.45.67.89)
```

5. Crie/edite o A Record:
   ```
   Tipo: A
   Host: @ (root)
   Value: [IP retornado acima]
   TTL: 3600
   ```
6. Salve

**Resultado:** `fastlead.com.br` → Railway

---

### Opção C: Hybrid (Melhor Prática)

Use ambos para máxima compatibilidade:

```
CNAME/A Record (root):
  fastlead.com.br → Railway

CNAME (www):
  www.fastlead.com.br → railway.fastlead.com.br
```

---

## Passo 4: Validar Configuração

### Verificar DNS (1-24 horas)

```bash
# Teste DNS propagation
nslookup fastlead.com.br
# Deve retornar IP ou CNAME do Railway

# Ou use online tool:
# https://mxtoolbox.com/MXLookup.aspx
```

### Verificar Conexão

```bash
# Teste se resolve
curl -I https://fastlead.com.br
# Deve retornar código 200/301 (não erro 404)

# Teste frontend
curl -I https://fastlead.com.br
# Deve carregar página inicial

# Teste backend
curl -I https://fastlead.com.br/health
# Deve retornar health check
```

### Railway Dashboard

Railway vai mostrar:
```
Domain: fastlead.com.br
Status: ✅ Active (verde)
```

---

## Passo 5: SSL/TLS (Automático)

Railway autentica SSL automaticamente via Let's Encrypt:

1. Assim que DNS propagar, Railway detecta o domínio
2. Certificate é gerado automaticamente (2-10 min)
3. Seu site fica seguro: `https://fastlead.com.br` ✅

Você verá no Railway:
```
Domain: fastlead.com.br
SSL: ✅ Verified (verde)
Certificate: Let's Encrypt
Expiration: [data]
```

---

## Troubleshooting

### Problema: "Status: Pending" por >24h

**Solução:**
1. Verifique se CNAME/A foi configurado corretamente
2. Espere propagação DNS (até 48h no pior caso)
3. Limpe cache do browser: `Ctrl+Shift+Delete`
4. Teste em incognito: `Ctrl+Shift+N`

```bash
# Verificar propagação
dig fastlead.com.br
# Deve mostrar novo IP/CNAME
```

### Problema: "ERR_TOO_MANY_REDIRECTS"

**Causa:** Loop de redirects (www ↔ non-www)

**Solução:**
1. Verifique ambos resolvem:
   ```bash
   curl -I https://fastlead.com.br
   curl -I https://www.fastlead.com.br
   ```
2. Configure um redirect no Railway ou Cloudflare (veja abaixo)

### Problema: SSL Certificate Error

**Solução:**
1. Espere 10 minutos (Let's Encrypt ainda está processando)
2. Limpe cache: `Ctrl+F5`
3. Se persistir >1h: Entre em contato com Railway Support

---

## Opção: Usar Cloudflare (BONUS)

Se quer performance extra + proteção DDoS:

1. Acesse https://cloudflare.com
2. Signup gratuito
3. Adicione seu domínio
4. Copie nameservers do Cloudflare
5. No registrador, troque os **nameservers** para:
   - `ns1.cloudflare.com`
   - `ns2.cloudflare.com`
6. Em Cloudflare, crie CNAME:
   ```
   Name: fastlead.com.br
   Target: railway.fastlead.com.br
   Proxy: Proxied (para segurança)
   ```
7. Vá para **SSL/TLS** → **Flexible** (Railway cuida do HTTPS)

**Benefícios:**
- ✅ Cache automático
- ✅ Proteção DDoS
- ✅ Analítica de tráfego
- ✅ Email mascarado
- ✅ Tudo grátis

---

## Checklist Final

- [ ] Domínio registrado (fastlead.com.br)
- [ ] App rodando no Railway
- [ ] Acessei Railway Dashboard
- [ ] Adicionei domínio customizado no Railway
- [ ] Copiei CNAME/A Record do Railway
- [ ] Acessei painel do registrador
- [ ] Criei registro DNS (CNAME ou A)
- [ ] DNS propagou (testei com `nslookup`)
- [ ] HTTPS funciona (certificado gerado)
- [ ] Testei site inteiro

---

## URLs Finais

Após configuração, você terá:

```
https://fastlead.com.br              ✅ Homepage
https://fastlead.com.br/admin        ✅ Admin Dashboard
https://fastlead.com.br/tablet       ✅ Tablet (drivers)
https://api.fastlead.com.br/health   ✅ API Health
```

---

## Resumo Rápido

| Passo | O quê | Onde | Tempo |
|-------|-------|------|-------|
| 1 | Encontrar URL Railway | Railway Dashboard | 1 min |
| 2 | Adicionar domínio | Railway Settings | 2 min |
| 3 | Configurar DNS | Registrador | 3 min |
| 4 | Validar | Terminal + Browser | 5 min |
| 5 | SSL automático | Railway cuida | 5 min |

**Total:** 15 minutos (+ 1-24h de propagação DNS)

---

## Exemplo Passo-a-Passo (GoDaddy)

### No Railway:
1. Settings → Domains → Add Domain
2. Digite: `fastlead.com.br`
3. Copie CNAME: `cname.railway.app`

### Na GoDaddy:
1. Manage Domains → fastlead.com.br
2. DNS Records
3. CNAME (criar novo):
   - Name: `@`
   - Value: `cname.railway.app`
   - Save

### Validar:
```bash
nslookup fastlead.com.br
# Deve retornar railway.app IP

curl https://fastlead.com.br
# Deve carregar site
```

---

## Precisa de Suporte?

- **Railway Docs:** https://docs.railway.app/guides/custom-domains
- **Cloudflare Docs:** https://developers.cloudflare.com/domain-registration/
- **Registro.br:** https://www.registro.br/

---

**Tá tudo pronto?** Avisa quando configurar que testo aqui se funcionou! 🚀
