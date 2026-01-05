#!/bin/bash

# Script para configurar banco de dados PostgreSQL local
# Uso: ./scripts/setup-local-db.sh

set -e

echo "🚀 Configurando banco de dados PostgreSQL local..."
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variáveis padrão
DB_NAME="${POSTGRES_DB:-mvp_videos}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
SCHEMA_FILE="database-schema-local.sql"

# Verificar se PostgreSQL está rodando
echo "📋 Verificando conexão com PostgreSQL..."
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; then
    echo -e "${RED}❌ Erro: Não foi possível conectar ao PostgreSQL${NC}"
    echo ""
    echo "Opções:"
    echo "1. Instalar PostgreSQL localmente"
    echo "2. Usar Docker: docker run --name mvp-postgres -e POSTGRES_PASSWORD=$DB_PASSWORD -p 5432:5432 -d postgres:16-alpine"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL está rodando${NC}"
echo ""

# Criar banco de dados se não existir
echo "📦 Criando banco de dados '$DB_NAME'..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "Banco já existe"
echo -e "${GREEN}✅ Banco de dados criado/verificado${NC}"
echo ""

# Verificar se o arquivo de schema existe
if [ ! -f "$SCHEMA_FILE" ]; then
    echo -e "${RED}❌ Erro: Arquivo $SCHEMA_FILE não encontrado${NC}"
    exit 1
fi

# Executar schema
echo "📝 Executando schema do banco de dados..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCHEMA_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Schema executado com sucesso!${NC}"
    echo ""
    
    # Verificar tabelas criadas
    echo "📊 Verificando tabelas criadas..."
    TABLE_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
    echo -e "${GREEN}✅ $TABLE_COUNT tabelas criadas${NC}"
    
    # Verificar usuários iniciais
    USER_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;")
    echo -e "${GREEN}✅ $USER_COUNT usuários iniciais criados${NC}"
    
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  SETUP CONCLUÍDO COM SUCESSO!${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Configure DATABASE_URL no .env.local:"
    echo "   DATABASE_URL=\"postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public\""
    echo ""
    echo "2. Execute: npx prisma db pull"
    echo "3. Execute: npx prisma generate"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Erro ao executar schema${NC}"
    exit 1
fi
