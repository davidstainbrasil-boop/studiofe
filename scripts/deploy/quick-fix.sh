#!/bin/bash
# ============================================
# Quick Fix Script - Correções Rápidas
# MVP Video TécnicoCursos v7
# ============================================

set -e

APP_DIR="/opt/mvp/_MVP_Video_TecnicoCursos_v7"

echo "🔧 Correções Rápidas..."

if [ ! -d "$APP_DIR" ]; then
    echo "❌ Diretório da aplicação não encontrado: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

# 1. Corrigir server_name do Nginx
if [ -f nginx/conf.d/app.conf ]; then
    if grep -q "cursostecno.com.br" nginx/conf.d/app.conf 2>/dev/null; then
        echo "📝 Corrigindo server_name do Nginx..."
        sed -i 's/server_name cursostecno.com.br www.cursostecno.com.br;/server_name _;/' nginx/conf.d/app.conf
        echo "✅ Nginx configurado"
    fi
fi

# 2. Liberar porta 80 no firewall
echo "🔥 Liberando porta 80 no firewall..."
ufw allow 80/tcp > /dev/null 2>&1 || true
ufw allow 443/tcp > /dev/null 2>&1 || true

# 3. Reiniciar containers
echo "🔄 Reiniciando containers..."
docker compose -f docker-compose.prod.yml restart nginx 2>/dev/null || true

# 4. Verificar status
echo ""
echo "📊 Status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "✅ Correções aplicadas!"
echo ""
echo "Teste: curl http://localhost/api/health"
