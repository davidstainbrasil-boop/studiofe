/**
 * 📚 LMS Integration API - LTI 1.3 & SCORM Export
 * MVP Vídeos TécnicoCursos v7
 * 
 * Endpoints:
 * - POST /api/lms/lti/login - Inicia OIDC flow
 * - POST /api/lms/lti/launch - Recebe launch do LMS
 * - POST /api/lms/lti/grade - Submete nota
 * - POST /api/lms/scorm/export - Gera pacote SCORM
 * - GET /api/lms/platforms - Lista plataformas registradas
 * - POST /api/lms/platforms - Registra plataforma
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  ltiService, 
  scormGenerator,
  xapiService,
  type LTIPlatformConfig,
  type SCORMExportConfig,
  type SCORMVersion 
} from '../../src/lib/lms/lms-integration';

// ===========================================
// Validation Schemas
// ===========================================

const platformSchema = z.object({
  issuer: z.string().url(),
  clientId: z.string().min(1),
  deploymentId: z.string().min(1),
  jwksUrl: z.string().url(),
  authorizationUrl: z.string().url(),
  tokenUrl: z.string().url(),
  secret: z.string().min(32),
});

const ltiLoginSchema = z.object({
  iss: z.string().url(),
  target_link_uri: z.string().url(),
  login_hint: z.string().optional(),
  lti_message_hint: z.string().optional(),
});

const ltiLaunchSchema = z.object({
  id_token: z.string().min(1),
  state: z.string().min(1),
  nonce: z.string().optional(),
});

const ltiGradeSchema = z.object({
  platformIssuer: z.string().url(),
  lineItemUrl: z.string().url(),
  userId: z.string().min(1),
  score: z.number().min(0).max(100),
  comment: z.string().optional(),
  completed: z.boolean().default(false),
});

const scormExportSchema = z.object({
  version: z.enum(['scorm12', 'scorm2004']).default('scorm2004'),
  projectId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  organization: z.string().optional(),
  passingScore: z.number().min(0).max(100).optional(),
  requireFullView: z.boolean().default(true),
  metadata: z.object({
    author: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    language: z.string().default('pt-BR'),
    version: z.string().optional(),
    copyright: z.string().optional(),
  }).optional(),
});

// ===========================================
// In-Memory Platform Storage (use Redis em produção)
// ===========================================

const registeredPlatforms = new Map<string, LTIPlatformConfig>();

// Pre-register common LMS platforms from env
if (process.env.LTI_MOODLE_ISSUER) {
  registeredPlatforms.set(process.env.LTI_MOODLE_ISSUER, {
    issuer: process.env.LTI_MOODLE_ISSUER,
    clientId: process.env.LTI_MOODLE_CLIENT_ID || '',
    deploymentId: process.env.LTI_MOODLE_DEPLOYMENT_ID || '1',
    jwksUrl: `${process.env.LTI_MOODLE_ISSUER}/mod/lti/certs.php`,
    authorizationUrl: `${process.env.LTI_MOODLE_ISSUER}/mod/lti/auth.php`,
    tokenUrl: `${process.env.LTI_MOODLE_ISSUER}/mod/lti/token.php`,
    secret: process.env.LTI_MOODLE_SECRET || '',
  });
}

// ===========================================
// API Handlers
// ===========================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const operation = searchParams.get('operation') || 'platforms';

  try {
    switch (operation) {
      case 'platforms':
        return handleListPlatforms();
      
      case 'status':
        return handleLMSStatus();
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[LMS API] GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const operation = searchParams.get('operation') || 'scorm-export';

  try {
    const body = await request.json();

    switch (operation) {
      case 'register-platform':
        return handleRegisterPlatform(body);
      
      case 'lti-login':
        return handleLTILogin(body);
      
      case 'lti-launch':
        return handleLTILaunch(body);
      
      case 'lti-grade':
        return handleLTIGrade(body);
      
      case 'scorm-export':
        return handleSCORMExport(body);
      
      case 'xapi-statement':
        return handleXAPIStatement(body);
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown operation: ${operation}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[LMS API] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

// ===========================================
// Handler Implementations
// ===========================================

/**
 * Lista plataformas LMS registradas
 */
function handleListPlatforms(): NextResponse {
  const platforms = Array.from(registeredPlatforms.entries()).map(([issuer, config]) => ({
    issuer,
    clientId: config.clientId,
    deploymentId: config.deploymentId,
    // Não expor secrets
  }));

  return NextResponse.json({
    success: true,
    data: {
      platforms,
      count: platforms.length,
    },
  });
}

/**
 * Status do sistema LMS
 */
function handleLMSStatus(): NextResponse {
  return NextResponse.json({
    success: true,
    data: {
      lti: {
        enabled: true,
        version: '1.3',
        platformsRegistered: registeredPlatforms.size,
      },
      scorm: {
        enabled: true,
        versions: ['1.2', '2004'],
      },
      xapi: {
        enabled: !!process.env.XAPI_ENDPOINT,
        version: '1.0.3',
      },
    },
  });
}

/**
 * Registra nova plataforma LMS
 */
function handleRegisterPlatform(body: unknown): NextResponse {
  const parsed = platformSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid platform configuration', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const config: LTIPlatformConfig = parsed.data as LTIPlatformConfig;
  
  // Registrar no serviço
  ltiService.registerPlatform(config);
  registeredPlatforms.set(config.issuer, config);

  return NextResponse.json({
    success: true,
    data: {
      message: 'Platform registered successfully',
      issuer: config.issuer,
    },
  });
}

/**
 * Inicia OIDC login flow
 */
function handleLTILogin(body: unknown): NextResponse {
  const parsed = ltiLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid login request', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { iss, target_link_uri, login_hint, lti_message_hint } = parsed.data;

  try {
    const loginUrl = ltiService.generateLoginUrl(
      iss,
      target_link_uri,
      login_hint,
      lti_message_hint
    );

    return NextResponse.json({
      success: true,
      data: { loginUrl },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Login failed' },
      { status: 400 }
    );
  }
}

/**
 * Processa launch do LMS
 */
async function handleLTILaunch(body: unknown): Promise<NextResponse> {
  const parsed = ltiLaunchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid launch request', details: parsed.error.errors },
      { status: 400 }
    );
  }

  try {
    const launchData = await ltiService.validateLaunch({
      idToken: parsed.data.id_token,
      state: parsed.data.state,
      nonce: parsed.data.nonce || '',
    });

    // Criar sessão LTI
    const sessionToken = generateSessionToken();

    return NextResponse.json({
      success: true,
      data: {
        sessionToken,
        user: {
          id: launchData.userId,
          name: launchData.userName,
          email: launchData.userEmail,
          roles: launchData.roles,
        },
        context: {
          id: launchData.contextId,
          title: launchData.contextTitle,
        },
        resource: {
          id: launchData.resourceLinkId,
          title: launchData.resourceLinkTitle,
        },
        canSubmitGrades: !!launchData.lineItemUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Launch validation failed' },
      { status: 401 }
    );
  }
}

/**
 * Submete nota via LTI AGS
 */
async function handleLTIGrade(body: unknown): Promise<NextResponse> {
  const parsed = ltiGradeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid grade submission', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { platformIssuer, lineItemUrl, userId, score, comment, completed } = parsed.data;

  try {
    const success = await ltiService.submitGrade(platformIssuer, lineItemUrl, {
      userId,
      scoreGiven: score,
      scoreMaximum: 100,
      comment,
      activityProgress: completed ? 'Completed' : 'InProgress',
      gradingProgress: 'FullyGraded',
      timestamp: new Date().toISOString(),
    });

    if (success) {
      return NextResponse.json({
        success: true,
        data: { message: 'Grade submitted successfully', score },
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to submit grade' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Grade submission failed' },
      { status: 500 }
    );
  }
}

/**
 * Gera pacote SCORM
 */
async function handleSCORMExport(body: unknown): Promise<NextResponse> {
  const parsed = scormExportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid SCORM export request', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { projectId, version, title, description, organization, passingScore, requireFullView, metadata } = parsed.data;

  try {
    // Buscar dados do projeto (simulado)
    const projectData = await fetchProjectData(projectId);
    if (!projectData) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      );
    }

    const config: SCORMExportConfig = {
      version: version as SCORMVersion,
      title,
      description,
      identifier: `COURSE-${projectId.replace(/-/g, '')}`,
      organization,
      entryPoint: 'index.html',
      completionRequirements: {
        passingScore,
        requireFullView,
      },
      metadata: {
        ...metadata,
        language: metadata?.language || 'pt-BR',
      },
    };

    const result = await scormGenerator.generatePackage(
      config,
      projectData.videoUrl,
      projectData.slides
    );

    // Retornar como download
    const uint8Array = new Uint8Array(result.buffer);
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.size.toString(),
        'X-Checksum-MD5': result.checksum,
        'X-SCORM-Version': result.version,
      },
    });
  } catch (error) {
    console.error('[SCORM Export] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}

/**
 * Envia statement xAPI
 */
async function handleXAPIStatement(body: unknown): Promise<NextResponse> {
  const statement = body as Parameters<typeof xapiService.sendStatement>[0];

  try {
    const statementId = await xapiService.sendStatement(statement);
    
    if (statementId) {
      return NextResponse.json({
        success: true,
        data: { statementId },
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to send statement' },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'xAPI error' },
      { status: 500 }
    );
  }
}

// ===========================================
// Helper Functions
// ===========================================

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function fetchProjectData(projectId: string): Promise<{
  videoUrl: string;
  slides: { id: string; title: string; duration: number }[];
} | null> {
  // Em produção, buscar do banco de dados
  // Por enquanto, retornar dados simulados
  return {
    videoUrl: `https://storage.supabase.co/videos/${projectId}/output.mp4`,
    slides: [
      { id: '1', title: 'Introdução', duration: 60 },
      { id: '2', title: 'Conceitos Básicos', duration: 120 },
      { id: '3', title: 'Demonstração Prática', duration: 180 },
      { id: '4', title: 'Resumo e Próximos Passos', duration: 90 },
      { id: '5', title: 'Quiz de Avaliação', duration: 120 },
    ],
  };
}

// ===========================================
// OPTIONS Handler (CORS)
// ===========================================

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
