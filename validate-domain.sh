#!/bin/bash
# Validar configuração do domínio fastlead.com.br no Railway

echo "🔍 Validando configuração de domínio..."
echo ""

DOMAIN="fastlead.com.br"

# 1. Verificar se o domínio resolve
echo "1️⃣  Verificando resolução DNS..."
if nslookup $DOMAIN > /dev/null 2>&1; then
    IP=$(nslookup $DOMAIN | grep "Address:" | tail -1 | awk '{print $2}')
    echo "✅ Domínio resolve: $DOMAIN → $IP"
else
    echo "❌ Domínio NÃO resolve. Espere propagação DNS (até 48h)"
    exit 1
fi

echo ""

# 2. Verificar HTTP (redirecionará para HTTPS)
echo "2️⃣  Testando HTTP..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN --max-time 5)
if [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✅ HTTP funciona (status: $HTTP_CODE)"
else
    echo "❌ HTTP retornou: $HTTP_CODE"
fi

echo ""

# 3. Verificar HTTPS
echo "3️⃣  Testando HTTPS..."
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN --max-time 5)
if [ "$HTTPS_CODE" = "200" ] || [ "$HTTPS_CODE" = "301" ] || [ "$HTTPS_CODE" = "302" ]; then
    echo "✅ HTTPS funciona (status: $HTTPS_CODE)"
else
    echo "❌ HTTPS retornou: $HTTPS_CODE"
    echo "   (Espere 5-10min para certificado Let's Encrypt ser gerado)"
fi

echo ""

# 4. Verificar certificado SSL
echo "4️⃣  Verificando certificado SSL..."
CERT_INFO=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
if [ ! -z "$CERT_INFO" ]; then
    echo "✅ Certificado encontrado:"
    echo "   $CERT_INFO" | sed 's/^/   /'
else
    echo "⚠️  Certificado ainda não gerado (Let's Encrypt está processando)"
fi

echo ""

# 5. Teste de conteúdo
echo "5️⃣  Testando conteúdo..."
CONTENT=$(curl -s https://$DOMAIN --max-time 5 | grep -i "fastlead\|dashboard\|login" | head -1)
if [ ! -z "$CONTENT" ]; then
    echo "✅ Conteúdo carregando (encontrado palavra-chave)"
else
    echo "⚠️  Conteúdo ainda não acessível (pode estar iniciando)"
fi

echo ""

# 6. Verificar API
echo "6️⃣  Testando API (/health)..."
API_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/health --max-time 5)
if [ "$API_CODE" = "200" ]; then
    echo "✅ API respondendo (health check OK)"
else
    echo "⚠️  API retornou: $API_CODE (pode estar em /api/health)"
fi

echo ""

# 7. Verificar www
echo "7️⃣  Testando www.$DOMAIN..."
WWW_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://www.$DOMAIN --max-time 5)
if [ "$WWW_CODE" = "200" ] || [ "$WWW_CODE" = "301" ] || [ "$WWW_CODE" = "302" ]; then
    echo "✅ www.$DOMAIN funciona (status: $WWW_CODE)"
else
    echo "⚠️  www.$DOMAIN retornou: $WWW_CODE"
    echo "   (Configure CNAME www se necessário)"
fi

echo ""
echo "═══════════════════════════════════════"
echo "📊 Resumo da Validação"
echo "═══════════════════════════════════════"

# Contagem de sucessos
SUCCESS_COUNT=$(($(echo "$HTTP_CODE $HTTPS_CODE $API_CODE" | grep -o "200\|301\|302" | wc -l)))

case $SUCCESS_COUNT in
    3)
        echo "✅ TUDO OK! Seu domínio está configurado corretamente."
        echo "   Acesse: https://$DOMAIN"
        ;;
    2)
        echo "🟡 QUASE LÁ! Verifique:"
        echo "   - Espere mais tempo para propagação DNS (até 48h)"
        echo "   - Certificado SSL ainda pode estar gerando (5-10min)"
        echo "   - Limpe cache do navegador (Ctrl+Shift+Delete)"
        ;;
    *)
        echo "❌ PROBLEMA DETECTADO!"
        echo "   Verifique:"
        echo "   1. DNS está configurado? (nslookup fastlead.com.br)"
        echo "   2. Railway tem o domínio? (Railway Dashboard > Settings)"
        echo "   3. App está rodando? (railway logs)"
        ;;
esac

echo ""
echo "🔗 Links úteis:"
echo "   - Railway Dashboard: https://railway.app"
echo "   - Teste DNS: https://mxtoolbox.com/MXLookup.aspx"
echo "   - Verificar propagação: https://www.whatsmydns.net/"
echo ""
