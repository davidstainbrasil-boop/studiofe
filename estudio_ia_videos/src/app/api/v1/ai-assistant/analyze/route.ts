
import 'openai/shims/node';
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@lib/logger'
import { AIContentService } from '@lib/services/ai-content.service'
import { getServerAuth } from '@lib/auth/unified-session';
import { applyRateLimit } from '@/lib/rate-limit';

// Force dynamic rendering - this route uses OpenAI and shouldn't be prerendered
export const dynamic = 'force-dynamic';

interface AnalysisRequest {
  contentId: string
  contentType: 'pptx' | 'video' | 'avatar' | 'template'
  contentData?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  const session = await getServerAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' }, { status: 401 });
  }

  try {
    const blocked = await applyRateLimit(request, 'v1-ai-analyze', 10);
    if (blocked) return blocked;

    const body: AnalysisRequest = await request.json()

    logger.info('Analyzing content via AIContentService', { contentType: body.contentType });

    // Use Real AI Service
    const aiService = AIContentService.getInstance();
    
    // Pass content data or ID to the service
    const analysisResult = await aiService.analyzeSpecificContent(
      body.contentType, 
      body.contentData || { id: body.contentId }
    );
    
    return NextResponse.json({
      success: true,
      ...analysisResult
    })
    
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('AI Analysis Error', err, { component: 'API: v1/ai-assistant/analyze' });
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze content: ' + err.message
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
    const rateLimitBlocked = await applyRateLimit(req, 'v1-ai-assistant-analyze-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

  return NextResponse.json({
    message: 'AI Content Assistant API',
    version: '1.0.0',
    endpoints: {
      analyze: 'POST /api/v1/ai-assistant/analyze',
      suggestions: 'GET /api/v1/ai-assistant/suggestions',
      apply: 'POST /api/v1/ai-assistant/apply'
    }
  })
}
