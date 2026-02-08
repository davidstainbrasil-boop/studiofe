import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * Quiz Results API
 * 
 * GET /api/quiz/results?nrCode=xxx - Get quiz results
 * POST /api/quiz/results - Submit a quiz result
 * 
 * Stores quiz results in user metadata since dedicated table may not exist
 */

// Schemas
const submitResultSchema = z.object({
  quizId: z.string(),
  courseId: z.string().optional(),
  nrCode: z.string(),
  score: z.number().min(0).max(100),
  totalQuestions: z.number().min(1),
  correctAnswers: z.number().min(0),
  timeSpent: z.number().optional(), // seconds
  passed: z.boolean(),
  answers: z.array(z.object({
    questionId: z.string(),
    selectedAnswer: z.number(),
    correct: z.boolean(),
    timeSpent: z.number().optional(),
  })).optional(),
});

// Types
interface QuizResult {
  id: string;
  quiz_id: string;
  course_id?: string;
  nr_code: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_spent?: number;
  passed: boolean;
  answers?: {
    questionId: string;
    selectedAnswer: number;
    correct: boolean;
    timeSpent?: number;
  }[];
  created_at: string;
}

interface UserQuizMetadata {
  quiz_results?: QuizResult[];
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'quiz-results-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nrCode = searchParams.get('nrCode');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Get quiz results from user metadata
    const quizMetadata = (user.user_metadata?.quiz_data || {}) as UserQuizMetadata;
    let results = quizMetadata.quiz_results || [];

    // Filter by NR code if provided
    if (nrCode) {
      results = results.filter(r => r.nr_code === nrCode);
    }

    // Sort by date (most recent first) and limit
    results = results
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    // Calculate aggregate stats
    const stats = {
      totalAttempts: results.length,
      averageScore: results.length 
        ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
        : 0,
      passRate: results.length
        ? Math.round((results.filter(r => r.passed).length / results.length) * 100)
        : 0,
      bestScore: results.length
        ? Math.max(...results.map(r => r.score))
        : 0,
    };

    return NextResponse.json({
      results: results.map(r => ({
        id: r.id,
        quizId: r.quiz_id,
        courseId: r.course_id,
        nrCode: r.nr_code,
        score: r.score,
        totalQuestions: r.total_questions,
        correctAnswers: r.correct_answers,
        timeSpent: r.time_spent,
        passed: r.passed,
        createdAt: r.created_at,
      })),
      stats,
    });
  } catch (error) {
    logger.error('Quiz results fetch error:', error instanceof Error ? error : new Error(String(error)));
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
    const parsed = submitResultSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { quizId, courseId, nrCode, score, totalQuestions, correctAnswers, timeSpent, passed, answers } = parsed.data;

    // Create the result object
    const result: QuizResult = {
      id: `quiz-result-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      quiz_id: quizId,
      course_id: courseId,
      nr_code: nrCode,
      score,
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      time_spent: timeSpent,
      passed,
      answers,
      created_at: new Date().toISOString(),
    };

    // Get existing quiz results from user metadata
    const existingMetadata = (user.user_metadata?.quiz_data || {}) as UserQuizMetadata;
    const existingResults = existingMetadata.quiz_results || [];

    // Keep only last 100 results to prevent bloat
    const updatedResults = [...existingResults, result].slice(-100);

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        quiz_data: {
          quiz_results: updatedResults,
          last_quiz_at: new Date().toISOString(),
        },
      },
    });

    if (updateError) {
      logger.error('Quiz result storage error:', updateError instanceof Error ? updateError : new Error(String(updateError)));
      return NextResponse.json(
        { error: 'Failed to save result' },
        { status: 500 }
      );
    }

    // Check if eligible for certificate
    const canGetCertificate = passed && score >= 70;

    return NextResponse.json({
      success: true,
      result: {
        id: result.id,
        score: result.score,
        passed: result.passed,
        totalQuestions: result.total_questions,
        correctAnswers: result.correct_answers,
        createdAt: result.created_at,
      },
      canGetCertificate,
      message: passed 
        ? `Parabéns! Você passou com ${score}%${canGetCertificate ? ' e pode gerar seu certificado!' : ''}` 
        : `Você obteve ${score}%. Tente novamente para atingir 70%.`,
    });
  } catch (error) {
    logger.error('Quiz result save error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
