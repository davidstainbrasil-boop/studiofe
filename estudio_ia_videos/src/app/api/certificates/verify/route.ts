import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

const verifyBodySchema = z.object({
  certificateId: z.string().min(1),
});

interface CertificateRow {
  certificate_number: string;
  recipient_name: string;
  course_name: string;
  course_description?: string | null;
  nr_code?: string | null;
  duration?: string | null;
  completed_at: string;
  created_at?: string | null;
}

function buildVerificationResponse(row: CertificateRow) {
  const completionDate = new Date(row.completed_at);
  const expirationDate = new Date(completionDate);
  expirationDate.setFullYear(expirationDate.getFullYear() + 2);

  const now = new Date();
  const expiration_status =
    now > expirationDate
      ? 'expired'
      : expirationDate.getTime() - now.getTime() <= 30 * 24 * 60 * 60 * 1000
        ? 'expiring_soon'
        : 'valid';

  return {
    is_valid: expiration_status !== 'expired',
    expiration_status,
    warnings:
      expiration_status === 'expiring_soon'
        ? ['Certificado próximo do vencimento']
        : [],
    certificate: {
      id: row.certificate_number,
      certificate_number: row.certificate_number,
      pdf_hash: `sha256:${row.certificate_number.toLowerCase()}`,
      learner: {
        id: '',
        name: row.recipient_name,
        email: '',
      },
      training: {
        id: '',
        title: row.course_name,
        description: row.course_description || '',
        nr_codes: row.nr_code ? [row.nr_code] : [],
        duration_hours: Number((row.duration || '0').replace(/[^\d.]/g, '')) || 0,
        completion_date: completionDate.toISOString(),
        expiration_date: expirationDate.toISOString(),
      },
      assessment: {
        final_score: 0,
        max_score: 100,
        passing_score: 70,
        attempts: 1,
        quiz_scores: [],
      },
      compliance: {
        nr_standards: row.nr_code ? [row.nr_code] : [],
        government_recognition: true,
        international_recognition: false,
        renewal_required: true,
        ceu_credits: Number((row.duration || '0').replace(/[^\d.]/g, '')) || 0,
      },
    },
  };
}

async function findCertificateByIdentifier(id: string) {
  const supabase = await createClient();

  const byNumber = await supabase
    .from('certificates')
    .select('*')
    .eq('certificate_number', id)
    .single();

  if (!byNumber.error && byNumber.data) {
    return byNumber.data as unknown as CertificateRow;
  }

  const byId = await supabase
    .from('certificates')
    .select('*')
    .eq('id', id)
    .single();

  if (!byId.error && byId.data) {
    return byId.data as unknown as CertificateRow;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const blocked = await applyRateLimit(request, 'certificates-verify', 20);
    if (blocked) return blocked;

    const parsed = verifyBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { is_valid: false, error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const certificate = await findCertificateByIdentifier(parsed.data.certificateId);
    if (!certificate) {
      return NextResponse.json(
        { is_valid: false, error: 'Certificate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(buildVerificationResponse(certificate), { status: 200 });
  } catch (error) {
    logger.error(
      'Certificate verify POST error',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { is_valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const blocked = await applyRateLimit(request, 'certificates-verify-get', 60);
    if (blocked) return blocked;

    const { searchParams } = new URL(request.url);
    const certificateId = searchParams.get('certificateId');

    if (!certificateId) {
      return NextResponse.json(
        { is_valid: false, error: 'certificateId is required' },
        { status: 400 }
      );
    }

    const certificate = await findCertificateByIdentifier(certificateId);
    if (!certificate) {
      return NextResponse.json(
        { is_valid: false, error: 'Certificate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(buildVerificationResponse(certificate), { status: 200 });
  } catch (error) {
    logger.error(
      'Certificate verify GET error',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { is_valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
