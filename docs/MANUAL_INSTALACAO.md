# Manual de Instalação e Configuração

## Requisitos do Sistema

- **Node.js**: v18 ou superior (v20 recomendado)
- **Docker**: v24+ e Docker Compose
- **NPM**: v9+

## Configuração do Ambiente

1. **Clonar o Repositório**
   ```bash
   git clone <url-do-repo>
   cd _MVP_Video_TecnicoCursos_v7
   ```

2. **Configurar Variáveis de Ambiente**
   Copie o exemplo e ajuste conforme necessário:
   ```bash
   cp .env.example .env.local
   cp estudio_ia_videos/.env.example estudio_ia_videos/.env.local
   ```

   **Variáveis Críticas:**
   - `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase (ou localhost:54321 para dev local com Supabase CLI)
   - `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço (nunca expor no frontend)
   - `DATABASE_URL`: URL de conexão PostgreSQL (ex: `postgresql://postgres:postgres@localhost:5432/video_tecnico`)
   - `REDIS_HOST` / `REDIS_PORT`: Configuração do Redis para filas

3. **Instalar Dependências**
   ```bash
   npm install
   ```
   Isso instalará dependências tanto na raiz quanto na pasta do frontend (`estudio_ia_videos`).

## Inicialização (Modo Produção/Docker)

Este modo sobe o Banco de Dados e Redis via Docker, e a aplicação Node.js localmente.

1. **Iniciar Infraestrutura**
   ```bash
   docker compose up -d
   ```
   Aguarde até que os containers `postgres` e `redis` estejam saudáveis (`docker ps`).

2. **Aplicar Migrations (Banco de Dados)**
   ```bash
   npm run setup:supabase
   # Ou manualmente:
   # npx prisma migrate deploy
   ```

3. **Iniciar Workers (Filas)**
   Em um terminal separado:
   ```bash
   npm run worker:bull
   ```

4. **Iniciar Aplicação Frontend/API**
   ```bash
   npm run app:dev
   ```
   Acesse: `http://localhost:3000`

## Verificação de Saúde

Para garantir que tudo está funcionando:

```bash
npm run health
```
Deve retornar "System has warnings but is operational" ou "All systems are healthy".

## Solução de Problemas

- **Erro de Conexão com Banco**: Verifique se o container postgres está rodando e se a `DATABASE_URL` no `.env` corresponde à porta exposta (padrão 5432).
- **Erro de Supabase API**: Em ambiente Docker puro (sem Supabase CLI), a API REST do Supabase não estará disponível (:54321). O sistema funcionará em modo degradado (sem Storage/Auth avançado), usando conexão direta ao Postgres.
- **Redis Stubbed**: Se o Redis não estiver configurado, o sistema usará um mock em memória (não recomendado para produção).

## Ambientes

- **Desenvolvimento**: Use `npm run dev`.
- **Homologação/Produção**: Use `npm run build` seguido de `npm start`. Certifique-se de que as variáveis de ambiente apontem para a infraestrutura de produção.
