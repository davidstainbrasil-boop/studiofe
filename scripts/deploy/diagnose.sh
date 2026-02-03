#!/bin/bash
# ============================================
# Diagnóstico do VPS
# MVP Video TécnicoCursos v7
# ============================================

echo "🔍 ============================================"
echo "🔍 Diagnóstico do VPS - MVP Video TécnicoCursos"
echo "🔍 ============================================"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
        return 0
    else
        echo -e "${RED}❌ $1${NC}"
        return 1
    fi
}

# 1. Verificar Docker
echo "📦 Verificando Docker..."
docker --version > /dev/null 2>&1
check "Docker instalado"

systemctl is-active docker > /dev/null 2>&1
check "Docker rodando"

# 2. Verificar Containers
echo ""
echo "🐳 Verificando Containers..."
if docker ps | grep -q mvp-videos; then
    echo -e "${GREEN}✅ Containers rodando:${NC}"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep mvp-videos
else
    echo -e "${RED}❌ Nenhum container mvp-videos rodando${NC}"
    echo "Containers existentes:"
    docker ps -a | head -5
fi

# 3. Verificar Portas
echo ""
echo "🔌 Verificando Portas..."
if ss -tlnp | grep -q ":80 "; then
    echo -e "${GREEN}✅ Porta 80 está escutando${NC}"
    ss -tlnp | grep ":80 "
else
    echo -e "${RED}❌ Porta 80 NÃO está escutando${NC}"
fi

if ss -tlnp | grep -q ":443 "; then
    echo -e "${GREEN}✅ Porta 443 está escutando${NC}"
else
    echo -e "${YELLOW}⚠️  Porta 443 não está escutando (normal se não tiver SSL)${NC}"
fi

# 4. Verificar Firewall
echo ""
echo "🔥 Verificando Firewall..."
if command -v ufw &> /dev/null; then
    ufw status | head -5
    if ufw status | grep -q "Status: active"; then
        if ufw status | grep -q "80/tcp"; then
            echo -e "${GREEN}✅ Porta 80 liberada no firewall${NC}"
        else
            echo -e "${RED}❌ Porta 80 NÃO liberada no firewall${NC}"
            echo "Execute: ufw allow 80/tcp"
        fi
    else
        echo -e "${YELLOW}⚠️  Firewall não está ativo${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  UFW não instalado${NC}"
fi

# 5. Verificar Nginx
echo ""
echo "🌐 Verificando Nginx..."
if docker ps | grep -q nginx; then
    echo -e "${GREEN}✅ Container Nginx rodando${NC}"
    
    # Testar configuração
    if docker exec mvp-videos-nginx nginx -t 2>&1 | grep -q "successful"; then
        echo -e "${GREEN}✅ Configuração do Nginx válida${NC}"
    else
        echo -e "${RED}❌ Erro na configuração do Nginx:${NC}"
        docker exec mvp-videos-nginx nginx -t 2>&1
    fi
    
    # Verificar logs recentes
    echo ""
    echo "📋 Últimas linhas do log do Nginx:"
    docker logs --tail=10 mvp-videos-nginx 2>&1 | tail -5
else
    echo -e "${RED}❌ Container Nginx não está rodando${NC}"
fi

# 6. Verificar App
echo ""
echo "🚀 Verificando Aplicação..."
if docker ps | grep -q app; then
    echo -e "${GREEN}✅ Container App rodando${NC}"
    
    # Health check interno
    if docker exec mvp-videos-app curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Health check interno passou${NC}"
        docker exec mvp-videos-app curl -s http://localhost:3000/api/health | head -3
    else
        echo -e "${RED}❌ Health check interno falhou${NC}"
    fi
    
    # Verificar logs recentes
    echo ""
    echo "📋 Últimas linhas do log do App:"
    docker logs --tail=10 mvp-videos-app 2>&1 | tail -5
else
    echo -e "${RED}❌ Container App não está rodando${NC}"
fi

# 7. Verificar Redis
echo ""
echo "💾 Verificando Redis..."
if docker ps | grep -q redis; then
    echo -e "${GREEN}✅ Container Redis rodando${NC}"
    if docker exec mvp-videos-redis redis-cli ping 2>&1 | grep -q "PONG"; then
        echo -e "${GREEN}✅ Redis respondendo${NC}"
    else
        echo -e "${RED}❌ Redis não está respondendo${NC}"
    fi
else
    echo -e "${RED}❌ Container Redis não está rodando${NC}"
fi

# 8. Verificar Rede
echo ""
echo "🌐 Verificando Rede Docker..."
if docker network ls | grep -q app-network; then
    echo -e "${GREEN}✅ Rede app-network existe${NC}"
    docker network inspect app-network --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null
else
    echo -e "${RED}❌ Rede app-network não existe${NC}"
fi

# 9. Teste de Conectividade Externa
echo ""
echo "🌍 Teste de Conectividade Externa..."
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo "168.231.90.64")
echo "IP do VPS: $VPS_IP"

if curl -sf --connect-timeout 5 http://localhost/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Health check local funcionando${NC}"
    curl -s http://localhost/api/health | head -3
else
    echo -e "${RED}❌ Health check local falhou${NC}"
fi

# 10. Verificar Arquivos Importantes
echo ""
echo "📁 Verificando Arquivos Importantes..."
APP_DIR="/opt/mvp/_MVP_Video_TecnicoCursos_v7"

if [ -d "$APP_DIR" ]; then
    echo -e "${GREEN}✅ Diretório da aplicação existe${NC}"
    
    if [ -f "$APP_DIR/.env.production" ]; then
        echo -e "${GREEN}✅ .env.production existe${NC}"
        # Verificar se tem variáveis preenchidas
        if grep -q "NEXT_PUBLIC_SUPABASE_URL=https://" "$APP_DIR/.env.production" 2>/dev/null; then
            echo -e "${GREEN}✅ Variáveis do Supabase configuradas${NC}"
        else
            echo -e "${YELLOW}⚠️  Variáveis do Supabase podem não estar configuradas${NC}"
        fi
    else
        echo -e "${RED}❌ .env.production não existe${NC}"
    fi
    
    if [ -f "$APP_DIR/docker-compose.prod.yml" ]; then
        echo -e "${GREEN}✅ docker-compose.prod.yml existe${NC}"
    else
        echo -e "${RED}❌ docker-compose.prod.yml não existe${NC}"
    fi
    
    if [ -f "$APP_DIR/nginx/conf.d/app.conf" ]; then
        echo -e "${GREEN}✅ Configuração do Nginx existe${NC}"
        if grep -q "server_name _" "$APP_DIR/nginx/conf.d/app.conf" 2>/dev/null; then
            echo -e "${GREEN}✅ Nginx configurado para aceitar qualquer domínio${NC}"
        elif grep -q "cursostecno.com.br" "$APP_DIR/nginx/conf.d/app.conf" 2>/dev/null; then
            echo -e "${YELLOW}⚠️  Nginx ainda configurado com domínio específico${NC}"
            echo "Execute: sed -i 's/server_name cursostecno.com.br www.cursostecno.com.br;/server_name _;/' $APP_DIR/nginx/conf.d/app.conf"
        fi
    fi
else
    echo -e "${RED}❌ Diretório da aplicação não existe${NC}"
fi

# Resumo
echo ""
echo "============================================"
echo "📊 RESUMO"
echo "============================================"
echo ""
echo "Para resolver problemas comuns:"
echo ""
echo "1. Se porta 80 não responde:"
echo "   ufw allow 80/tcp"
echo "   docker compose -f docker-compose.prod.yml restart nginx"
echo ""
echo "2. Se containers não estão rodando:"
echo "   cd $APP_DIR"
echo "   docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "3. Se Nginx tem erro de configuração:"
echo "   cd $APP_DIR"
echo "   sed -i 's/server_name cursostecno.com.br www.cursostecno.com.br;/server_name _;/' nginx/conf.d/app.conf"
echo "   docker compose -f docker-compose.prod.yml restart nginx"
echo ""
echo "4. Ver logs completos:"
echo "   docker compose -f docker-compose.prod.yml logs -f"
echo ""
