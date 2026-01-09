import { VideoJobInputSchema, type VideoJobInput } from '../validation/schemas';

import type { z } from 'zod';

export type ParseOk = { ok: true; data: VideoJobInput };
export type ParseErr = { ok: false; issues: z.ZodIssue[] };
export type ParseResult = ParseOk | ParseErr;

function isErr(r: ParseResult): r is ParseErr {
  return !r.ok;
}

export function parseVideoJobInput(json: unknown): ParseResult {
  const res = VideoJobInputSchema.safeParse(json);
  if (!res.success) {
    return { ok: false, issues: res.error.issues };
  }
  return { ok: true, data: res.data };
}

export { isErr };
