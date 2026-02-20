import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

const issueSchema = z.object({
  learner_id: z.string().optional(),
  training_id: z.string().optional(),
  completion_date: z.string().optional(),
  final_score: z.number().min(0).max(100).optional(),
  training_duration_hours: z.number().min(1).optional(),
  template: z.string().optional(),
  issuer: z
    .object({
      organization: z.string().optional(),
      instructor: z.string().optional(),
      authority: z.string().optional(),
    })
    .optional(),
  recipient_name: z.string().optional(),
  course_name: z.string().optional(),
  nr_code: z.string().optional(),
});

interface CertificateRow {
  certificate_number: string;
  recipient_name: string;
  course_name: string;
  course_description?: string | null;
  nr_code?: string | null;
  duration?: string | null;
  instructor_name?: string | null;
  company_name?: string | null;
  completed_at: string;
  created_at?: string | null;
}

function generateCertificateNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

function buildResponse(row: CertificateRow) {
  const completedAt = row.completed_at || new Date().toISOString();
  const createdAt = row.created_at || new Date().toISOString();
  const expirationDate = new Date(completedAt);
  expirationDate.setFullYear(expirationDate.getFullYear() + 2);

  return {
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
      completion_date: completedAt,
      expiration_date: expirationDate.toISOString(),
    },
    assessment: {
      final_score: 0,
      max_score: 100,
      passing_score: 70,
      attempts: 1,
      quiz_scores: [],
    },
    issuer: {
      organization: row.company_name || 'TécnicoCursos',
      instructor: row.instructor_name || 'Instrutor',
      authority: 'Plataforma TécnicoCursos',
      license_number: '',
    },
    verification: {
      pdf_url: '',
      verification_hash: `sha256:${row.certificate_number.toLowerCase()}`,
      verification_url: `/api/certificates/verify?certificateId=${encodeURIComponent(row.certificate_number)}`,
    },
    metadata: {
      createdAt,
      signed_by: row.instructor_name || 'Instrutor',
      digital_signature: row.certificate_number,
      pdf_url: '',
      qr_code_url: '',
      validity_period: 24,
    },
    compliance: {
      nr_standards: row.nr_code ? [row.nr_code] : [],
      government_recognition: true,
      international_recognition: false,
      renewal_required: true,
      ceu_credits: Number((row.duration || '0').replace(/[^\d.]/g, '')) || 0,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const blocked = await applyRateLimit(request, 'certificates-issue', 10);
    if (blocked) return blocked;

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = issueSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const certificateNumber = generateCertificateNumber();
    const completedAt = payload.completion_date || new Date().toISOString();
    const recipientName =
      payload.recipient_name ||
      user.user_metadata?.full_name ||
      user.email ||
      'Participante';
    const courseName =
      payload.course_name ||
      (payload.training_id ? `Treinamento ${payload.training_id}` : 'Treinamento');

    const insertData = {
      user_id: user.id,
      certificate_number: certificateNumber,
      recipient_name: recipientName,
      course_name: courseName,
      course_description: payload.template || null,
      nr_code: payload.nr_code || null,
      duration: payload.training_duration_hours ? `${payload.training_duration_hours}h` : null,
      instructor_name: payload.issuer?.instructor || null,
      company_name: payload.issuer?.organization || null,
      completed_at: completedAt,
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await supabase
      .from('certificates')
      .insert(insertData as never)
      .select('*')
      .single();

    if (insertError || !inserted) {
      logger.error(
        'Certificate issue failed',
        new Error(insertError?.message || 'Unknown certificate insert error'),
      );
      return NextResponse.json(
        { error: 'Failed to issue certificate' },
        { status: 500 }
      );
    }

    const response = buildResponse(inserted as unknown as CertificateRow);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    logger.error(
      'Certificate issue route error',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
