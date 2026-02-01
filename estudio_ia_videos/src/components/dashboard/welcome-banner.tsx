'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ArrowRight, Play, BookOpen, Zap } from 'lucide-react';
import Link from 'next/link';

interface WelcomeBannerProps {
  userName?: string;
  onDismiss?: () => void;
  className?: string;
}

export function WelcomeBanner({ userName, onDismiss, className = '' }: WelcomeBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [step, setStep] = useState(0);

  // Check localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem('welcome_banner_dismissed');
    if (dismissed) {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('welcome_banner_dismissed', 'true');
    onDismiss?.();
  };

  const steps = [
    {
      title: 'Faça upload de um PPTX',
      description: 'Comece importando sua apresentação PowerPoint',
      icon: Play,
      href: '/dashboard/editor?action=upload',
    },
    {
      title: 'Escolha um template NR',
      description: 'Use templates prontos para normas regulamentadoras',
      icon: BookOpen,
      href: '/dashboard/templates',
    },
    {
      title: 'Gere narração com IA',
      description: 'Adicione voz profissional aos seus vídeos',
      icon: Zap,
      href: '/dashboard/ai-assistant',
    },
  ];

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`relative bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-2xl p-6 md:p-8 overflow-hidden ${className}`}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-white/10">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                {userName ? `Bem-vindo, ${userName}!` : 'Bem-vindo ao Estúdio!'}
              </h2>
              <p className="text-white/80 text-sm md:text-base">
                Vamos criar seu primeiro vídeo de treinamento?
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {steps.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={item.href}>
                  <div className="group bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-all cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white font-bold text-sm">
                        {index + 1}
                      </span>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-white font-medium">{item.title}</h3>
                    <p className="text-white/70 text-sm mt-1">{item.description}</p>
                    <ArrowRight className="w-5 h-5 text-white/50 mt-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4 mt-6">
            <Link href="/dashboard/editor?action=upload">
              <button className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-white/90 transition-colors flex items-center gap-2">
                Começar Agora
                <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white text-sm font-medium"
            >
              Mostrar depois
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default WelcomeBanner;
