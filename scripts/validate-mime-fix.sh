#!/bin/bash

# 🔍 Script de Validação Pós-Deploy
# Executa testes automáticos para verificar se o erro MIME foi corrigido

set -euo pipefail

PRIMARY_DOMAIN=${PRIMARY_DOMAIN:-"cursostecno.com.br"}
PREVIEW_DOMAIN=${PREVIEW_DOMAIN:-""}
PRIMARY_URL="https://${PRIMARY_DOMAIN}"

if [ -n "$PREVIEW_DOMAIN" ]; then
  PREVIEW_URL="https://${PREVIEW_DOMAIN}"
else
  PREVIEW_URL="$PRIMARY_URL"
fi

echo "🔍 Validando correção do erro MIME Type..."
echo "   URL principal: ${PRIMARY_URL}"
echo "   URL de preview: ${PREVIEW_URL}"
echo ""

# Aguardar propagação
echo "⏳ Aguardando 30 segundos para propagação..."
sleep 30

# 1. Testar arquivos estáticos
echo ""
echo "📦 Teste 1: Arquivos estáticos na URL de validação..."
MAIN_CHUNK=$(curl -s "${PREVIEW_URL}" | grep -oP '/_next/static/chunks/main-app-[a-zA-Z0-9]+\.js' | head -1)

if [ -n "$MAIN_CHUNK" ]; then
    echo "   Arquivo encontrado: $MAIN_CHUNK"
    
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PREVIEW_URL}${MAIN_CHUNK}")
    CONTENT_TYPE=$(curl -s -I "${PREVIEW_URL}${MAIN_CHUNK}" | grep -i "content-type" | cut -d: -f2 | xargs)
    
    echo "   Status: $STATUS"
    echo "   Content-Type: $CONTENT_TYPE"
    
    if [ "$STATUS" == "200" ] && [[ "$CONTENT_TYPE" == *"javascript"* ]]; then
        echo "   ✅ Arquivo JavaScript OK"
    else
        echo "   ❌ ERRO: Status $STATUS ou Content-Type incorreto"
        exit 1
    fi
else
    echo "   ⚠️  Não encontrou main-app chunk, testando webpack..."
    
    WEBPACK_CHUNK=$(curl -s "${PREVIEW_URL}" | grep -oP '/_next/static/chunks/webpack-[a-zA-Z0-9]+\.js' | head -1)
    if [ -n "$WEBPACK_CHUNK" ]; then
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PREVIEW_URL}${WEBPACK_CHUNK}")
        echo "   Webpack Status: $STATUS"
        
        if [ "$STATUS" == "200" ]; then
            echo "   ✅ Webpack OK"
        else
            echo "   ❌ ERRO: Webpack retornou $STATUS"
            exit 1
        fi
    else
        echo "   ⚠️  HTML alterado, verificando outro caminho..."
    fi
fi

# 2. Testar página principal
echo ""
echo "🏠 Teste 2: Página principal..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PREVIEW_URL}")
echo "   Status: $STATUS"

if [ "$STATUS" == "200" ]; then
    echo "   ✅ Página principal OK"
else
    echo "   ❌ ERRO: Status $STATUS"
    exit 1
fi

# 3. Testar domínio customizado (se configurado)
echo ""
echo "🌐 Teste 3: Domínio customizado..."
if curl -s --max-time 5 "${PRIMARY_URL}" > /dev/null 2>&1; then
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PRIMARY_URL}")
    echo "   Status: $STATUS"
    
    if [ "$STATUS" == "200" ]; then
        echo "   ✅ Domínio customizado OK"
    else
        echo "   ⚠️  Status $STATUS (pode estar em propagação)"
    fi
else
    echo "   ⚠️  Domínio não responde (pode não estar configurado)"
fi

# 4. Verificar se HTML não contém erros óbvios
echo ""
echo "📄 Teste 4: Validação de HTML..."
HTML_CONTENT=$(curl -s "${PREVIEW_URL}")

if echo "$HTML_CONTENT" | grep -q "Application error"; then
    echo "   ❌ ERRO: Application error detectado no HTML"
    exit 1
elif echo "$HTML_CONTENT" | grep -q "404"; then
    echo "   ❌ ERRO: 404 no conteúdo"
    exit 1
elif echo "$HTML_CONTENT" | grep -q "_next/static"; then
    echo "   ✅ HTML contém referências corretas ao _next/static"
else
    echo "   ⚠️  HTML não contém referências esperadas"
fi

# 5. Testar API health (se existir)
echo ""
echo "💊 Teste 5: API Health..."
if curl -s --max-time 5 "${PREVIEW_URL}/api/health" > /dev/null 2>&1; then
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${PREVIEW_URL}/api/health")
    echo "   Status: $API_STATUS"
    
    if [ "$API_STATUS" == "200" ]; then
        echo "   ✅ API Health OK"
    else
        echo "   ⚠️  API Health retornou $API_STATUS"
    fi
else
    echo "   ⚠️  API Health não configurado"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VALIDAÇÃO CONCLUÍDA COM SUCESSO!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 URLs para testar manualmente:"
echo "   URL de validação: ${PREVIEW_URL}"
echo "   Domínio principal: ${PRIMARY_URL}"
echo ""
echo "📊 Próximos passos:"
echo "   1. Abrir ${PREVIEW_URL} no browser"
echo "   2. Abrir DevTools (F12) > Console"
echo "   3. Verificar que NÃO há erros de MIME type"
echo "   4. Testar navegação entre páginas"
echo ""
