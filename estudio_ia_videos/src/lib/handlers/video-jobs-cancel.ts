/**
 * Video jobs cancel handler validation
 */

import { z } from 'zod';

const CancelJobInputSchema = z.object({
  id: z.string().uuid('Job ID must be a valid UUID'),
  reason: z.string().optional(),
});

export type CancelJobInput = z.infer<typeof CancelJobInputSchema>;

export function parseCancelJobInput(input: unknown): z.SafeParseReturnType<unknown, CancelJobInput> {
  return CancelJobInputSchema.safeParse(input);
}
