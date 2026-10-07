# Configurar FASTLEAD.COM.BR no Registro.br para Railway

**Seu Registrador:** Registro.br  
**Seu Domínio:** fastlead.com.br (Publicado ✅)  
**Objetivo:** Apontar para Railway  
**Tempo:** 5 minutos

---

## Passo 1: Ir para Configurar DNS no Registro.br

1. Já está em https://registro.br/painel/ (vimos na screenshot)
2. Clique no seu domínio: **FASTLEAD.COM.BR**
3. Você verá a página de detalhes do domínio

---

## Passo 2: Acessar Configuração de DNS

Na página do domínio, procure por:
- **"Configurar DNS"** ou
- **"Registros de Recursos"** ou
- **"DNS"** ou
- **"Editar Zona de DNS"**

**Opções comuns:**
```
Painel → Meus Domínios → FASTLEAD.COM.BR → Editar Zona / DNS / Registros
```

Clique nela.

---

## Passo 3: Adicionar Registro CNAME

Você vai ver uma tela assim:

```
┌─────────────────────────────────────┐
│ Registros de Zona                   │
├─────────────────────────────────────┤
│ Tipo | Nome | Valor                 │
├─────────────────────────────────────┤
│ A    | @    | [IP atual]            │
│ MX   | @    | ...                   │
└─────────────────────────────────────┘
```

**Clique em "Novo Registro" ou "+Adicionar"**

Preencha assim:

```
Tipo:    CNAME
Nome:    @ (ou deixe em branco)
Valor:   railway.app (ou o CNAME que Railway forneceu)
TTL:     3600
```

**Se Railway pediu um CNAME específico:**
```
Tipo:    CNAME
Nome:    @
Valor:   [aquele que Railway forneceu]
TTL:     3600
```

---

## Passo 4: Salvar

1. Clique **"Salvar"** ou **"Confirmar"** ou **"Adicionar"**
2. Você verá mensagem: "Registro adicionado com sucesso"

**Pronto!** O DNS foi atualizado.

---

## Passo 5: Validar no Railway

Volte para Railway e verifique:

1. Acesse https://railway.app
2. Seu projeto FastLead
3. Settings → Domains
4. Seu domínio deve estar:
   ```
   Status: ✅ Active (verde)
   ```

Se ainda estiver "Pending", espere 5-30 minutos.

---

## Passo 6: Testar no Navegador

Após validação no Railway:

```
https://fastlead.com.br
```

Deve carregar seu site! 🎉

---

## Se Não Funcionar

### Opção A: Usando "Novo Servidor DNS" (Alternativo)

Se o CNAME não funcionar, tente apontar os nameservers:

1. No Registro.br, procure por **"Alterar Servidores de DNS"**
2. Remova os nameservers atuais
3. Adicione os do Railway (se fornecidos)

Mas **CNAME é mais simples**, tente isso primeiro.

### Opção B: Testar Propagação

```bash
# No terminal
nslookup fastlead.com.br

# Deve retornar algo como:
# Server: 8.8.8.8
# Address: 8.8.8.8#53
# Non-authoritative answer:
# Name: fastlead.com.br
# Address: 123.45.67.89  ← Este IP
```

Se retornar o IP do Railway, está funcionando! ✅

---

## Passo-a-Passo Visual (Registro.br)

```
1. Registro.br Painel
   ↓
2. Clique em FASTLEAD.COM.BR
   ↓
3. Procure por "Editar Zona" ou "DNS"
   ↓
4. Novo Registro CNAME:
   - Tipo: CNAME
   - Nome: @ (raiz)
   - Valor: railway.app
   - TTL: 3600
   ↓
5. Salvar
   ↓
6. Esperar 5-30 min
   ↓
7. Testar: https://fastlead.com.br
```

---

## Checklist Registro.br

- [ ] Loguei em registro.br/painel ✅
- [ ] Cliquei no domínio FASTLEAD.COM.BR ✅
- [ ] Achei "Editar Zona" ou "DNS" ✅
- [ ] Adicionei registro CNAME com @ ✅
- [ ] Salvei ✅
- [ ] Esperei 5-30 min ✅
- [ ] Testei https://fastlead.com.br ✅

---

## Dúvidas Registro.br?

### P: Preciso remover o A Record antigo?
R: Não necessário. O CNAME vai sobrescrever.

### P: Onde vejo meu CNAME na Railway?
R: Settings → Domains → Seu domínio → CNAME Value

### P: Quanto tempo leva?
R: 5-30 minutos. Máximo 24h em casos raros.

### P: Posso fazer isso agora?
R: Sim! Leva menos de 5 minutos.

---

## Próximo: Validar Tudo

Depois que propagar, execute:

```bash
./validate-domain.sh
```

Ele testa tudo automaticamente:
- DNS resolve ✅
- HTTP funciona ✅
- HTTPS funciona ✅
- Certificado SSL ✅
- API responde ✅

---

## Railways Precisa De?

Se Railway pedir algo, me avisa. Geralmente é só:
1. Domínio customizado no painel
2. CNAME para apontar
3. Pronto!

---

**Bora começar?** 🚀

Qual é o valor que Railway forneceu para o CNAME? (apareça na tela de "Add Domain" do Railway)

Assim dou exatamente o que copiar.
