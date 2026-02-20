import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseForRequest } from '@lib/supabase/server';
import { getRequiredEnv } from '@lib/env';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

function isMissingSchemaError(error: unknown): boolean {
  const err = error as { code?: string; message?: string };
  if (err?.code === 'P2010' || err?.code === 'P2021') return true;
  const message = err?.message || '';
  return message.includes('does not exist') || message.includes('Unknown table');
}

export async function POST(request: NextRequest) {
  try {
    const blocked = await applyRateLimit(request, 'certs', 10);
    if (blocked) return blocked;

    // Authentication Logic (copied from projects/route.ts)
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    
    let supabase;
    let user;
    
    if (authHeader) {
        // Create a clean client and set session manually
        supabase = createClient(
            getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
            getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            }
        );
        const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader.startsWith('bearer ') ? authHeader.substring(7) : authHeader;
        
        await supabase.auth.setSession({
            access_token: token,
            refresh_token: 'dummy'
        });
        
        const result = await supabase.auth.getUser();
        user = result.data.user;
    } else {
        // Fallback to cookie based
        supabase = getSupabaseForRequest(request);
        const result = await supabase.auth.getUser();
        user = result.data.user;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, courseName, studentName } = body;

    if (!projectId || !courseName || !studentName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate unique certificate code
    const code = uuidv4().split('-')[0].toUpperCase();

    // Persist certificate in DB (fail-fast when schema is unavailable)
    try {
      const certificatesModel = (prisma as unknown as {
        certificates?: {
          create(args: {
            data: {
              id: string;
              projectId: string;
              userId: string;
              studentName: string;
              courseName: string;
              code: string;
              certificateUrl: string;
              metadata: { generatedBy: string; version: string };
            };
          }): Promise<unknown>;
        };
      }).certificates;

      if (!certificatesModel) {
        logger.error('Certificates persistence unavailable: Prisma model missing', {
          component: 'API: certificates',
        });
        return NextResponse.json(
          { error: 'Certificate persistence unavailable' },
          { status: 503 },
        );
      }

      const certificate = await certificatesModel.create({
        data: {
          id: uuidv4(),
          projectId,
          userId: user.id,
          studentName,
          courseName,
          code,
          certificateUrl: `https://cert.tecnocursos.com.br/${code}`,
          metadata: {
            generatedBy: 'AI Studio',
            version: '1.0'
          }
        },
      });
      return NextResponse.json(certificate, { status: 201 });
    } catch (dbError: unknown) {
      logger.error(
        'Database error creating certificate',
        dbError instanceof Error ? dbError : new Error(String(dbError)),
        { component: 'API: certificates' }
      );

      if (isMissingSchemaError(dbError)) {
        return NextResponse.json(
          { error: 'Certificate persistence unavailable', details: 'Required table is missing in database schema' },
          { status: 503 }
        );
      }

      const err = dbError as { message?: string };
      return NextResponse.json(
        { error: 'Failed to create certificate', details: err.message || 'Unknown error' },
        { status: 500 }
      );
    }

  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error)); 
    logger.error('Error generating certificate', err, { component: 'API: certificates' });
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}
