# 🚀 Próximos Passos - Implementação do Schema Melhorado

## ✅ Status Atual
- ✅ Schema PostgreSQL completo e melhorado criado (`database-schema-local.sql`)
- ✅ Prisma Client configurado no projeto
- ✅ Supabase configurado (para produção)

## 📋 Checklist de Implementação

### 1. **Configurar Conexão PostgreSQL Local** 🔌
   - [ ] Criar arquivo `.env.local` com variáveis de conexão PostgreSQL
   - [ ] Configurar DATABASE_URL para PostgreSQL local
   - [ ] Testar conexão com o banco

### 2. **Aplicar o Schema no Banco de Dados** 🗄️
   - [ ] Executar o script `database-schema-local.sql` no PostgreSQL
   - [ ] Verificar se todas as tabelas foram criadas
   - [ ] Validar índices e constraints

### 3. **Atualizar Schema Prisma** 🔄
   - [ ] Sincronizar `prisma/schema.prisma` com o novo schema SQL
   - [ ] Gerar tipos TypeScript com `npx prisma generate`
   - [ ] Verificar compatibilidade de tipos

### 4. **Criar Camada de Acesso a Dados** 💾
   - [ ] Criar repositórios/services para cada entidade principal
   - [ ] Implementar funções usando Prisma Client
   - [ ] Adicionar tratamento de erros

### 5. **Criar Scripts de Migração e Seed** 🌱
   - [ ] Criar script de seed para dados iniciais
   - [ ] Criar script de migração para atualizações futuras
   - [ ] Documentar processo de setup

### 6. **Testes e Validação** ✅
   - [ ] Criar testes de integração para conexão
   - [ ] Testar todas as funções auxiliares do schema
   - [ ] Validar performance dos índices

---

## 🎯 Passo 1: Configurar Conexão PostgreSQL Local

### Opção A: Usando Docker (Recomendado)
```bash
# Criar container PostgreSQL
docker run --name mvp-postgres \
  -e POSTGRES_PASSWORD=senha_segura \
  -e POSTGRES_DB=mvp_videos \
  -p 5432:5432 \
  -d postgres:16-alpine

# Executar schema
psql -h localhost -U postgres -d mvp_videos -f database-schema-local.sql
```

### Opção B: PostgreSQL Local
```bash
# Criar banco de dados
createdb mvp_videos

# Executar schema
psql -d mvp_videos -f database-schema-local.sql
```

### Variáveis de Ambiente (.env.local)
```env
# PostgreSQL Local
DATABASE_URL="postgresql://postgres:senha_segura@localhost:5432/mvp_videos?schema=public"

# Para desenvolvimento
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=mvp_videos
POSTGRES_USER=postgres
POSTGRES_PASSWORD=senha_segura
```

---

## 🎯 Passo 2: Atualizar Schema Prisma

### Comandos Necessários:
```bash
# 1. Gerar schema Prisma a partir do banco (introspect)
npx prisma db pull

# 2. Gerar tipos TypeScript
npx prisma generate

# 3. Criar migration inicial
npx prisma migrate dev --name init_local_schema
```

---

## 🎯 Passo 3: Criar Camada de Acesso a Dados

### Estrutura Sugerida:
```
app/lib/db/
├── repositories/
│   ├── users.repository.ts
│   ├── projects.repository.ts
│   ├── render-jobs.repository.ts
│   ├── courses.repository.ts
│   └── ...
├── services/
│   ├── auth.service.ts
│   ├── project.service.ts
│   ├── render.service.ts
│   └── ...
└── queries/
    ├── project.queries.ts
    └── ...
```

---

## 🎯 Passo 4: Criar Scripts Úteis

### Script de Setup Completo
```typescript
// scripts/setup-database.ts
// Script para configurar banco de dados local
```

### Script de Seed
```typescript
// scripts/seed-database.ts
// Popular banco com dados de teste
```

---

## 🎯 Passo 5: Integração com Aplicação

### Atualizar arquivos existentes:
- [ ] `app/lib/db.ts` - Usar Prisma Client
- [ ] `app/lib/supabase/database.ts` - Manter para Supabase (produção)
- [ ] Criar adaptador para alternar entre local e Supabase

---

## 📚 Recursos Úteis do Schema

### Views Disponíveis:
- `v_projects_with_user` - Projetos com informações do usuário
- `v_pending_render_jobs` - Jobs pendentes ordenados
- `v_user_course_progress` - Progresso dos usuários
- `v_render_statistics` - Estatísticas de renderização
- `v_storage_by_type` - Estatísticas de armazenamento
- `v_popular_projects` - Projetos mais acessados
- `v_active_users` - Usuários ativos
- `v_popular_templates` - Templates mais usados

### Funções Disponíveis:
- `get_user_stats(user_id)` - Estatísticas do usuário
- `calculate_course_progress(user_id, course_id)` - Progresso do curso
- `get_project_stats(project_id)` - Estatísticas do projeto
- `cleanup_expired_sessions()` - Limpar sessões expiradas
- `cleanup_old_data(days)` - Limpar dados antigos

### Procedimentos Disponíveis:
- `sp_cleanup_old_data(days)` - Limpeza automática
- `sp_update_template_stats()` - Atualizar estatísticas
- `sp_reset_user_password(user_id, password)` - Reset de senha

---

## 🔧 Comandos Úteis

```bash
# Conectar ao banco
psql -h localhost -U postgres -d mvp_videos

# Verificar tabelas criadas
\dt

# Verificar índices
\di

# Verificar views
\dv

# Verificar funções
\df

# Executar função
SELECT get_user_stats('user-uuid-here');

# Usar view
SELECT * FROM v_projects_with_user LIMIT 10;

# Limpeza de dados antigos
CALL sp_cleanup_old_data(90);
```

---

## ⚠️ Próximas Ações Imediatas

1. **AGORA**: Configurar conexão PostgreSQL local
2. **AGORA**: Executar o schema no banco
3. **DEPOIS**: Atualizar Prisma schema
4. **DEPOIS**: Criar repositórios/services
5. **DEPOIS**: Testar integração

---

## 📝 Notas Importantes

- O schema é **independente do Supabase** - pode rodar localmente
- Mantenha Supabase para produção/desenvolvimento remoto
- Use Prisma como camada de abstração principal
- As views e funções do schema podem ser usadas diretamente via SQL
- Configure manutenção automática (cron job) para `sp_cleanup_old_data`

---

**Última atualização**: 18/12/2025
