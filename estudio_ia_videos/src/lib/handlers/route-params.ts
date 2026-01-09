/**
 * Route parameter validation helpers
 */

import { z } from 'zod';

const UuidParamSchema = z.object({
  id: z.string().uuid('ID must be a valid UUID'),
});

export type UuidParam = z.infer<typeof UuidParamSchema>;

export function parseUuidParam(params: { id?: string } | undefined): z.SafeParseReturnType<unknown, UuidParam> {
  return UuidParamSchema.safeParse(params);
}
