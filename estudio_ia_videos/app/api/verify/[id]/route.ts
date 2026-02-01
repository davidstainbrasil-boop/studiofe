/**
 * 🔍 Certificate Verification API Route
 * 
 * Verifica autenticidade de certificados emitidos
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@lib/supabase/server';
import { Logger } from '@lib/logger';

const logger = new Logger('api:verify:certificate');

// Certificate record type (for tables not in schema)
interface CertificateRecord {
  id: string;
  trainee_name: string;
  course_title: string;
  course_code: string | null;
  nr_number: string | null;
  duration_hours: number;
  completion_date: string;
  expiration_date: string | null;
  score: number | null;
  organization_name: string;
  instructor_name: string | null;
  validation_code: string;
  created_at: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: certificateId } = await params;
    
    if (!certificateId) {
      return NextResponse.json(
        { error: 'ID do certificado é obrigatório' },
        { status: 400 }
      );
    }
    
    logger.info('Verificando certificado', { certificateId });
    
    const supabase = await createClient();
    
    // Fetch certificate from database (table may not exist in schema types)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: certificate, error } = await (supabase as any)
      .from('certificates')
      .select(`
        id,
        trainee_name,
        course_title,
        course_code,
        nr_number,
        duration_hours,
        completion_date,
        expiration_date,
        score,
        organization_name,
        instructor_name,
        validation_code,
        created_at
      `)
      .eq('id', certificateId)
      .single() as { data: CertificateRecord | null; error: Error | null };
    
    if (error || !certificate) {
      logger.warn('Certificado não encontrado', { certificateId });
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Certificado não encontrado',
          message: 'O certificado informado não existe em nossos registros.'
        },
        { status: 404 }
      );
    }
    
    // Check if certificate is expired
    const isExpired = certificate.expiration_date 
      ? new Date(certificate.expiration_date) < new Date()
      : false;
    
    // Build response
    const response = {
      valid: true,
      expired: isExpired,
      certificate: {
        id: certificate.id,
        traineeName: certificate.trainee_name,
        courseTitle: certificate.course_title,
        courseCode: certificate.course_code,
        nrNumber: certificate.nr_number,
        durationHours: certificate.duration_hours,
        completionDate: certificate.completion_date,
        expirationDate: certificate.expiration_date,
        score: certificate.score,
        organizationName: certificate.organization_name,
        instructorName: certificate.instructor_name,
        validationCode: certificate.validation_code,
        issuedAt: certificate.created_at,
      },
      message: isExpired 
        ? 'Certificado válido, porém expirado. Recomenda-se reciclagem.'
        : 'Certificado válido e autêntico.',
    };
    
    logger.info('Certificado verificado', { 
      certificateId, 
      valid: true, 
      expired: isExpired 
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Erro ao verificar certificado', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno ao verificar certificado' },
      { status: 500 }
    );
  }
}
