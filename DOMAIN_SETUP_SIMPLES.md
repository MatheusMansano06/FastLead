# Configurar FASTLEAD.COM.BR - Guia Simples

**Você tem:** Domínio fastlead.com.br  
**Você quer:** Site rodando em fastlead.com.br (em vez de railway.app)  
**Tempo:** 10 minutos  
**Dificuldade:** ⭐ Fácil

---

## O que vai acontecer?

```
Agora:
fastlead-production.up.railway.app → seu site

Depois:
fastlead.com.br → seu site
```

---

## Passo 1: Entrar no Railway

1. Abra https://railway.app
2. Faça login
3. Clique no projeto **FastLead**
4. Clique em ⚙️ **Settings** (canto superior direito)
5. Procure por **Domains** na sidebar esquerda

---

## Passo 2: Adicionar Domínio no Railway

Na aba Domains:

1. Clique no botão azul **+ Add Domain** (ou similar)
2. Digite: `fastlead.com.br`
3. Clique **Add** ou **Confirmar**

Railway vai retornar algo assim:

```
Domain: fastlead.com.br
Status: Pending (aguardando)
Seu CNAME: railway.fastlead.com.br
```

**COPIE O VALOR DO CNAME** (vai precisar em 2 minutos)

---

## Passo 3: Configurar DNS no seu Registrador

Você tem seu domínio em um desses?

### Se está na **GoDaddy:**

1. Abra https://godaddy.com
2. Seu nome → Minhas Contas → Meus Produtos
3. Clique em **fastlead.com.br**
4. Clique em **Gerenciar Domínio**
5. Vá para **DNS**
6. Procure por **CNAME Records** (ou Alias)
7. Clique em **+ Adicionar**
8. Preencha:
   ```
   Nome: @ (ou deixe em branco)
   Aponta para: railway.fastlead.com.br
   TTL: 3600
   ```
9. Salve

### Se está na **Hostinger:**

1. Abra https://hostinger.com
2. Painel de Controle → Domínios
3. Clique em **fastlead.com.br**
4. Vá para **Gerenciador de DNS**
5. Procure por **Registros CNAME**
6. Clique em **+ Adicionar Registro**
7. Preencha:
   ```
   Tipo: CNAME
   Nome: @ (ou www se quiser www.fastlead.com.br)
   Valor: railway.fastlead.com.br
   TTL: 3600
   ```
8. Salve

### Se está na **Registro.br ou outro:**

1. Acesse o painel do seu registrador
2. Procure por **Configurar DNS** ou **DNS Records**
3. Procure por CNAME ou Alias
4. Crie novo registro com:
   ```
   Host: @ (ou www)
   Tipo: CNAME
   Valor: railway.fastlead.com.br
   ```
5. Salve

---

## Passo 4: Esperar Propagação

A configuração leva de **5 minutos a 24 horas** para funcionar.

Durante isso, teste:

```bash
# Abra Terminal/Prompt e digite:
nslookup fastlead.com.br

# Quando retornar um IP (não erro), está pronto!
```

Ou use online:
- https://www.whatsmydns.net/ (copie fastlead.com.br e veja mundialmente)

---

## Passo 5: Validar

Quando propagar, teste no navegador:

```
https://fastlead.com.br
```

Deve carregar seu site!

Se não carregar:

1. **Limpe cache:** Ctrl+Shift+Delete → Limpar
2. **Teste em incognito:** Ctrl+Shift+N
3. **Espere mais:** DNS pode levar 24h

---

## Verificar Pelo Terminal

```bash
# Teste 1: DNS resolve?
nslookup fastlead.com.br
# Deve retornar um IP

# Teste 2: Site abre?
curl https://fastlead.com.br
# Deve retornar HTML (não erro)

# Teste 3: Certificado SSL OK?
curl -I https://fastlead.com.br
# HTTP/2 200 significa ✅
```

Ou execute o script automático:

```bash
chmod +x validate-domain.sh
./validate-domain.sh
```

---

## Se Não Funcionar

### "Domínio não resolve"
- **Solução:** Espere 5-24h para DNS propagar
- Teste com: https://www.whatsmydns.net/

### "ERR_TOO_MANY_REDIRECTS"
- **Solução:** Não configure www AND @ juntos
- Configure apenas um: `@` (fastlead.com.br)

### "SSL certificate error"
- **Solução:** Espere 10 minutos
- Railway gera automaticamente via Let's Encrypt

### "404 - Not Found"
- **Solução:** App não está rodando no Railway
- Verifique: Railway Dashboard → Logs

---

## Checklist Rápido

- [ ] Domínio registrado (fastlead.com.br) ✅
- [ ] Entrei no Railway Dashboard ✅
- [ ] Adicionei domínio na aba Domains ✅
- [ ] Copiei o CNAME ✅
- [ ] Configurei DNS no registrador ✅
- [ ] Testei com `nslookup` ✅
- [ ] Site abre em https://fastlead.com.br ✅

---

## Exemplo Prático (GoDaddy)

### Railway:
```
Settings → Domains → Add Domain
Digite: fastlead.com.br
Copia CNAME: cname.railway.app
```

### GoDaddy:
```
Meus Produtos → fastlead.com.br → Gerenciar
DNS → Adicionar CNAME
Nome: @
Aponta para: cname.railway.app
Salva
```

### Terminal:
```bash
# Após 5-30 min
nslookup fastlead.com.br
# ✅ Retorna IP

# Teste no navegador
https://fastlead.com.br
# ✅ Abre seu site!
```

---

## URLs Que Funcionarão Depois

```
https://fastlead.com.br              ← Seu site
https://www.fastlead.com.br          ← Se configurar www
https://fastlead.com.br/admin        ← Admin dashboard
https://fastlead.com.br/tablet       ← Tablet drivers
https://fastlead.com.br/health       ← API health
```

---

## Dúvidas Comuns

**P: Preciso fazer algo no meu app?**  
R: Não! Só configurar DNS. App continua rodando.

**P: Quanto tempo leva?**  
R: 5 min de configuração + 5-24h de propagação DNS.

**P: SSL vem grátis?**  
R: Sim! Railway com Let's Encrypt automaticamente.

**P: E se eu errar?**  
R: Voltar é fácil. Só desfaz o CNAME e volta ao railway.app.

**P: Funciona com www.fastlead.com.br também?**  
R: Configure outro CNAME com www se quiser (opcional).

---

## Pronto! 🚀

Depois que DNS propagar, acesse:
```
https://fastlead.com.br
```

E seu site está no ar com domínio próprio! 🎉

---

**Tá com dúvida em qual passo?** Me avisa que te ajudo! 📞
