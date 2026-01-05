# 🚀 Quick Start - Setup Rápido do Banco de Dados Local

## Opção 1: Usando Docker (Mais Rápido) ⚡

```bash
# 1. Criar e iniciar container PostgreSQL
docker run --name mvp-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mvp_videos \
  -p 5432:5432 \
  -d postgres:16-alpine

# 2. Aguardar PostgreSQL iniciar (5-10 segundos)
sleep 5

# 3. Executar schema
docker exec -i mvp-postgres psql -U postgres -d mvp_videos < database-schema-local.sql

# 4. Verificar
docker exec -i mvp-postgres psql -U postgres -d mvp_videos -c "\dt"
```

## Opção 2: Usando Script Automatizado 🛠️

```bash
# 1. Dar permissão de execução
chmod +x scripts/setup-local-db.sh

# 2. Executar script
./scripts/setup-local-db.sh

# Ou com variáveis customizadas:
POSTGRES_PASSWORD=minhasenha ./scripts/setup-local-db.sh
```

## Opção 3: Manual 📝

```bash
# 1. Criar banco de dados
createdb mvp_videos

# 2. Executar schema
psql -d mvp_videos -f database-schema-local.sql

# 3. Verificar
psql -d mvp_videos -c "\dt"
```

---

## Configurar Aplicação

### 1. Criar/Atualizar `.env.local`:

```env
# PostgreSQL Local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mvp_videos?schema=public"
DIRECT_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mvp_videos?schema=public"
```

### 2. Atualizar Prisma Schema:

```bash
# Gerar schema Prisma a partir do banco
npx prisma db pull

# Gerar tipos TypeScript
npx prisma generate
```

### 3. Testar Conexão:

```bash
# Usando script de teste
tsx scripts/test-db-connection.ts

# Ou manualmente
npx prisma studio
```

---

## Verificar Instalação ✅

```bash
# Conectar ao banco
psql -d mvp_videos

# Verificar tabelas
\dt

# Verificar views
\dv

# Verificar funções
\df

# Testar função
SELECT get_user_stats(id) FROM users LIMIT 1;

# Usar view
SELECT * FROM v_projects_with_user LIMIT 5;
```

---

## Credenciais Padrão

Após executar o schema, você terá:

- **Admin**: `admin@mvpvideos.com` / `Admin@2025!`
- **Demo**: `demo@mvpvideos.com` / `Demo@2025!`

⚠️ **IMPORTANTE**: Altere essas senhas em produção!

---

## Próximos Passos

1. ✅ Banco configurado
2. ⏭️ Atualizar Prisma schema
3. ⏭️ Criar repositórios/services
4. ⏭️ Integrar com aplicação

Veja `PROXIMOS_PASSOS.md` para mais detalhes.
