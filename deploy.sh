#!/bin/bash
# 🚀 Deploy Script para cursostecno.com.br
# Execute no servidor de produção

set -e

APP_DIR="/root/_MVP_Video_TecnicoCursos_v7/estudio_ia_videos"
PM2_APP_NAME="estudio-ia"

echo "🔄 Iniciando deploy..."

cd "$APP_DIR"

echo "📥 Atualizando código..."
git pull origin main

echo "📦 Instalando dependências..."
npm ci --production=false

echo "🔨 Gerando build de produção..."
npm run build

echo "🗑️ Limpando cache do Next.js..."
rm -rf .next/cache

echo "♻️ Reiniciando aplicação..."
if pm2 list | grep -q "$PM2_APP_NAME"; then
    pm2 restart "$PM2_APP_NAME"
else
    pm2 start npm --name "$PM2_APP_NAME" -- start
fi

echo "✅ Deploy concluído!"
echo ""
echo "📊 Status:"
pm2 status "$PM2_APP_NAME"
