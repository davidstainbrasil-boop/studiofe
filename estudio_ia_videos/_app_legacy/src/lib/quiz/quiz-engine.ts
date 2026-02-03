/**
 * Quiz Engine - Sistema de Quiz Interativo para Vídeos
 * 
 * Permite criar quizzes que pausam o vídeo em pontos específicos
 * para verificar o aprendizado do aluno.
 */

// ============= TIPOS =============

export type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'matching';

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  text: string;
  options?: QuizOption[];
  correctAnswers: string[];  // IDs das opções corretas ou texto para fill_blank
  explanation?: string;
  points: number;
  timeLimit?: number;  // segundos, opcional
  mediaUrl?: string;   // imagem ou vídeo de apoio
  hint?: string;
}

export interface QuizOption {
  id: string;
  text: string;
  isCorrect?: boolean;  // Não enviado ao client
}

export interface QuizMarker {
  id: string;
  timestamp: number;  // segundos no vídeo onde o quiz aparece
  questionIds: string[];  // IDs das questões neste ponto
  required: boolean;  // Se deve acertar para continuar
  allowSkip: boolean;
  pauseVideo: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  questions: QuizQuestion[];
  markers: QuizMarker[];
  settings: QuizSettings;
  passingScore: number;  // Porcentagem mínima para passar (0-100)
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizSettings {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showFeedback: boolean;  // Mostrar se acertou/errou imediatamente
  showExplanation: boolean;
  allowRetry: boolean;
  maxRetries: number;
  showProgressBar: boolean;
  showTimer: boolean;
  requireAllCorrect: boolean;  // Deve acertar todas para passar
}

export interface QuizAttempt {
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
  timeSpent: number;  // segundos
}

export interface QuizAnswer {
  questionId: string;
  selectedOptions: string[];
  isCorrect: boolean;
  timeSpent: number;  // segundos
  attempts: number;
}

export interface QuizResult {
  attempt: QuizAttempt;
  feedback: QuestionFeedback[];
  certificate?: CertificateData;
}

export interface QuestionFeedback {
  questionId: string;
  correct: boolean;
  correctAnswers: string[];
  explanation?: string;
  partialCredit?: number;
}

export interface CertificateData {
  id: string;
  userId: string;
  quizId: string;
  projectId: string;
  userName: string;
  courseName: string;
  score: number;
  issuedAt: Date;
  validUntil?: Date;
  signatureUrl?: string;
}

// ============= QUIZ ENGINE =============

export class QuizEngine {
  private quiz: Quiz;
  private currentAttempt: QuizAttempt | null = null;
  private questionPool: QuizQuestion[] = [];

  constructor(quiz: Quiz) {
    this.quiz = quiz;
    this.prepareQuestionPool();
  }

  private prepareQuestionPool(): void {
    this.questionPool = [...this.quiz.questions];
    
    if (this.quiz.settings.shuffleQuestions) {
      this.shuffleArray(this.questionPool);
    }
    
    if (this.quiz.settings.shuffleOptions) {
      this.questionPool.forEach(q => {
        if (q.options) {
          this.shuffleArray(q.options);
        }
      });
    }
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  startAttempt(userId: string): QuizAttempt {
    this.currentAttempt = {
      id: `attempt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      quizId: this.quiz.id,
      userId,
      answers: [],
      score: 0,
      maxScore: this.calculateMaxScore(),
      percentage: 0,
      passed: false,
      startedAt: new Date(),
      timeSpent: 0,
    };
    
    return this.currentAttempt;
  }

  private calculateMaxScore(): number {
    return this.quiz.questions.reduce((sum, q) => sum + q.points, 0);
  }

  getQuestionsForMarker(markerId: string): QuizQuestion[] {
    const marker = this.quiz.markers.find(m => m.id === markerId);
    if (!marker) return [];
    
    return this.questionPool.filter(q => marker.questionIds.includes(q.id));
  }

  getQuestionForClient(question: QuizQuestion): Omit<QuizQuestion, 'correctAnswers'> & { options?: Omit<QuizOption, 'isCorrect'>[] } {
    // Remove informações sensíveis antes de enviar ao cliente
    const { correctAnswers, ...safeQuestion } = question;
    
    return {
      ...safeQuestion,
      options: question.options?.map(({ isCorrect, ...opt }) => opt),
    };
  }

  submitAnswer(questionId: string, selectedOptions: string[], timeSpent: number): QuestionFeedback {
    if (!this.currentAttempt) {
      throw new Error('No active attempt. Call startAttempt first.');
    }

    const question = this.quiz.questions.find(q => q.id === questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    // Verificar resposta
    const isCorrect = this.checkAnswer(question, selectedOptions);
    const points = isCorrect ? question.points : 0;

    // Verificar se já respondeu essa pergunta
    const existingAnswer = this.currentAttempt.answers.find(a => a.questionId === questionId);
    if (existingAnswer) {
      // Atualizar tentativa existente
      existingAnswer.selectedOptions = selectedOptions;
      existingAnswer.isCorrect = isCorrect;
      existingAnswer.timeSpent += timeSpent;
      existingAnswer.attempts += 1;
    } else {
      // Nova resposta
      this.currentAttempt.answers.push({
        questionId,
        selectedOptions,
        isCorrect,
        timeSpent,
        attempts: 1,
      });
    }

    // Recalcular score
    this.recalculateScore();

    // Preparar feedback
    const feedback: QuestionFeedback = {
      questionId,
      correct: isCorrect,
      correctAnswers: this.quiz.settings.showFeedback ? question.correctAnswers : [],
      explanation: this.quiz.settings.showExplanation ? question.explanation : undefined,
    };

    return feedback;
  }

  private checkAnswer(question: QuizQuestion, selectedOptions: string[]): boolean {
    switch (question.type) {
      case 'multiple_choice':
      case 'true_false':
        // Todas as opções selecionadas devem estar corretas
        // e todas as corretas devem estar selecionadas
        const correctSet = new Set(question.correctAnswers);
        const selectedSet = new Set(selectedOptions);
        
        if (correctSet.size !== selectedSet.size) return false;
        
        for (const opt of correctSet) {
          if (!selectedSet.has(opt)) return false;
        }
        return true;

      case 'fill_blank':
        // Verificar se o texto corresponde (case insensitive)
        const userAnswer = selectedOptions[0]?.toLowerCase().trim();
        return question.correctAnswers.some(
          ans => ans.toLowerCase().trim() === userAnswer
        );

      case 'matching':
        // Para matching, selectedOptions contém pares "left:right"
        return selectedOptions.every(pair => 
          question.correctAnswers.includes(pair)
        );

      default:
        return false;
    }
  }

  private recalculateScore(): void {
    if (!this.currentAttempt) return;

    let score = 0;
    for (const answer of this.currentAttempt.answers) {
      if (answer.isCorrect) {
        const question = this.quiz.questions.find(q => q.id === answer.questionId);
        if (question) {
          score += question.points;
        }
      }
    }

    this.currentAttempt.score = score;
    this.currentAttempt.percentage = Math.round((score / this.currentAttempt.maxScore) * 100);
    this.currentAttempt.passed = this.currentAttempt.percentage >= this.quiz.passingScore;
  }

  completeAttempt(): QuizResult {
    if (!this.currentAttempt) {
      throw new Error('No active attempt to complete');
    }

    this.currentAttempt.completedAt = new Date();
    this.currentAttempt.timeSpent = Math.floor(
      (this.currentAttempt.completedAt.getTime() - this.currentAttempt.startedAt.getTime()) / 1000
    );

    // Gerar feedbacks para todas as questões
    const feedback: QuestionFeedback[] = this.quiz.questions.map(question => {
      const answer = this.currentAttempt!.answers.find(a => a.questionId === question.id);
      return {
        questionId: question.id,
        correct: answer?.isCorrect ?? false,
        correctAnswers: question.correctAnswers,
        explanation: question.explanation,
      };
    });

    // Gerar certificado se passou
    let certificate: CertificateData | undefined;
    if (this.currentAttempt.passed) {
      certificate = this.generateCertificate();
    }

    const result: QuizResult = {
      attempt: { ...this.currentAttempt },
      feedback,
      certificate,
    };

    // Limpar attempt atual
    this.currentAttempt = null;

    return result;
  }

  private generateCertificate(): CertificateData {
    if (!this.currentAttempt) {
      throw new Error('No attempt to generate certificate for');
    }

    return {
      id: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: this.currentAttempt.userId,
      quizId: this.quiz.id,
      projectId: this.quiz.projectId,
      userName: '', // Será preenchido pelo backend
      courseName: this.quiz.title,
      score: this.currentAttempt.percentage,
      issuedAt: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
    };
  }

  // ============= MÉTODOS UTILITÁRIOS =============

  getMarkerAtTimestamp(timestamp: number): QuizMarker | null {
    // Encontra marker mais próximo (dentro de 1 segundo)
    return this.quiz.markers.find(
      m => Math.abs(m.timestamp - timestamp) < 1
    ) || null;
  }

  shouldPauseAt(timestamp: number): boolean {
    const marker = this.getMarkerAtTimestamp(timestamp);
    return marker?.pauseVideo ?? false;
  }

  getProgress(): { answered: number; total: number; score: number; maxScore: number } {
    return {
      answered: this.currentAttempt?.answers.length ?? 0,
      total: this.quiz.questions.length,
      score: this.currentAttempt?.score ?? 0,
      maxScore: this.currentAttempt?.maxScore ?? this.calculateMaxScore(),
    };
  }

  canRetry(questionId: string): boolean {
    if (!this.quiz.settings.allowRetry) return false;
    
    const answer = this.currentAttempt?.answers.find(a => a.questionId === questionId);
    if (!answer) return true;
    
    return answer.attempts < this.quiz.settings.maxRetries;
  }
}

// ============= QUIZ BUILDER =============

export class QuizBuilder {
  private quiz: Partial<Quiz>;

  constructor(projectId: string) {
    this.quiz = {
      id: `quiz-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      questions: [],
      markers: [],
      settings: this.getDefaultSettings(),
      passingScore: 70,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private getDefaultSettings(): QuizSettings {
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

  setTitle(title: string): QuizBuilder {
    this.quiz.title = title;
    return this;
  }

  setDescription(description: string): QuizBuilder {
    this.quiz.description = description;
    return this;
  }

  setPassingScore(score: number): QuizBuilder {
    this.quiz.passingScore = Math.max(0, Math.min(100, score));
    return this;
  }

  setSettings(settings: Partial<QuizSettings>): QuizBuilder {
    this.quiz.settings = { ...this.quiz.settings!, ...settings };
    return this;
  }

  addMultipleChoice(
    text: string,
    options: Array<{ text: string; isCorrect: boolean }>,
    config?: Partial<Pick<QuizQuestion, 'explanation' | 'points' | 'timeLimit' | 'hint' | 'mediaUrl'>>
  ): QuizBuilder {
    const questionId = `q-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const questionOptions: QuizOption[] = options.map((opt, idx) => ({
      id: `${questionId}-opt-${idx}`,
      text: opt.text,
      isCorrect: opt.isCorrect,
    }));

    const question: QuizQuestion = {
      id: questionId,
      type: 'multiple_choice',
      text,
      options: questionOptions,
      correctAnswers: questionOptions.filter(o => o.isCorrect).map(o => o.id),
      points: config?.points ?? 10,
      ...config,
    };

    this.quiz.questions!.push(question);
    return this;
  }

  addTrueFalse(
    text: string,
    isTrue: boolean,
    config?: Partial<Pick<QuizQuestion, 'explanation' | 'points' | 'timeLimit' | 'hint'>>
  ): QuizBuilder {
    const questionId = `q-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const options: QuizOption[] = [
      { id: `${questionId}-true`, text: 'Verdadeiro', isCorrect: isTrue },
      { id: `${questionId}-false`, text: 'Falso', isCorrect: !isTrue },
    ];

    const question: QuizQuestion = {
      id: questionId,
      type: 'true_false',
      text,
      options,
      correctAnswers: [isTrue ? `${questionId}-true` : `${questionId}-false`],
      points: config?.points ?? 5,
      ...config,
    };

    this.quiz.questions!.push(question);
    return this;
  }

  addFillBlank(
    text: string,
    acceptedAnswers: string[],
    config?: Partial<Pick<QuizQuestion, 'explanation' | 'points' | 'timeLimit' | 'hint'>>
  ): QuizBuilder {
    const questionId = `q-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const question: QuizQuestion = {
      id: questionId,
      type: 'fill_blank',
      text,
      correctAnswers: acceptedAnswers,
      points: config?.points ?? 10,
      ...config,
    };

    this.quiz.questions!.push(question);
    return this;
  }

  addMarker(timestamp: number, questionIds: string[], options?: Partial<Omit<QuizMarker, 'id' | 'timestamp' | 'questionIds'>>): QuizBuilder {
    const marker: QuizMarker = {
      id: `marker-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp,
      questionIds,
      required: options?.required ?? true,
      allowSkip: options?.allowSkip ?? false,
      pauseVideo: options?.pauseVideo ?? true,
    };

    this.quiz.markers!.push(marker);
    
    // Ordenar markers por timestamp
    this.quiz.markers!.sort((a, b) => a.timestamp - b.timestamp);
    
    return this;
  }

  build(): Quiz {
    if (!this.quiz.title) {
      throw new Error('Quiz title is required');
    }
    
    if (this.quiz.questions!.length === 0) {
      throw new Error('Quiz must have at least one question');
    }

    this.quiz.updatedAt = new Date();
    
    return this.quiz as Quiz;
  }
}

// ============= QUIZ ANALYTICS =============

export interface QuizAnalytics {
  quizId: string;
  totalAttempts: number;
  uniqueUsers: number;
  averageScore: number;
  passRate: number;
  averageTimeSpent: number;
  questionStats: QuestionStats[];
  difficultyAnalysis: DifficultyLevel;
}

export interface QuestionStats {
  questionId: string;
  timesAnswered: number;
  correctRate: number;
  averageTime: number;
  commonWrongAnswers: string[];
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export function analyzeQuizResults(attempts: QuizAttempt[], quiz: Quiz): QuizAnalytics {
  const totalAttempts = attempts.length;
  const uniqueUsers = new Set(attempts.map(a => a.userId)).size;
  
  const averageScore = totalAttempts > 0
    ? attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts
    : 0;
  
  const passRate = totalAttempts > 0
    ? (attempts.filter(a => a.passed).length / totalAttempts) * 100
    : 0;
  
  const averageTimeSpent = totalAttempts > 0
    ? attempts.reduce((sum, a) => sum + a.timeSpent, 0) / totalAttempts
    : 0;

  // Análise por questão
  const questionStats: QuestionStats[] = quiz.questions.map(question => {
    const answers = attempts.flatMap(a => 
      a.answers.filter(ans => ans.questionId === question.id)
    );
    
    const timesAnswered = answers.length;
    const correctRate = timesAnswered > 0
      ? (answers.filter(a => a.isCorrect).length / timesAnswered) * 100
      : 0;
    const averageTime = timesAnswered > 0
      ? answers.reduce((sum, a) => sum + a.timeSpent, 0) / timesAnswered
      : 0;

    // Encontrar respostas erradas mais comuns
    const wrongAnswers = answers
      .filter(a => !a.isCorrect)
      .flatMap(a => a.selectedOptions);
    
    const wrongCounts = wrongAnswers.reduce((acc, opt) => {
      acc[opt] = (acc[opt] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const commonWrongAnswers = Object.entries(wrongCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([opt]) => opt);

    return {
      questionId: question.id,
      timesAnswered,
      correctRate,
      averageTime,
      commonWrongAnswers,
    };
  });

  // Determinar dificuldade geral
  let difficultyAnalysis: DifficultyLevel;
  if (averageScore >= 80) {
    difficultyAnalysis = 'easy';
  } else if (averageScore >= 50) {
    difficultyAnalysis = 'medium';
  } else {
    difficultyAnalysis = 'hard';
  }

  return {
    quizId: quiz.id,
    totalAttempts,
    uniqueUsers,
    averageScore,
    passRate,
    averageTimeSpent,
    questionStats,
    difficultyAnalysis,
  };
}

// ============= EXPORT HELPERS =============

export function exportQuizToJSON(quiz: Quiz): string {
  return JSON.stringify(quiz, null, 2);
}

export function importQuizFromJSON(json: string): Quiz {
  const parsed = JSON.parse(json);
  
  // Validação básica
  if (!parsed.id || !parsed.title || !parsed.questions) {
    throw new Error('Invalid quiz JSON format');
  }
  
  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
    updatedAt: new Date(parsed.updatedAt),
  } as Quiz;
}
