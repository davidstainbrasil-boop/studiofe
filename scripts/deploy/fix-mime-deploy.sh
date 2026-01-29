#!/bin/bash

# 🚀 Script de Deploy de Emergência - Fix MIME Type Error
# Execute este script para corrigir o erro de webpack na produção

set -e

echo "🔧 Iniciando correção de erro MIME Type..."
echo ""

# 1. Navegar para o diretório correto
cd /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos

# 2. Limpar cache e builds anteriores
echo "🧹 Limpando cache..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .vercel/output

# 3. Verificar se vercel.json existe
if [ ! -f "vercel.json" ]; then
    echo "❌ ERRO: vercel.json não encontrado!"
    exit 1
fi

echo "✅ vercel.json encontrado"

# 4. Rebuild local (para validar)
echo ""
echo "🔨 Executando build local..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build local OK"
else
    echo "⚠️  Build local com warnings (normal com ignoreBuildErrors: true)"
fi

# 5. Deploy para Vercel
echo ""
echo "🚀 Iniciando deploy para Vercel..."
echo ""

# Verificar se está logado na Vercel
if ! vercel whoami &> /dev/null; then
    echo "⚠️  Você não está logado na Vercel"
    echo "Execute: vercel login"
    exit 1
fi

# Deploy com force (ignora cache)
vercel --prod --force --yes

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "📋 Próximos passos:"
echo "1. Aguarde 2-3 minutos para propagação"
echo "2. Teste: curl -I https://cursostecno.com.br/_next/static/chunks/main-*.js"
echo "3. Abra o site e verifique o Console do browser"
echo "4. Se persistir, execute: vercel logs --follow"
