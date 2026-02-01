/**
 * Quiz API - CRUD e avaliação de quizzes
 * 
 * Endpoints:
 * GET    ?action=get&id=xxx     - Buscar quiz por ID
 * GET    ?action=list&projectId=xxx - Listar quizzes do projeto
 * GET    ?action=attempts&quizId=xxx - Listar tentativas de um quiz
 * GET    ?action=analytics&quizId=xxx - Analytics de um quiz
 * POST   ?action=create         - Criar novo quiz
 * POST   ?action=update         - Atualizar quiz existente
 * POST   ?action=start          - Iniciar tentativa de quiz
 * POST   ?action=submit         - Submeter resposta
 * POST   ?action=complete       - Finalizar tentativa
 * DELETE ?action=delete&id=xxx  - Deletar quiz
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// ============= TIPOS =============

interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching';
  text: string;
  options?: Array<{ id: string; text: string; isCorrect?: boolean }>;
  correctAnswers: string[];
  explanation?: string;
  points: number;
  timeLimit?: number;
  mediaUrl?: string;
  hint?: string;
}

interface QuizMarker {
  id: string;
  timestamp: number;
  questionIds: string[];
  required: boolean;
  allowSkip: boolean;
  pauseVideo: boolean;
}

interface QuizSettings {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showFeedback: boolean;
  showExplanation: boolean;
  allowRetry: boolean;
  maxRetries: number;
  showProgressBar: boolean;
  showTimer: boolean;
  requireAllCorrect: boolean;
}

interface Quiz {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  questions: QuizQuestion[];
  markers: QuizMarker[];
  settings: QuizSettings;
  passingScore: number;
  createdAt: Date;
  updatedAt: Date;
}

interface QuizAnswer {
  questionId: string;
  selectedOptions: string[];
  isCorrect: boolean;
  timeSpent: number;
  attempts: number;
}

interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string;
  answers: QuizAnswer[];
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  startedAt: Date;
  completedAt?: Date;
  timeSpent: number;
}

// ============= SCHEMAS DE VALIDAÇÃO =============

const QuestionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['multiple_choice', 'true_false', 'fill_blank', 'matching']),
  text: z.string().min(1),
  options: z.array(z.object({
    id: z.string().optional(),
    text: z.string(),
    isCorrect: z.boolean().optional(),
  })).optional(),
  correctAnswers: z.array(z.string()),
  explanation: z.string().optional(),
  points: z.number().int().min(1).default(10),
  timeLimit: z.number().int().positive().optional(),
  mediaUrl: z.string().url().optional(),
  hint: z.string().optional(),
});

const MarkerSchema = z.object({
  id: z.string().optional(),
  timestamp: z.number().min(0),
  questionIds: z.array(z.string()),
  required: z.boolean().default(true),
  allowSkip: z.boolean().default(false),
  pauseVideo: z.boolean().default(true),
});

const SettingsSchema = z.object({
  shuffleQuestions: z.boolean().default(false),
  shuffleOptions: z.boolean().default(true),
  showFeedback: z.boolean().default(true),
  showExplanation: z.boolean().default(true),
  allowRetry: z.boolean().default(true),
  maxRetries: z.number().int().min(1).default(2),
  showProgressBar: z.boolean().default(true),
  showTimer: z.boolean().default(true),
  requireAllCorrect: z.boolean().default(false),
});

const CreateQuizSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  questions: z.array(QuestionSchema).min(1),
  markers: z.array(MarkerSchema).optional(),
  settings: SettingsSchema.optional(),
  passingScore: z.number().int().min(0).max(100).default(70),
});

const UpdateQuizSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  questions: z.array(QuestionSchema).optional(),
  markers: z.array(MarkerSchema).optional(),
  settings: SettingsSchema.partial().optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
});

const StartAttemptSchema = z.object({
  quizId: z.string().min(1),
  userId: z.string().min(1),
});

const SubmitAnswerSchema = z.object({
  attemptId: z.string().min(1),
  questionId: z.string().min(1),
  selectedOptions: z.array(z.string()),
  timeSpent: z.number().min(0),
});

const CompleteAttemptSchema = z.object({
  attemptId: z.string().min(1),
});

// ============= STORAGE IN-MEMORY (substituir por DB em produção) =============

const quizzes = new Map<string, Quiz>();
const attempts = new Map<string, QuizAttempt>();

// ============= HELPERS =============

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultSettings(): QuizSettings {
  return {
    shuffleQuestions: false,
    shuffleOptions: true,
    showFeedback: true,
    showExplanation: true,
    allowRetry: true,
    maxRetries: 2,
    showProgressBar: true,
    showTimer: true,
    requireAllCorrect: false,
  };
}

function calculateMaxScore(questions: QuizQuestion[]): number {
  return questions.reduce((sum, q) => sum + q.points, 0);
}

function checkAnswer(question: QuizQuestion, selectedOptions: string[]): boolean {
  switch (question.type) {
    case 'multiple_choice':
    case 'true_false': {
      const correctSet = new Set(question.correctAnswers);
      const selectedSet = new Set(selectedOptions);
      
      if (correctSet.size !== selectedSet.size) return false;
      
      for (const opt of correctSet) {
        if (!selectedSet.has(opt)) return false;
      }
      return true;
    }

    case 'fill_blank': {
      const userAnswer = selectedOptions[0]?.toLowerCase().trim();
      return question.correctAnswers.some(
        ans => ans.toLowerCase().trim() === userAnswer
      );
    }

    case 'matching':
      return selectedOptions.every(pair => 
        question.correctAnswers.includes(pair)
      );

    default:
      return false;
  }
}

function sanitizeQuestionForClient(question: QuizQuestion): Omit<QuizQuestion, 'correctAnswers'> {
  const { correctAnswers, ...safe } = question;
  return {
    ...safe,
    options: question.options?.map(({ isCorrect, ...opt }) => opt),
  } as Omit<QuizQuestion, 'correctAnswers'>;
}

function sanitizeQuizForClient(quiz: Quiz): Omit<Quiz, 'questions'> & { questions: Array<Omit<QuizQuestion, 'correctAnswers'>> } {
  return {
    ...quiz,
    questions: quiz.questions.map(sanitizeQuestionForClient),
  };
}

// ============= HANDLERS =============

async function handleGetQuiz(id: string): Promise<NextResponse> {
  const quiz = quizzes.get(id);
  
  if (!quiz) {
    return NextResponse.json(
      { error: 'Quiz não encontrado' },
      { status: 404 }
    );
  }

  // Retorna versão sanitizada (sem respostas corretas)
  return NextResponse.json({
    success: true,
    quiz: sanitizeQuizForClient(quiz),
  });
}

async function handleListQuizzes(projectId: string): Promise<NextResponse> {
  const projectQuizzes = Array.from(quizzes.values())
    .filter(q => q.projectId === projectId)
    .map(q => ({
      id: q.id,
      title: q.title,
      description: q.description,
      questionCount: q.questions.length,
      passingScore: q.passingScore,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    }));

  return NextResponse.json({
    success: true,
    quizzes: projectQuizzes,
    total: projectQuizzes.length,
  });
}

async function handleListAttempts(quizId: string, userId?: string): Promise<NextResponse> {
  let quizAttempts = Array.from(attempts.values())
    .filter(a => a.quizId === quizId);

  if (userId) {
    quizAttempts = quizAttempts.filter(a => a.userId === userId);
  }

  return NextResponse.json({
    success: true,
    attempts: quizAttempts.sort((a, b) => 
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    ),
    total: quizAttempts.length,
  });
}

async function handleGetAnalytics(quizId: string): Promise<NextResponse> {
  const quiz = quizzes.get(quizId);
  if (!quiz) {
    return NextResponse.json({ error: 'Quiz não encontrado' }, { status: 404 });
  }

  const quizAttempts = Array.from(attempts.values())
    .filter(a => a.quizId === quizId && a.completedAt);

  const totalAttempts = quizAttempts.length;
  const uniqueUsers = new Set(quizAttempts.map(a => a.userId)).size;
  
  const averageScore = totalAttempts > 0
    ? quizAttempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts
    : 0;
  
  const passRate = totalAttempts > 0
    ? (quizAttempts.filter(a => a.passed).length / totalAttempts) * 100
    : 0;
  
  const averageTimeSpent = totalAttempts > 0
    ? quizAttempts.reduce((sum, a) => sum + a.timeSpent, 0) / totalAttempts
    : 0;

  // Stats por questão
  const questionStats = quiz.questions.map(question => {
    const answers = quizAttempts.flatMap(a => 
      a.answers.filter(ans => ans.questionId === question.id)
    );
    
    const timesAnswered = answers.length;
    const correctRate = timesAnswered > 0
      ? (answers.filter(a => a.isCorrect).length / timesAnswered) * 100
      : 0;
    const avgTime = timesAnswered > 0
      ? answers.reduce((sum, a) => sum + a.timeSpent, 0) / timesAnswered
      : 0;

    return {
      questionId: question.id,
      questionText: question.text.substring(0, 50) + (question.text.length > 50 ? '...' : ''),
      timesAnswered,
      correctRate: Math.round(correctRate * 100) / 100,
      averageTime: Math.round(avgTime * 100) / 100,
    };
  });

  return NextResponse.json({
    success: true,
    analytics: {
      quizId,
      quizTitle: quiz.title,
      totalAttempts,
      uniqueUsers,
      averageScore: Math.round(averageScore * 100) / 100,
      passRate: Math.round(passRate * 100) / 100,
      averageTimeSpent: Math.round(averageTimeSpent),
      questionStats,
      difficulty: averageScore >= 80 ? 'easy' : averageScore >= 50 ? 'medium' : 'hard',
    },
  });
}

async function handleCreateQuiz(body: unknown): Promise<NextResponse> {
  const parsed = CreateQuizSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  
  // Processar questões
  const questions: QuizQuestion[] = data.questions.map((q, idx) => ({
    id: q.id || generateId(`q${idx}`),
    type: q.type,
    text: q.text,
    options: q.options?.map((opt, optIdx) => ({
      id: opt.id || `opt-${idx}-${optIdx}`,
      text: opt.text,
      isCorrect: opt.isCorrect,
    })),
    correctAnswers: q.correctAnswers,
    explanation: q.explanation,
    points: q.points,
    timeLimit: q.timeLimit,
    mediaUrl: q.mediaUrl,
    hint: q.hint,
  }));

  // Processar markers
  const markers: QuizMarker[] = (data.markers || []).map((m, idx) => ({
    id: m.id || generateId(`marker${idx}`),
    timestamp: m.timestamp,
    questionIds: m.questionIds,
    required: m.required,
    allowSkip: m.allowSkip,
    pauseVideo: m.pauseVideo,
  }));

  const quiz: Quiz = {
    id: generateId('quiz'),
    title: data.title,
    description: data.description,
    projectId: data.projectId,
    questions,
    markers,
    settings: { ...getDefaultSettings(), ...data.settings },
    passingScore: data.passingScore,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  quizzes.set(quiz.id, quiz);

  return NextResponse.json({
    success: true,
    quiz: sanitizeQuizForClient(quiz),
  }, { status: 201 });
}

async function handleUpdateQuiz(body: unknown): Promise<NextResponse> {
  const parsed = UpdateQuizSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const existing = quizzes.get(data.id);
  
  if (!existing) {
    return NextResponse.json(
      { error: 'Quiz não encontrado' },
      { status: 404 }
    );
  }

  const updated: Quiz = {
    ...existing,
    title: data.title ?? existing.title,
    description: data.description ?? existing.description,
    questions: data.questions?.map((q, idx) => ({
      id: q.id || generateId(`q${idx}`),
      type: q.type,
      text: q.text,
      options: q.options?.map((opt, optIdx) => ({
        id: opt.id || `opt-${idx}-${optIdx}`,
        text: opt.text,
        isCorrect: opt.isCorrect,
      })),
      correctAnswers: q.correctAnswers,
      explanation: q.explanation,
      points: q.points,
      timeLimit: q.timeLimit,
      mediaUrl: q.mediaUrl,
      hint: q.hint,
    })) ?? existing.questions,
    markers: data.markers?.map((m, idx) => ({
      id: m.id || generateId(`marker${idx}`),
      timestamp: m.timestamp,
      questionIds: m.questionIds,
      required: m.required,
      allowSkip: m.allowSkip,
      pauseVideo: m.pauseVideo,
    })) ?? existing.markers,
    settings: { ...existing.settings, ...data.settings },
    passingScore: data.passingScore ?? existing.passingScore,
    updatedAt: new Date(),
  };

  quizzes.set(data.id, updated);

  return NextResponse.json({
    success: true,
    quiz: sanitizeQuizForClient(updated),
  });
}

async function handleDeleteQuiz(id: string): Promise<NextResponse> {
  if (!quizzes.has(id)) {
    return NextResponse.json(
      { error: 'Quiz não encontrado' },
      { status: 404 }
    );
  }

  quizzes.delete(id);
  
  // Remove tentativas associadas
  for (const [attemptId, attempt] of attempts.entries()) {
    if (attempt.quizId === id) {
      attempts.delete(attemptId);
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Quiz deletado com sucesso',
  });
}

async function handleStartAttempt(body: unknown): Promise<NextResponse> {
  const parsed = StartAttemptSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { quizId, userId } = parsed.data;
  const quiz = quizzes.get(quizId);
  
  if (!quiz) {
    return NextResponse.json(
      { error: 'Quiz não encontrado' },
      { status: 404 }
    );
  }

  const attempt: QuizAttempt = {
    id: generateId('attempt'),
    quizId,
    userId,
    answers: [],
    score: 0,
    maxScore: calculateMaxScore(quiz.questions),
    percentage: 0,
    passed: false,
    startedAt: new Date(),
    timeSpent: 0,
  };

  attempts.set(attempt.id, attempt);

  return NextResponse.json({
    success: true,
    attempt: {
      id: attempt.id,
      quizId: attempt.quizId,
      maxScore: attempt.maxScore,
      startedAt: attempt.startedAt,
    },
    quiz: sanitizeQuizForClient(quiz),
  }, { status: 201 });
}

async function handleSubmitAnswer(body: unknown): Promise<NextResponse> {
  const parsed = SubmitAnswerSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { attemptId, questionId, selectedOptions, timeSpent } = parsed.data;
  const attempt = attempts.get(attemptId);
  
  if (!attempt) {
    return NextResponse.json(
      { error: 'Tentativa não encontrada' },
      { status: 404 }
    );
  }

  if (attempt.completedAt) {
    return NextResponse.json(
      { error: 'Tentativa já foi finalizada' },
      { status: 400 }
    );
  }

  const quiz = quizzes.get(attempt.quizId);
  if (!quiz) {
    return NextResponse.json(
      { error: 'Quiz não encontrado' },
      { status: 404 }
    );
  }

  const question = quiz.questions.find(q => q.id === questionId);
  if (!question) {
    return NextResponse.json(
      { error: 'Questão não encontrada' },
      { status: 404 }
    );
  }

  // Verificar se já respondeu
  const existingIdx = attempt.answers.findIndex(a => a.questionId === questionId);
  const isCorrect = checkAnswer(question, selectedOptions);

  const answer: QuizAnswer = {
    questionId,
    selectedOptions,
    isCorrect,
    timeSpent,
    attempts: existingIdx >= 0 ? attempt.answers[existingIdx].attempts + 1 : 1,
  };

  if (existingIdx >= 0) {
    // Verificar se pode tentar novamente
    if (!quiz.settings.allowRetry || attempt.answers[existingIdx].attempts >= quiz.settings.maxRetries) {
      return NextResponse.json(
        { error: 'Número máximo de tentativas atingido para esta questão' },
        { status: 400 }
      );
    }
    attempt.answers[existingIdx] = answer;
  } else {
    attempt.answers.push(answer);
  }

  // Recalcular score
  let score = 0;
  for (const ans of attempt.answers) {
    if (ans.isCorrect) {
      const q = quiz.questions.find(qu => qu.id === ans.questionId);
      if (q) score += q.points;
    }
  }

  attempt.score = score;
  attempt.percentage = Math.round((score / attempt.maxScore) * 100);
  attempt.passed = attempt.percentage >= quiz.passingScore;
  attempt.timeSpent += timeSpent;

  attempts.set(attemptId, attempt);

  // Preparar feedback
  const feedback = {
    questionId,
    correct: isCorrect,
    correctAnswers: quiz.settings.showFeedback ? question.correctAnswers : undefined,
    explanation: quiz.settings.showExplanation && isCorrect ? question.explanation : undefined,
    canRetry: quiz.settings.allowRetry && answer.attempts < quiz.settings.maxRetries && !isCorrect,
    retriesLeft: quiz.settings.maxRetries - answer.attempts,
  };

  return NextResponse.json({
    success: true,
    feedback,
    progress: {
      answered: attempt.answers.length,
      total: quiz.questions.length,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentage: attempt.percentage,
    },
  });
}

async function handleCompleteAttempt(body: unknown): Promise<NextResponse> {
  const parsed = CompleteAttemptSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Dados inválidos', details: parsed.error.errors },
      { status: 400 }
    );
  }

  const { attemptId } = parsed.data;
  const attempt = attempts.get(attemptId);
  
  if (!attempt) {
    return NextResponse.json(
      { error: 'Tentativa não encontrada' },
      { status: 404 }
    );
  }

  if (attempt.completedAt) {
    return NextResponse.json(
      { error: 'Tentativa já foi finalizada' },
      { status: 400 }
    );
  }

  const quiz = quizzes.get(attempt.quizId);
  if (!quiz) {
    return NextResponse.json(
      { error: 'Quiz não encontrado' },
      { status: 404 }
    );
  }

  // Finalizar
  attempt.completedAt = new Date();
  attempt.timeSpent = Math.floor(
    (attempt.completedAt.getTime() - new Date(attempt.startedAt).getTime()) / 1000
  );

  attempts.set(attemptId, attempt);

  // Gerar feedback completo
  const questionFeedback = quiz.questions.map(question => {
    const answer = attempt.answers.find(a => a.questionId === question.id);
    return {
      questionId: question.id,
      questionText: question.text,
      correct: answer?.isCorrect ?? false,
      selectedOptions: answer?.selectedOptions ?? [],
      correctAnswers: question.correctAnswers,
      explanation: question.explanation,
      points: answer?.isCorrect ? question.points : 0,
      maxPoints: question.points,
    };
  });

  // Gerar certificado se passou
  let certificate = null;
  if (attempt.passed) {
    certificate = {
      id: generateId('cert'),
      attemptId: attempt.id,
      quizId: quiz.id,
      quizTitle: quiz.title,
      userId: attempt.userId,
      score: attempt.percentage,
      issuedAt: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };
  }

  return NextResponse.json({
    success: true,
    result: {
      attempt: {
        id: attempt.id,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        passed: attempt.passed,
        timeSpent: attempt.timeSpent,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
      },
      questionFeedback,
      certificate,
    },
  });
}

// ============= ROUTE HANDLERS =============

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'list';

  try {
    switch (action) {
      case 'get': {
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
        }
        return handleGetQuiz(id);
      }

      case 'list': {
        const projectId = searchParams.get('projectId');
        if (!projectId) {
          return NextResponse.json({ error: 'projectId é obrigatório' }, { status: 400 });
        }
        return handleListQuizzes(projectId);
      }

      case 'attempts': {
        const quizId = searchParams.get('quizId');
        const userId = searchParams.get('userId') || undefined;
        if (!quizId) {
          return NextResponse.json({ error: 'quizId é obrigatório' }, { status: 400 });
        }
        return handleListAttempts(quizId, userId);
      }

      case 'analytics': {
        const quizId = searchParams.get('quizId');
        if (!quizId) {
          return NextResponse.json({ error: 'quizId é obrigatório' }, { status: 400 });
        }
        return handleGetAnalytics(quizId);
      }

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida', validActions: ['get', 'list', 'attempts', 'analytics'] },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'create';

  try {
    const body = await req.json();

    switch (action) {
      case 'create':
        return handleCreateQuiz(body);

      case 'update':
        return handleUpdateQuiz(body);

      case 'start':
        return handleStartAttempt(body);

      case 'submit':
        return handleSubmitAnswer(body);

      case 'complete':
        return handleCompleteAttempt(body);

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida', validActions: ['create', 'update', 'start', 'submit', 'complete'] },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Erro interno', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const id = searchParams.get('id');

  if (action !== 'delete') {
    return NextResponse.json(
      { error: 'Use action=delete para deletar' },
      { status: 400 }
    );
  }

  if (!id) {
    return NextResponse.json(
      { error: 'ID é obrigatório' },
      { status: 400 }
    );
  }

  try {
    return handleDeleteQuiz(id);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro interno', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
