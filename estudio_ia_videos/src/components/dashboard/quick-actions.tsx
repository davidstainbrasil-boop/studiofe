'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Plus,
  Upload,
  FileVideo,
  Play,
  BookOpen,
  Zap,
  Layout,
  Mic,
  Image,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

// Types
interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  gradient: string;
}

interface QuickActionsProps {
  className?: string;
}

// Quick actions data
const quickActions: QuickAction[] = [
  {
    id: 'new-project',
    title: 'Novo Projeto',
    description: 'Criar projeto do zero',
    icon: <Plus className="w-6 h-6" />,
    href: '/dashboard/projects/new',
    color: 'text-indigo-600',
    gradient: 'from-indigo-500 to-purple-500',
  },
  {
    id: 'upload-pptx',
    title: 'Upload PPTX',
    description: 'Importar apresentação',
    icon: <Upload className="w-6 h-6" />,
    href: '/dashboard/editor?action=upload',
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'templates',
    title: 'Templates NR',
    description: 'Usar template pronto',
    icon: <Layout className="w-6 h-6" />,
    href: '/dashboard/templates',
    color: 'text-emerald-600',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'ai-generate',
    title: 'Gerar com IA',
    description: 'Criar conteúdo com IA',
    icon: <Sparkles className="w-6 h-6" />,
    href: '/dashboard/ai-assistant',
    color: 'text-amber-600',
    gradient: 'from-amber-500 to-orange-500',
  },
];

// Recent actions (demo data - should come from API/state)
const recentProjects = [
  { id: '1', name: 'NR-35 Trabalho em Altura', updatedAt: '2 horas atrás' },
  { id: '2', name: 'NR-10 Segurança Elétrica', updatedAt: '1 dia atrás' },
  { id: '3', name: 'NR-12 Máquinas e Equipamentos', updatedAt: '3 dias atrás' },
];

// Main component
export function QuickActions({ className = '' }: QuickActionsProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Quick Actions Grid */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Ações Rápidas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={action.href}>
                <div className="group relative bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer overflow-hidden">
                  {/* Gradient background on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-5 transition-opacity`} />
                  
                  <div className={`p-3 rounded-lg bg-gray-100 dark:bg-gray-700 w-fit group-hover:scale-110 transition-transform ${action.color}`}>
                    {action.icon}
                  </div>
                  
                  <h4 className="mt-4 font-medium text-gray-900 dark:text-white">
                    {action.title}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {action.description}
                  </p>
                  
                  <ChevronRight className="absolute bottom-4 right-4 w-5 h-5 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Continue Working */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Continuar Trabalhando
          </h3>
          <Link
            href="/dashboard/projects"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Ver todos →
          </Link>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {recentProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              <Link
                href={`/dashboard/editor?project=${project.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                    <FileVideo className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {project.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Editado {project.updatedAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <Play className="w-4 h-4 text-gray-500" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-gray-300" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Learning Resources */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recursos de Aprendizado
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Tutorial: Primeiro Vídeo',
              duration: '5 min',
              icon: Play,
              color: 'bg-blue-100 text-blue-600',
            },
            {
              title: 'Guia: Templates NR',
              duration: '10 min',
              icon: BookOpen,
              color: 'bg-emerald-100 text-emerald-600',
            },
            {
              title: 'Dicas: Narração IA',
              duration: '7 min',
              icon: Mic,
              color: 'bg-purple-100 text-purple-600',
            },
          ].map((resource, index) => (
            <motion.button
              key={resource.title}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + index * 0.1 }}
              className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-left"
            >
              <div className={`p-2 rounded-lg ${resource.color}`}>
                <resource.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {resource.title}
                </p>
                <p className="text-xs text-gray-500">
                  {resource.duration}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default QuickActions;
