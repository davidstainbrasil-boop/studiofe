#!/bin/bash

###############################################################################
# Script para Atualizar DATABASE_URL no Vercel
# Corrige conexão usando Connection Pooling (porta 6543)
###############################################################################

set -e

echo "============================================"
echo "ATUALIZANDO DATABASE_URL NO VERCEL"
echo "============================================"
echo ""

# Nova URL com connection pooling
NEW_DATABASE_URL="postgresql://postgres:gW6bd7xtTO4QtJY4@db.imwqhvidwunnsvyrltkb.supabase.co:6543/postgres?pgbouncer=true"

echo "Nova DATABASE_URL (com pooling):"
echo "$NEW_DATABASE_URL"
echo ""

echo "IMPORTANTE: Execute manualmente os seguintes passos:"
echo ""
echo "1. Acesse Vercel Dashboard:"
echo "   https://vercel.com/tecnocursos/estudio_ia_videos/settings/environment-variables"
echo ""
echo "2. Encontre e edite DATABASE_URL"
echo ""
echo "3. Cole este valor:"
echo "   $NEW_DATABASE_URL"
echo ""
echo "4. Salve e faça Redeploy"
echo ""
echo "5. Aguarde 2-3 minutos"
echo ""
echo "6. Teste com:"
echo "   curl https://estudioiavideos.vercel.app/api/health"
echo ""
echo "============================================"
echo "Alternativamente, use a API do Vercel:"
echo "============================================"
echo ""
echo "# Instalar vercel-env-push (se não tiver):"
echo "npm install -g vercel-env-push"
echo ""
echo "# Ou use o Vercel CLI diretamente:"
echo "cd /root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos"
echo "vercel env rm DATABASE_URL production"
echo "echo '$NEW_DATABASE_URL' | vercel env add DATABASE_URL production"
echo "vercel --prod"
echo ""
