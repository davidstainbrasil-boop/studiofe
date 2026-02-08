import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

// Type for certificate record (table not yet in generated types)
interface CertificateRecord {
  id?: string;
  user_id: string;
  certificate_number: string;
  recipient_name: string;
  course_name: string;
  course_description?: string;
  nr_code?: string;
  duration?: string;
  instructor_name?: string;
  company_name?: string;
  company_logo?: string;
  completed_at: string;
  created_at?: string;
}

interface CertificateData {
  recipientName: string;
  courseName: string;
  courseDescription?: string;
  completedAt: string;
  duration: string;
  instructorName?: string;
  companyName?: string;
  companyLogo?: string;
  certificateNumber: string;
  nrCode?: string; // e.g., "NR-35", "NR-10"
}

// Generate unique certificate number
function generateCertificateNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `CERT-${timestamp}-${random}`;
}

// Format date for Brazilian locale
function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

// Generate SVG certificate (can be converted to PDF)
function generateCertificateSVG(data: CertificateData): string {
  const completedDate = formatDateBR(new Date(data.completedAt));
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="842" height="595" viewBox="0 0 842 595" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#7C3AED;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#4F46E5;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#F59E0B;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#D97706;stop-opacity:1" />
    </linearGradient>
    <pattern id="bgPattern" patternUnits="userSpaceOnUse" width="50" height="50">
      <circle cx="25" cy="25" r="1" fill="#E5E7EB" opacity="0.5"/>
    </pattern>
  </defs>
  
  <!-- Background -->
  <rect width="842" height="595" fill="white"/>
  <rect width="842" height="595" fill="url(#bgPattern)"/>
  
  <!-- Border -->
  <rect x="20" y="20" width="802" height="555" fill="none" stroke="url(#headerGradient)" stroke-width="3" rx="8"/>
  <rect x="30" y="30" width="782" height="535" fill="none" stroke="#E5E7EB" stroke-width="1" rx="6"/>
  
  <!-- Header gradient bar -->
  <rect x="30" y="30" width="782" height="80" fill="url(#headerGradient)" rx="6"/>
  <rect x="30" y="100" width="782" height="10" fill="url(#headerGradient)"/>
  
  <!-- Company Logo placeholder or name -->
  ${data.companyName ? `
  <text x="421" y="75" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">
    ${escapeXml(data.companyName)}
  </text>
  ` : `
  <text x="421" y="75" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="white" text-anchor="middle">
    Estúdio IA Vídeos
  </text>
  `}
  
  <!-- Certificate Title -->
  <text x="421" y="160" font-family="Georgia, serif" font-size="36" font-weight="bold" fill="#1F2937" text-anchor="middle">
    CERTIFICADO
  </text>
  <text x="421" y="190" font-family="Arial, sans-serif" font-size="14" fill="#6B7280" text-anchor="middle" letter-spacing="4">
    DE CONCLUSÃO
  </text>
  
  <!-- Decorative line -->
  <line x1="270" y1="210" x2="572" y2="210" stroke="url(#goldGradient)" stroke-width="2"/>
  
  <!-- Certification text -->
  <text x="421" y="255" font-family="Arial, sans-serif" font-size="14" fill="#6B7280" text-anchor="middle">
    Certificamos que
  </text>
  
  <!-- Recipient Name -->
  <text x="421" y="300" font-family="Georgia, serif" font-size="32" font-weight="bold" fill="#7C3AED" text-anchor="middle">
    ${escapeXml(data.recipientName)}
  </text>
  
  <!-- Course completion text -->
  <text x="421" y="345" font-family="Arial, sans-serif" font-size="14" fill="#6B7280" text-anchor="middle">
    concluiu com sucesso o treinamento
  </text>
  
  <!-- Course Name -->
  <text x="421" y="385" font-family="Georgia, serif" font-size="24" font-weight="bold" fill="#1F2937" text-anchor="middle">
    ${escapeXml(data.courseName)}
  </text>
  
  ${data.nrCode ? `
  <!-- NR Badge -->
  <rect x="371" y="400" width="100" height="30" fill="url(#goldGradient)" rx="15"/>
  <text x="421" y="420" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle">
    ${escapeXml(data.nrCode)}
  </text>
  ` : ''}
  
  <!-- Course description if provided -->
  ${data.courseDescription ? `
  <text x="421" y="460" font-family="Arial, sans-serif" font-size="12" fill="#6B7280" text-anchor="middle">
    ${escapeXml(data.courseDescription.substring(0, 80))}
  </text>
  ` : ''}
  
  <!-- Duration and Date -->
  <text x="200" y="500" font-family="Arial, sans-serif" font-size="12" fill="#6B7280" text-anchor="middle">
    Carga horária: ${escapeXml(data.duration)}
  </text>
  <text x="421" y="500" font-family="Arial, sans-serif" font-size="12" fill="#6B7280" text-anchor="middle">
    Concluído em: ${escapeXml(completedDate)}
  </text>
  <text x="642" y="500" font-family="Arial, sans-serif" font-size="12" fill="#6B7280" text-anchor="middle">
    Nº ${escapeXml(data.certificateNumber)}
  </text>
  
  <!-- Signature line -->
  ${data.instructorName ? `
  <line x1="321" y1="530" x2="521" y2="530" stroke="#9CA3AF" stroke-width="1"/>
  <text x="421" y="550" font-family="Arial, sans-serif" font-size="11" fill="#6B7280" text-anchor="middle">
    ${escapeXml(data.instructorName)} - Instrutor
  </text>
  ` : `
  <line x1="321" y1="530" x2="521" y2="530" stroke="#9CA3AF" stroke-width="1"/>
  <text x="421" y="550" font-family="Arial, sans-serif" font-size="11" fill="#6B7280" text-anchor="middle">
    Estúdio IA Vídeos
  </text>
  `}
  
  <!-- QR Code placeholder (corner) -->
  <rect x="720" y="483" width="70" height="70" fill="#F3F4F6" stroke="#E5E7EB" rx="4"/>
  <text x="755" y="525" font-family="Arial, sans-serif" font-size="8" fill="#9CA3AF" text-anchor="middle">
    QR Code
  </text>
  <text x="755" y="537" font-family="Arial, sans-serif" font-size="6" fill="#9CA3AF" text-anchor="middle">
    Verificação
  </text>
  
  <!-- Seal/Badge -->
  <circle cx="755" cy="400" r="35" fill="url(#goldGradient)" opacity="0.9"/>
  <circle cx="755" cy="400" r="30" fill="none" stroke="white" stroke-width="2"/>
  <text x="755" y="395" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="white" text-anchor="middle">
    VÁLIDO
  </text>
  <text x="755" y="408" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="white" text-anchor="middle">
    BRASIL
  </text>
</svg>`;
}

// Escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    
    const {
      recipientName,
      courseName,
      courseDescription,
      completedAt = new Date().toISOString(),
      duration = '2 horas',
      instructorName,
      companyName,
      companyLogo,
      nrCode,
      format = 'svg', // 'svg' or 'html' (PDF requires server-side rendering)
    } = body;

    // Validate required fields
    if (!recipientName || !courseName) {
      return NextResponse.json(
        { error: 'Nome do participante e nome do curso são obrigatórios' },
        { status: 400 }
      );
    }

    // Generate certificate number
    const certificateNumber = generateCertificateNumber();

    const certificateData: CertificateData = {
      recipientName,
      courseName,
      courseDescription,
      completedAt,
      duration,
      instructorName,
      companyName,
      companyLogo,
      certificateNumber,
      nrCode,
    };

    // Store certificate record in database
    // Note: Using generic from() call as table is created via migration
    const { error: insertError } = await supabase
      .from('certificates' as never)
      .insert({
        user_id: user.id,
        certificate_number: certificateNumber,
        recipient_name: recipientName,
        course_name: courseName,
        course_description: courseDescription,
        nr_code: nrCode,
        duration,
        instructor_name: instructorName,
        company_name: companyName,
        completed_at: completedAt,
        created_at: new Date().toISOString(),
      } as CertificateRecord);

    // Log error but don't fail if table doesn't exist yet
    if (insertError) {
      logger.warn('Certificates table may not exist', { error: insertError.message });
    }

    // Generate certificate based on format
    if (format === 'svg') {
      const svg = generateCertificateSVG(certificateData);
      
      return new NextResponse(svg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `attachment; filename="certificado-${certificateNumber}.svg"`,
        },
      });
    }

    // Return HTML for PDF generation (client-side or via puppeteer)
    if (format === 'html') {
      const svg = generateCertificateSVG(certificateData);
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificado - ${escapeXml(courseName)}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f3f4f6; }
    .certificate { background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    @media print {
      body { background: white; }
      .certificate { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="certificate">
    ${svg}
  </div>
</body>
</html>`;

      return new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      });
    }

    // Return JSON with certificate data for custom rendering
    return NextResponse.json({
      success: true,
      certificate: {
        ...certificateData,
        svgUrl: `/api/certificate/generate?id=${certificateNumber}&format=svg`,
      },
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Certificate generation failed', err);
    return NextResponse.json(
      { error: 'Falha ao gerar certificado' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve/verify a certificate
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const certificateNumber = searchParams.get('id');
    const format = searchParams.get('format') || 'json';

    if (!certificateNumber) {
      return NextResponse.json(
        { error: 'ID do certificado é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Look up certificate - using any cast as table is created via migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase dynamic table query
    const { data: certificate, error } = await supabase
      .from('certificates' as never)
      .select('*')
      .eq('certificate_number', certificateNumber)
      .single() as { data: CertificateRecord | null; error: { message?: string; code?: string } | null };

    if (error || !certificate) {
      return NextResponse.json(
        { error: 'Certificado não encontrado', valid: false },
        { status: 404 }
      );
    }

    // If format is SVG, regenerate and return
    if (format === 'svg') {
      const svg = generateCertificateSVG({
        recipientName: certificate.recipient_name,
        courseName: certificate.course_name,
        courseDescription: certificate.course_description,
        completedAt: certificate.completed_at,
        duration: certificate.duration || '2 horas',
        instructorName: certificate.instructor_name,
        companyName: certificate.company_name,
        certificateNumber: certificate.certificate_number,
        nrCode: certificate.nr_code,
      });

      return new NextResponse(svg, {
        status: 200,
        headers: {
          'Content-Type': 'image/svg+xml',
        },
      });
    }

    // Return verification data
    return NextResponse.json({
      valid: true,
      certificate: {
        certificateNumber: certificate.certificate_number,
        recipientName: certificate.recipient_name,
        courseName: certificate.course_name,
        nrCode: certificate.nr_code,
        completedAt: certificate.completed_at,
        duration: certificate.duration,
        issuedAt: certificate.created_at,
      },
    });

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Certificate verification failed', err);
    return NextResponse.json(
      { error: 'Falha ao verificar certificado' },
      { status: 500 }
    );
  }
}
