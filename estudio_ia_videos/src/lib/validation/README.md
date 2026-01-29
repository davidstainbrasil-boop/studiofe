# Validação e Tratamento de Erros

Este diretório contém utilitários para validação de dados e padronização de tratamento de erros nas rotas da API.

## Estrutura

- `schemas.ts`: Contém todos os schemas Zod da aplicação. Centralize seus schemas aqui.
- `api-validator.ts`: Helpers para validar requests (`body`, `query`, `path`) e formatar respostas de erro.

## Como usar

### 1. Defina o Schema (src/lib/validation/schemas.ts)

```typescript
export const MeuSchema = z.object({
  nome: z.string().min(1),
  idade: z.number().min(18),
});
```

### 2. Valide na Rota (src/app/api/...)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateRequestBody } from '@/lib/validation/api-validator';
import { MeuSchema } from '@/lib/validation/schemas';

export async function POST(req: NextRequest) {
  // Valida e retorna erro automaticamente se falhar
  const validation = await validateRequestBody(req, MeuSchema);

  if (!validation.success) {
    return validation.response;
  }

  // Dados tipados e seguros
  const { nome, idade } = validation.data;

  // Lógica da rota...
}
```

## Tratamento de Erros

Use `createValidationError` para retornar erros manuais com o mesmo formato:

```typescript
import { createValidationError } from '@/lib/validation/api-validator';

if (!usuarioExiste) {
  return createValidationError('Usuário não encontrado', { userId }, 404);
}
```

## Logs

O validador integra-se automaticamente com o `Logger` da aplicação, registrando avisos quando a validação falha.
