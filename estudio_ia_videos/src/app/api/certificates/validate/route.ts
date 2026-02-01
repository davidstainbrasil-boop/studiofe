import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * Certificate Validation API
 * 
 * GET /api/certificates/validate?code=xxx - Validate a certificate by code
 * POST /api/certificates/validate - Generate a new certificate
 * 
 * Stores certificates in user metadata since certificates table may not exist
 */

// Validation schemas
const generateCertificateSchema = z.object({
  courseId: z.string(),
  nrCode: z.string(),
  quizResultId: z.string().optional(),
  score: z.number().min(0).max(100),
  recipientName: z.string().optional(),
});

// Certificate interface
interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  nr_code: string;
  quiz_result_id?: string;
  score: number;
  validation_code: string;
  issued_at: string;
  expires_at: string;
  recipient_name: string;
}

interface UserCertificatesMetadata {
  certificates?: Certificate[];
}

// Generate validation code
function generateValidationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    if (i > 0) code += '-';
    for (let j = 0; j < 4; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  }
  return code;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Validation code required' },
        { status: 400 }
      );
    }

    // Search for certificate in all users' metadata
    // This is a simplified approach - in production you'd have a dedicated table
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json(
        { error: 'Unable to validate certificate' },
        { status: 500 }
      );
    }

    // Search through user metadata for the certificate
    for (const searchUser of users || []) {
      const certMetadata = searchUser.user_metadata?.certificates as UserCertificatesMetadata | undefined;
      const certificates = certMetadata?.certificates || [];
      const certificate = certificates.find((c: Certificate) => c.validation_code === code);
      
      if (certificate) {
        const isExpired = new Date(certificate.expires_at) < new Date();
        
        return NextResponse.json({
          valid: !isExpired,
          certificate: {
            id: certificate.id,
            recipientName: certificate.recipient_name,
            courseId: certificate.course_id,
            nrCode: certificate.nr_code,
            score: certificate.score,
            issuedAt: certificate.issued_at,
            expiresAt: certificate.expires_at,
            expired: isExpired,
          },
          message: isExpired ? 'Certificate has expired' : 'Certificate is valid',
        });
      }
    }

    return NextResponse.json({
      valid: false,
      message: 'Certificate not found',
    }, { status: 404 });
  } catch (error) {
    console.error('Certificate validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = generateCertificateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { courseId, nrCode, quizResultId, score, recipientName } = parsed.data;

    // Verify passing score (70%)
    if (score < 70) {
      return NextResponse.json(
        { error: 'Score must be at least 70% to generate certificate' },
        { status: 400 }
      );
    }

    // Generate unique validation code
    const validationCode = generateValidationCode();

    // Create certificate
    const certificate: Certificate = {
      id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      user_id: user.id,
      course_id: courseId,
      nr_code: nrCode,
      quiz_result_id: quizResultId,
      score,
      validation_code: validationCode,
      issued_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 2 years
      recipient_name: recipientName || user.user_metadata?.full_name || user.email || 'Participante',
    };

    // Get existing certificates from user metadata
    const existingCerts = (user.user_metadata?.certificates?.certificates || []) as Certificate[];
    
    // Update user metadata with new certificate
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        certificates: {
          certificates: [...existingCerts, certificate],
        },
      },
    });

    if (updateError) {
      console.error('Certificate storage error:', updateError);
      return NextResponse.json(
        { error: 'Failed to create certificate' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      certificate: {
        id: certificate.id,
        validationCode: certificate.validation_code,
        recipientName: certificate.recipient_name,
        courseId: certificate.course_id,
        nrCode: certificate.nr_code,
        score: certificate.score,
        issuedAt: certificate.issued_at,
        expiresAt: certificate.expires_at,
      },
      message: 'Certificate generated successfully',
    });
  } catch (error) {
    console.error('Certificate generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
