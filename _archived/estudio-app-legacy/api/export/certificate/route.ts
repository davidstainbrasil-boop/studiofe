/**
 * 📜 Certificate Export API Route
 * 
 * Gera certificados PDF de conclusão de treinamento
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  CertificateGenerator, 
  generateCertificateId, 
  generateValidationCode, 
  calculateExpirationDate,
  type CertificateData 
} from '@/lib/export/certificate-generator';
import { Logger } from '@lib/logger';
import { createClient } from '@lib/supabase/server';
import { globalRateLimiter } from '@lib/rate-limit';
import { headers } from 'next/headers';

const logger = new Logger('api:export:certificate');

// =============================================================================
// Validation Schema
// =============================================================================

const certificateExportSchema = z.object({
  // Trainee info
  traineeName: z.string().min(1, 'Nome do participante é obrigatório'),
  traineeDocument: z.string().optional(),
  traineeEmail: z.string().email().optional(),
  
  // Course info
  courseTitle: z.string().min(1, 'Título do curso é obrigatório'),
  courseCode: z.string().optional(),
  nrNumber: z.string().optional(),
  courseDurationHours: z.number().positive('Carga horária deve ser positiva'),
  courseDescription: z.string().optional(),
  
  // Completion info
  completionDate: z.string().transform(s => new Date(s)),
  score: z.number().min(0).max(100).optional(),
  
  // Organization info
  organizationName: z.string().min(1, 'Nome da organização é obrigatório'),
  organizationLogo: z.string().optional(),
  instructorName: z.string().optional(),
  instructorCredentials: z.string().optional(),
  
  // Styling
  template: z.enum(['professional', 'modern', 'corporate', 'minimal']).default('professional'),
  
  // Options
  calculateExpiration: z.boolean().default(true),
  customExpirationDate: z.string().transform(s => new Date(s)).optional(),
});

type CertificateExportRequest = z.infer<typeof certificateExportSchema>;

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Get client IP for rate limiting
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    
    // 2. Rate limiting
    const rateLimitResult = globalRateLimiter.check(ip);
    if (!rateLimitResult.success) {
      logger.warn('Rate limit exceeded for certificate export', { ip });
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
        { status: 429 }
      );
    }
    
    // 3. Auth check
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      logger.warn('Unauthorized certificate export attempt', { ip });
      return NextResponse.json(
        { error: 'Autenticação necessária' },
        { status: 401 }
      );
    }
    
    // 4. Parse and validate request
    const body = await request.json();
    const parseResult = certificateExportSchema.safeParse(body);
    
    if (!parseResult.success) {
      logger.warn('Invalid certificate export request', { errors: parseResult.error.errors });
      return NextResponse.json(
        { error: 'Dados inválidos', details: parseResult.error.errors },
        { status: 400 }
      );
    }
    
    const data = parseResult.data;
    
    // 5. Generate certificate ID and validation code
    const certificateId = generateCertificateId();
    const validationCode = generateValidationCode(certificateId);
    
    logger.info('Iniciando geração de certificado', {
      userId: user.id,
      certificateId,
      courseTitle: data.courseTitle,
    });
    
    // 6. Calculate expiration date
    let expirationDate: Date | undefined;
    if (data.customExpirationDate) {
      expirationDate = data.customExpirationDate;
    } else if (data.calculateExpiration && data.nrNumber) {
      expirationDate = calculateExpirationDate(data.nrNumber, data.completionDate);
    }
    
    // 7. Build certificate data
    const verificationUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/verify/${certificateId}`
      : undefined;
    
    const certificateData: CertificateData = {
      traineeName: data.traineeName,
      traineeDocument: data.traineeDocument,
      traineeEmail: data.traineeEmail,
      courseTitle: data.courseTitle,
      courseCode: data.courseCode,
      nrNumber: data.nrNumber,
      courseDurationHours: data.courseDurationHours,
      courseDescription: data.courseDescription,
      completionDate: data.completionDate,
      expirationDate,
      score: data.score,
      organizationName: data.organizationName,
      organizationLogo: data.organizationLogo,
      instructorName: data.instructorName,
      instructorCredentials: data.instructorCredentials,
      certificateId,
      verificationUrl,
      validationCode,
      template: data.template,
    };
    
    // 8. Generate certificate PDF
    const generator = new CertificateGenerator(certificateData);
    const pdfBlob = await generator.generate();
    
    // 9. Store certificate record in database (optional - table may not exist)
    try {
      // Using type assertion for tables not in schema
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any).from('certificates').insert({
        id: certificateId,
        user_id: user.id,
        trainee_name: data.traineeName,
        trainee_email: data.traineeEmail,
        trainee_document: data.traineeDocument,
        course_title: data.courseTitle,
        course_code: data.courseCode,
        nr_number: data.nrNumber,
        duration_hours: data.courseDurationHours,
        completion_date: data.completionDate.toISOString(),
        expiration_date: expirationDate?.toISOString(),
        score: data.score,
        organization_name: data.organizationName,
        instructor_name: data.instructorName,
        validation_code: validationCode,
        template: data.template,
        metadata: {
          generated_at: new Date().toISOString(),
          ip_address: ip,
        },
      });

      if (insertError) {
        logger.warn('Não foi possível salvar registro do certificado', { error: insertError });
        // Continue anyway - certificate was generated
      }
    } catch {
      // Table might not exist - continue without saving
      logger.warn('Tabela certificates não disponível');
    }
    
    // 10. Log activity (optional - table may not exist)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('activity_log').insert({
        user_id: user.id,
        action: 'certificate_generated',
        metadata: {
          certificate_id: certificateId,
          trainee_name: data.traineeName,
          course_title: data.courseTitle,
          nr_number: data.nrNumber,
        },
      });
    } catch {
      // Table might not exist
      logger.warn('Tabela activity_log não disponível');
    }
    
    // 11. Return the PDF
    const filename = `Certificado_${data.traineeName.replace(/[^a-zA-Z0-9]/g, '_')}_${data.courseTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    
    logger.info('Certificado gerado com sucesso', {
      userId: user.id,
      certificateId,
      size: pdfBlob.size,
      duration: Date.now() - startTime,
    });
    
    // Convert blob to buffer for response
    const arrayBuffer = await pdfBlob.arrayBuffer();
    
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBlob.size.toString(),
        'X-Certificate-Id': certificateId,
        'X-Validation-Code': validationCode,
      },
    });
    
  } catch (error) {
    logger.error('Erro na geração de certificado', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno ao gerar certificado' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET Handler - Info endpoint
// =============================================================================

export async function GET(request: NextRequest) {
  return NextResponse.json({
    service: 'Certificate Generator',
    version: '1.0.0',
    templates: ['professional', 'modern', 'corporate', 'minimal'],
    description: 'Gera certificados PDF de conclusão de treinamento',
    features: [
      '4 templates profissionais',
      'Cálculo automático de validade NR',
      'Código de verificação único',
      'Suporte a logo da organização',
      'Registro para auditoria',
    ],
    supportedNRs: [
      'NR-10 (2 anos)',
      'NR-11 (1 ano)',
      'NR-12 (2 anos)',
      'NR-13 (2 anos)',
      'NR-18 (2 anos)',
      'NR-20 (3 anos)',
      'NR-33 (1 ano)',
      'NR-35 (2 anos)',
    ],
  });
}
