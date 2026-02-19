---
description: 'Cria um CRUD completo — modelo Prisma, API routes, service, tipos, componentes React'
---

Crie um CRUD completo para a entidade especificada.

## O que criar:

### 1. Banco de Dados

- Modelo no `schema.prisma` com campos, relações, e índices
- Migration: `npx prisma migrate dev --name add_[entidade]`
- `npx prisma generate`

### 2. Tipos (src/types/)

- Interface da entidade
- DTO de criação (sem id, createdAt, updatedAt)
- DTO de atualização (Partial do DTO de criação)
- Tipo de resposta paginada

### 3. Service (src/services/)

- `create(data: CreateDTO): Promise<Entity>`
- `findAll(params: PaginationParams): Promise<PaginatedResponse<Entity>>`
- `findById(id: string): Promise<Entity | null>`
- `update(id: string, data: UpdateDTO): Promise<Entity>`
- `delete(id: string): Promise<void>`
- Error handling em cada operação

### 4. API Routes (se Next.js)

- `GET /api/[entidade]` — listar com paginação
- `POST /api/[entidade]` — criar
- `GET /api/[entidade]/[id]` — buscar por ID
- `PUT /api/[entidade]/[id]` — atualizar
- `DELETE /api/[entidade]/[id]` — deletar
- Validação de input em cada rota

### 5. Hook React (src/hooks/)

- Custom hook que encapsula todas as operações
- Estados de loading, error, data
- Funções de mutação

### 6. Validação

- `tsc --noEmit`
- `npm run lint`
- `npm test` (se existir)

## Regras:

- Paginação obrigatória no listAll (nunca trazer tudo)
- Soft delete quando fizer sentido (campo `deletedAt`)
- Validação de input antes de salvar no banco
- Respostas consistentes: `{ data, error, message, pagination }`
