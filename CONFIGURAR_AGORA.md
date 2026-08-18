# ⚡ CONFIGURAR DOMÍNIO AGORA - 3 MINUTOS

**Siga EXATAMENTE os passos. Clique onde indicado.**

---

## PASSO 1: Railway (Você já está lá!)

### Na tela que você vê agora:

**Campo de texto:** `fastlead.com.br`
- [ ] Clique no campo de texto "example.com"
- [ ] Limpe (Ctrl+A, Delete)
- [ ] Digite: `fastlead.com.br`

**Dropdown:** "Select a port"
- [ ] Clique no dropdown
- [ ] Escolha: **80** (HTTP)

**Botão roxo:** "Add Domain"
- [ ] Clique nele

---

## PASSO 2: Copiar CNAME

Depois que clicar "Add Domain", vai aparecer uma modal:

```
┌─────────────────────────────────────┐
│ Configure DNS Records               │
│                                     │
│ CNAME @ → vp66qnwe.up.railway.app  │
│ TXT _railway-verify → railway-...   │
└─────────────────────────────────────┘
```

**COPIE ISTO:**
```
vp66qnwe.up.railway.app
```

(Use Ctrl+C para copiar, ou copia na mão mesmo)

---

## PASSO 3: Ir pro Registro.br

- [ ] Abra **nova aba**
- [ ] Digite: `registro.br/painel/`
- [ ] Já está logado lá (vimos na screenshot)

---

## PASSO 4: Entrar no Domínio

Na página do painel:
- [ ] Procure por **FASTLEAD.COM.BR** na lista
- [ ] Clique nele

---

## PASSO 5: Adicionar Registro CNAME

Na página do domínio:
- [ ] Procure por botão **"Editar Zona"** ou **"Editar DNS"** ou **"Registros"**
- [ ] Clique nele

Vai abrir uma página com registros (A, MX, etc):
- [ ] Procure por botão **"Novo Registro"** ou **"+"** ou **"Adicionar"**
- [ ] Clique nele

Vai aparecer um formulário:

```
Tipo:     [dropdown]
Nome:     [campo]
Valor:    [campo]
TTL:      [campo]
```

**PREENCHA ASSIM:**

```
Tipo:     CNAME
Nome:     @ (ou deixe em branco)
Valor:    vp66qnwe.up.railway.app  ← COLA AQUI
TTL:      3600
```

- [ ] Clique em **Salvar** ou **Confirmar**

---

## PASSO 6: Adicionar Registro TXT (Verificação)

Volta na lista de registros:
- [ ] Clique em **"Novo Registro"** de novo

```
Tipo:     [dropdown]
Nome:     [campo]
Valor:    [campo]
TTL:      [campo]
```

**PREENCHA ASSIM:**

```
Tipo:     TXT
Nome:     _railway-verify
Valor:    railway-verify=df376826570e9e83467a9a962f... 
          (copia TUDO que está na modal do Railway)
TTL:      3600
```

- [ ] Clique em **Salvar** ou **Confirmar**

---

## PASSO 7: Validar

Volta pro Railway (aba anterior):
- [ ] Espera 10 segundos
- [ ] Modal pode fechar automaticamente ou clica **Dismiss**
- [ ] Procura por **Status: Active** (verde) ✅

Se não aparecer:
- [ ] Espera 5-10 minutos
- [ ] Recarrega a página (F5)

---

## PASSO 8: Testar

No navegador:
- [ ] Abra **nova aba**
- [ ] Digite: `https://fastlead.com.br`
- [ ] Pressione Enter
- [ ] Deve carregar seu site! ✅

---

## Checklist Rápido

- [ ] Adicionou domínio no Railway
- [ ] Copiou CNAME do Railway
- [ ] Entrou no Registro.br
- [ ] Clicou em editar zona/DNS
- [ ] Adicionou 1º registro CNAME
- [ ] Adicionou 2º registro TXT
- [ ] Validou no Railway (Status: Active)
- [ ] Testou https://fastlead.com.br

---

## Se der erro em algum lugar

**"Campo de texto não deixa digitar"**
→ Clique dentro do campo primeiro (uma vez)

**"Não acho o botão de Editar Zona"**
→ Procura por "DNS", "Registros", "Zona", "Editar"

**"TXT não aceita o valor inteiro"**
→ Tira "railway-verify=" do começo, só cola:
```
df376826570e9e83467a9a962f...
```

**"Status não muda para Active"**
→ Espera 10-15 minutos e recarrega (F5)

---

## Tá pronto?

**VAI AGORA!** 🚀

Segue os 8 passos em ordem e pronto! Se travar em algum passo, manda print que resolvo.
