'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  Trophy,
  Star,
  Clock,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  Target,
  Award,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface QuizConfig {
  title: string;
  description: string;
  nrCode: string;
  questions: Question[];
  passingScore: number;
  timeLimit?: number; // in minutes
}

export interface QuizResults {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  timeSpent: number;
  passed: boolean;
  answers: { questionId: string; selectedIndex: number; correct: boolean }[];
}

interface NRQuizSystemProps {
  config: QuizConfig;
  onComplete?: (results: QuizResults) => void;
  onRetry?: () => void;
  className?: string;
}

export function NRQuizSystem({
  config,
  onComplete,
  onRetry,
  className,
}: NRQuizSystemProps) {
  const [currentStep, setCurrentStep] = useState<'intro' | 'quiz' | 'results'>('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<{ questionId: string; selectedIndex: number; correct: boolean }[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [results, setResults] = useState<QuizResults | null>(null);

  const question = config.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / config.questions.length) * 100;

  const handleStartQuiz = useCallback(() => {
    setCurrentStep('quiz');
    setStartTime(Date.now());
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedAnswer(null);
    setShowExplanation(false);
  }, []);

  const handleSelectAnswer = useCallback((index: number) => {
    if (showExplanation) return;
    setSelectedAnswer(index);
  }, [showExplanation]);

  const handleConfirmAnswer = useCallback(() => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === question.correctIndex;
    
    setAnswers(prev => [
      ...prev,
      {
        questionId: question.id,
        selectedIndex: selectedAnswer,
        correct: isCorrect,
      },
    ]);
    
    setShowExplanation(true);
  }, [selectedAnswer, question]);

  const handleNextQuestion = useCallback(() => {
    if (currentQuestion < config.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      // Calculate results
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      const correctCount = answers.filter(a => a.correct).length + 
        (selectedAnswer === question.correctIndex ? 1 : 0);
      const score = Math.round((correctCount / config.questions.length) * 100);
      
      const quizResults: QuizResults = {
        score,
        totalQuestions: config.questions.length,
        correctAnswers: correctCount,
        incorrectAnswers: config.questions.length - correctCount,
        timeSpent,
        passed: score >= config.passingScore,
        answers: [
          ...answers,
          {
            questionId: question.id,
            selectedIndex: selectedAnswer!,
            correct: selectedAnswer === question.correctIndex,
          },
        ],
      };
      
      setResults(quizResults);
      setCurrentStep('results');
      onComplete?.(quizResults);
    }
  }, [currentQuestion, config.questions.length, answers, selectedAnswer, question, startTime, config.passingScore, onComplete]);

  const handleRetry = useCallback(() => {
    setCurrentStep('intro');
    setResults(null);
    onRetry?.();
  }, [onRetry]);

  const getDifficultyColor = (difficulty: Question['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400 bg-green-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      case 'hard': return 'text-red-400 bg-red-500/20';
    }
  };

  const getDifficultyLabel = (difficulty: Question['difficulty']) => {
    switch (difficulty) {
      case 'easy': return 'Fácil';
      case 'medium': return 'Média';
      case 'hard': return 'Difícil';
    }
  };

  return (
    <div className={cn('flex flex-col bg-zinc-900 text-white rounded-2xl overflow-hidden', className)}>
      <AnimatePresence mode="wait">
        {/* Intro Screen */}
        {currentStep === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-8 text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl
                            flex items-center justify-center">
              <GraduationCap className="h-8 w-8" />
            </div>
            
            <div className="inline-block px-3 py-1 mb-4 bg-orange-500/20 text-orange-400 text-sm font-medium rounded-full">
              {config.nrCode}
            </div>
            
            <h2 className="text-2xl font-bold mb-2">{config.title}</h2>
            <p className="text-zinc-400 mb-8">{config.description}</p>
            
            <div className="grid grid-cols-3 gap-4 mb-8 max-w-md mx-auto">
              <div className="p-4 bg-zinc-800 rounded-xl">
                <Target className="h-6 w-6 mx-auto mb-2 text-blue-400" />
                <div className="text-lg font-bold">{config.questions.length}</div>
                <div className="text-xs text-zinc-500">Questões</div>
              </div>
              <div className="p-4 bg-zinc-800 rounded-xl">
                <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-400" />
                <div className="text-lg font-bold">{config.passingScore}%</div>
                <div className="text-xs text-zinc-500">Para passar</div>
              </div>
              <div className="p-4 bg-zinc-800 rounded-xl">
                <Clock className="h-6 w-6 mx-auto mb-2 text-green-400" />
                <div className="text-lg font-bold">~{Math.ceil(config.questions.length * 1.5)}</div>
                <div className="text-xs text-zinc-500">Minutos</div>
              </div>
            </div>
            
            <button
              onClick={handleStartQuiz}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl
                         font-semibold hover:opacity-90 transition-opacity"
            >
              Iniciar Quiz
            </button>
          </motion.div>
        )}

        {/* Quiz Screen */}
        {currentStep === 'quiz' && question && (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full"
          >
            {/* Progress Header */}
            <div className="p-4 border-b border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">
                  Questão {currentQuestion + 1} de {config.questions.length}
                </span>
                <span className={cn(
                  'px-2 py-0.5 text-xs font-medium rounded-full',
                  getDifficultyColor(question.difficulty)
                )}>
                  {getDifficultyLabel(question.difficulty)}
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Question */}
            <div className="flex-1 p-6 overflow-y-auto">
              <motion.h3
                key={question.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-lg font-medium mb-6"
              >
                {question.text}
              </motion.h3>

              {/* Options */}
              <div className="space-y-3">
                {question.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = index === question.correctIndex;
                  const showCorrectness = showExplanation;

                  return (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSelectAnswer(index)}
                      disabled={showExplanation}
                      className={cn(
                        'w-full p-4 rounded-xl text-left transition-all',
                        'border-2',
                        showCorrectness
                          ? isCorrect
                            ? 'bg-green-500/20 border-green-500'
                            : isSelected
                              ? 'bg-red-500/20 border-red-500'
                              : 'bg-zinc-800 border-zinc-700'
                          : isSelected
                            ? 'bg-blue-500/20 border-blue-500'
                            : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm',
                          showCorrectness
                            ? isCorrect
                              ? 'bg-green-500 text-white'
                              : isSelected
                                ? 'bg-red-500 text-white'
                                : 'bg-zinc-700 text-zinc-400'
                            : isSelected
                              ? 'bg-blue-500 text-white'
                              : 'bg-zinc-700 text-zinc-400'
                        )}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="flex-1">{option}</span>
                        {showCorrectness && (
                          isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                          ) : isSelected ? (
                            <XCircle className="h-5 w-5 text-red-400" />
                          ) : null
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Explanation */}
              <AnimatePresence>
                {showExplanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl"
                  >
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-blue-400 mb-1">Explicação</div>
                        <p className="text-sm text-zinc-300">{question.explanation}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-zinc-800">
              {!showExplanation ? (
                <button
                  onClick={handleConfirmAnswer}
                  disabled={selectedAnswer === null}
                  className="w-full py-3 bg-blue-500 rounded-xl font-semibold
                             disabled:opacity-50 disabled:cursor-not-allowed
                             hover:bg-blue-600 transition-colors"
                >
                  Confirmar Resposta
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl
                             font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  {currentQuestion < config.questions.length - 1 ? (
                    <>
                      Próxima Questão
                      <ChevronRight className="h-5 w-5" />
                    </>
                  ) : (
                    <>
                      Ver Resultado
                      <Trophy className="h-5 w-5" />
                    </>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Results Screen */}
        {currentStep === 'results' && results && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}
              className={cn(
                'w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center',
                results.passed
                  ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                  : 'bg-gradient-to-br from-orange-500 to-red-500'
              )}
            >
              {results.passed ? (
                <Award className="h-10 w-10" />
              ) : (
                <RefreshCw className="h-10 w-10" />
              )}
            </motion.div>

            <h2 className="text-2xl font-bold mb-2">
              {results.passed ? 'Parabéns!' : 'Continue Estudando'}
            </h2>
            <p className="text-zinc-400 mb-8">
              {results.passed
                ? 'Você demonstrou excelente conhecimento sobre esta NR!'
                : 'Revise o conteúdo e tente novamente para melhorar seu resultado.'}
            </p>

            {/* Score Circle */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#27272a"
                  strokeWidth="12"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={results.passed ? '#22c55e' : '#f97316'}
                  strokeWidth="12"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0 352' }}
                  animate={{ strokeDasharray: `${(results.score / 100) * 352} 352` }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-3xl font-bold"
                >
                  {results.score}%
                </motion.span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 bg-zinc-800 rounded-xl">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-green-400" />
                <div className="text-lg font-bold text-green-400">{results.correctAnswers}</div>
                <div className="text-xs text-zinc-500">Corretas</div>
              </div>
              <div className="p-4 bg-zinc-800 rounded-xl">
                <XCircle className="h-6 w-6 mx-auto mb-2 text-red-400" />
                <div className="text-lg font-bold text-red-400">{results.incorrectAnswers}</div>
                <div className="text-xs text-zinc-500">Incorretas</div>
              </div>
              <div className="p-4 bg-zinc-800 rounded-xl">
                <Clock className="h-6 w-6 mx-auto mb-2 text-blue-400" />
                <div className="text-lg font-bold">
                  {Math.floor(results.timeSpent / 60)}:{(results.timeSpent % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-zinc-500">Tempo</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <button
                onClick={handleRetry}
                className="flex-1 py-3 bg-zinc-800 rounded-xl font-semibold
                           hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-5 w-5" />
                Tentar Novamente
              </button>
              {results.passed && (
                <button
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl
                             font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <Award className="h-5 w-5" />
                  Ver Certificado
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Example quiz config for demonstration
export const exampleNR35QuizConfig: QuizConfig = {
  title: 'Quiz NR-35 - Trabalho em Altura',
  description: 'Teste seus conhecimentos sobre segurança no trabalho em altura',
  nrCode: 'NR-35',
  passingScore: 70,
  questions: [
    {
      id: 'nr35-q1',
      text: 'Considera-se trabalho em altura toda atividade executada acima de:',
      options: ['1,5 metro', '2 metros', '2,5 metros', '3 metros'],
      correctIndex: 1,
      explanation: 'Conforme a NR-35, considera-se trabalho em altura toda atividade executada acima de 2,00 metros do nível inferior, onde haja risco de queda.',
      difficulty: 'easy',
    },
    {
      id: 'nr35-q2',
      text: 'Qual documento é obrigatório para trabalhos em altura?',
      options: ['Apenas ASO', 'PET - Permissão de Entrada e Trabalho', 'APR - Análise Preliminar de Risco', 'Apenas treinamento'],
      correctIndex: 2,
      explanation: 'A NR-35 exige a elaboração de Análise de Risco, que pode ser realizada através da APR (Análise Preliminar de Risco) antes do início dos trabalhos.',
      difficulty: 'medium',
    },
    {
      id: 'nr35-q3',
      text: 'Qual a carga de treinamento mínima para trabalho em altura?',
      options: ['4 horas', '6 horas', '8 horas', '16 horas'],
      correctIndex: 2,
      explanation: 'O treinamento inicial para trabalho em altura deve ter carga horária mínima de 8 horas, conforme estabelecido na NR-35.',
      difficulty: 'easy',
    },
    {
      id: 'nr35-q4',
      text: 'Qual a validade do treinamento de trabalho em altura?',
      options: ['6 meses', '1 ano', '2 anos', '3 anos'],
      correctIndex: 2,
      explanation: 'O treinamento de trabalho em altura deve ser realizado periodicamente a cada 2 anos e sempre que houver mudança nos procedimentos.',
      difficulty: 'medium',
    },
    {
      id: 'nr35-q5',
      text: 'O que deve ser verificado antes de iniciar trabalho em altura?',
      options: [
        'Apenas condições climáticas',
        'Apenas equipamentos de proteção',
        'Condições de saúde, equipamentos, riscos e condições ambientais',
        'Apenas autorização do supervisor'
      ],
      correctIndex: 2,
      explanation: 'Antes do trabalho em altura, deve-se avaliar as condições de saúde do trabalhador, inspeção dos EPIs, análise de riscos e condições meteorológicas.',
      difficulty: 'hard',
    },
  ],
};

export default NRQuizSystem;
