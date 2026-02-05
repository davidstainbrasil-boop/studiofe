import { z } from 'zod';
import { VideoJobInputSchema, type VideoJobInput } from '../validation/schemas';

export type ParseOk = { ok: true; data: VideoJobInput };
export type ParseErr = { ok: false; issues: z.ZodIssue[] };
export type ParseResult = ParseOk | ParseErr;

function isErr(r: ParseResult): r is ParseErr {
  return !r.ok;
}

export function parseVideoJobInput(json: unknown): ParseResult {
  const res = VideoJobInputSchema.safeParse(json);
  if (!res.success) {
    const err = res as { success: false; error: z.ZodError<unknown> };
    return { ok: false, issues: err.error.issues };
  }
  const ok = res as { success: true; data: VideoJobInput };
  return { ok: true, data: ok.data };
}

export { isErr };
