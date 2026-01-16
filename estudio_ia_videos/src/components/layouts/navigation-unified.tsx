
'use client'

/**
 * 🧭 NAVEGAÇÃO UNIFICADA - Produção
 * Sistema reorganizado com fluxo único e UX simplificada
 * Elimina duplicatas e cria experiência intuitiva
 */

import React from 'react'
import {
  Home,
  Upload,
  Edit3,
  Users,
  Video,
  BarChart3,
  Settings,
  TestTube,
  Building,
  Crown,
  Shield,
  Mic,
  Play,
  Download,
  Share2,
  Folder,
  Brain,
  Target,
  Palette,
  Link2,
  Users2,
  Database,
  Cloud,
  Zap,
  FileVideo,
  TrendingUp,
  Activity,
  Award,
  Layers,
  Sparkles,
  Workflow,
  Server,
  Lock,
  Gamepad2,
  Code,
  Eye,
  PersonStanding,
  Layers3,
  GamepadIcon
} from 'lucide-react'

// Interface da estrutura de navegação
interface NavItem {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  badge?: string | number
  status?: 'production' | 'active' | 'beta' | 'lab'
  children?: NavItem[]
  description?: string
}

// 🎯 NAVEGAÇÃO REORGANIZADA - PRODUÇÃO
export const navigationUnified: NavItem[] = [
  // === 🎬 ESTÚDIO (FLUXO PRINCIPAL) ===
  {
    id: 'studio',
    title: 'Estúdio',
    icon: Video,
    status: 'production',
    children: [
      {
        id: 'dashboard',
        title: 'Dashboard Central',
        icon: Home,
        href: '/',
        status: 'production',
        description: 'Painel principal com projetos e KPIs'
      },
      {
        id: 'upload-pptx-único',
        title: 'Upload PPTX',
        icon: Upload,
        href: '/pptx',
        status: 'production',
        description: 'Único ponto de upload - processa e redireciona para editor',
        badge: 'ÚNICO'
      },
      {
        id: 'editor-timeline',
        title: 'Editor & Timeline',
        icon: Edit3,
        status: 'active',
        children: [
          {
            id: 'canvas-editor-pro',
            title: 'Canvas Editor Pro',
            icon: Edit3,
            href: '/canvas-editor-pro',
            status: 'production',
            badge: 'V3'
          },
          {
            id: 'timeline-professional',
            title: 'Timeline Pro',
            icon: Play,
            href: '/timeline-editor-studio',
            status: 'active'
          }
        ]
      },
      {
        id: 'avatares-tts',
        title: 'Avatares & TTS',
        icon: Users,
        status: 'production',
        children: [
          {
            id: 'talking-photo-pro',
            title: 'Talking Photo Pro',
            icon: Users,
            href: '/talking-photo-pro',
            status: 'production'
          },
          {
            id: 'avatar-3d-hyperreal',
            title: 'Avatar 3D Hyperreal',
            icon: Crown,
            href: '/avatar-system-real',
            status: 'production'
          },
          {
            id: 'elevenlabs-studio',
            title: 'ElevenLabs Studio',
            icon: Mic,
            href: '/elevenlabs-professional-studio',
            status: 'production',
            badge: '29 Vozes'
          },
          {
            id: 'voice-cloning-pro',
            title: 'Voice Cloning Pro',
            icon: Brain,
            href: '/voice-cloning-studio',
            status: 'production'
          }
        ]
      },
      {
        id: 'preview-export',
        title: 'Preview & Export',
        icon: Play,
        status: 'production',
        children: [
          {
            id: 'video-preview',
            title: 'Video Preview',
            icon: Play,
            href: '/video-studio',
            status: 'production'
          },
          {
            id: 'render-pipeline',
            title: 'Render Pipeline',
            icon: Zap,
            href: '/advanced-video-pipeline',
            status: 'production'
          },
          {
            id: 'export-formats',
            title: 'Export Multi-Format',
            icon: Download,
            href: '/export-pipeline-studio',
            status: 'production'
          }
        ]
      }
    ]
  },

  // === 🚀 SPRINT 24 - TIMELINE & COLLABORATION ===
  {
    id: 'sprint24',
    title: 'Sprint 24 - Novidades',
    icon: Zap,
    status: 'production',
    badge: 'NEW',
    children: [
      {
        id: 'timeline-multi-track',
        title: 'Timeline Multi-Track Editor',
        icon: Layers3,
        href: '/timeline-multi-track',
        status: 'production',
        description: 'Editor profissional de timeline com keyframes avançados',
        badge: 'NEW'
      },
      {
        id: 'interactive-elements',
        title: 'Interactive Elements Engine',
        icon: GamepadIcon,
        href: '/interactive-elements',
        status: 'production',
        description: 'Sistema de elementos interativos e gamificação',
        badge: 'NEW'
      },
      {
        id: 'real-time-collaboration',
        title: 'Real-time Collaboration',
        icon: Users2,
        href: '/real-time-collaboration',
        status: 'production',
        description: 'Colaboração em tempo real para equipes',
        badge: 'NEW'
      }
    ]
  },

  // === 🤖 SPRINT 23 - IA ASSISTANT ===
  {
    id: 'sprint23',
    title: 'Sprint 23 - IA Assistant',
    icon: Brain,
    status: 'production',
    children: [
      {
        id: 'ai-assistant',
        title: 'IA Content Assistant',
        icon: Brain,
        href: '/ai-assistant',
        status: 'production',
        description: 'Assistente IA para análise e otimização de conteúdo',
        badge: 'IA'
      },
      {
        id: 'smart-templates',
        title: 'Smart NR Templates',
        icon: Shield,
        href: '/smart-templates',
        status: 'production',
        description: 'Templates inteligentes com compliance automático'
      },
      {
        id: 'content-analytics',
        title: 'Content Analysis Engine',
        icon: BarChart3,
        href: '/content-analytics',
        status: 'production',
        description: 'Engine avançado de análise de conteúdo'
      },
      {
        id: 'auto-layout',
        title: 'Auto Layout System',
        icon: Palette,
        href: '/auto-layout',
        status: 'production',
        description: 'Sistema de layout automático com IA'
      }
    ]
  },

  // === 📊 GESTÃO & AUTOMAÇÃO ===
  {
    id: 'management',
    title: 'Gestão & Automação',
    icon: BarChart3,
    status: 'production',
    children: [
      {
        id: 'projects-library',
        title: 'Projetos & Biblioteca',
        icon: Folder,
        status: 'production',
        children: [
          {
            id: 'projects-dashboard',
            title: 'Meus Projetos',
            icon: Folder,
            href: '/projects',
            status: 'production'
          },
          {
            id: 'templates-nr',
            title: 'Templates NR',
            icon: Shield,
            href: '/smart-nr-templates',
            status: 'production',
            badge: 'Compliance'
          },
          {
            id: 'media-library',
            title: 'Biblioteca de Mídia',
            icon: Database,
            href: '/asset-library-studio',
            status: 'active'
          }
        ]
      },
      {
        id: 'analytics-metrics',
        title: 'Analytics & Métricas',
        icon: TrendingUp,
        status: 'production',
        children: [
          {
            id: 'performance-dashboard',
            title: 'Dashboard Performance',
            icon: Activity,
            href: '/admin/metrics',
            status: 'production'
          },
          {
            id: 'video-analytics',
            title: 'Analytics de Vídeo',
            icon: Eye,
            href: '/admin/pptx-metrics',
            status: 'production'
          },
          {
            id: 'user-engagement',
            title: 'Engajamento',
            icon: Target,
            href: '/dashboard/analytics',
            status: 'active'
          }
        ]
      },
      {
        id: 'ai-automation',
        title: 'IA & Automação',
        icon: Brain,
        status: 'active',
        children: [
          {
            id: 'ai-content-assistant',
            title: 'AI Content Assistant',
            icon: Sparkles,
            href: '/ai-assistant',
            status: 'beta'
          },
          {
            id: 'smart-templates',
            title: 'Templates Inteligentes',
            icon: Brain,
            href: '/smart-templates',
            status: 'beta'
          },
          {
            id: 'workflow-automation',
            title: 'Automação de Workflow',
            icon: Workflow,
            href: '/batch-processing',
            status: 'beta'
          }
        ]
      }
    ]
  },

  // === 🏢 ENTERPRISE FEATURES ===
  {
    id: 'enterprise',
    title: 'Enterprise',
    icon: Building,
    status: 'production',
    children: [
      {
        id: 'enterprise-dashboard',
        title: 'Enterprise Dashboard',
        icon: Building,
        href: '/enterprise-integration',
        status: 'production'
      },
      {
        id: 'collaboration-pro',
        title: 'Colaboração Pro',
        icon: Users2,
        href: '/real-time-collaboration',
        status: 'active'
      },
      {
        id: 'security-compliance',
        title: 'Security & Compliance',
        icon: Shield,
        href: '/dashboard/security-analytics',
        status: 'active'
      },
      {
        id: 'sso-integration',
        title: 'SSO Integration',
        icon: Lock,
        href: '/integrations',
        status: 'active'
      }
    ]
  },

  // === ⚙️ CONFIGURAÇÕES ===
  {
    id: 'settings',
    title: 'Configurações',
    icon: Settings,
    status: 'production',
    children: [
      {
        id: 'branding-ui',
        title: 'Branding & UI',
        icon: Palette,
        status: 'active',
        children: [
          {
            id: 'theme-config',
            title: 'Temas & Cores',
            icon: Palette,
            href: '/admin/configuracoes#themes',
            status: 'production'
          },
          {
            id: 'whitelabel-config',
            title: 'Whitelabel',
            icon: Crown,
            href: '/brand-kit',
            status: 'beta'
          }
        ]
      },
      {
        id: 'integrations',
        title: 'Integrações',
        icon: Link2,
        status: 'production',
        children: [
          {
            id: 'api-integrations',
            title: 'APIs & Webhooks',
            icon: Link2,
            href: '/admin/configuracoes#apis',
            status: 'production'
          },
          {
            id: 'cloud-storage',
            title: 'Cloud Storage',
            icon: Cloud,
            href: '/admin/configuracoes#storage',
            status: 'production'
          }
        ]
      },
      {
        id: 'users-permissions',
        title: 'Usuários & Permissões',
        icon: Users2,
        status: 'production',
        children: [
          {
            id: 'user-management',
            title: 'Gestão de Usuários',
            icon: Users2,
            href: '/admin/configuracoes#users',
            status: 'production'
          },
          {
            id: 'roles-permissions',
            title: 'Roles & Permissões',
            icon: Shield,
            href: '/admin/configuracoes#permissions',
            status: 'active'
          }
        ]
      },
      {
        id: 'system-config',
        title: 'Sistema',
        icon: Server,
        status: 'production',
        children: [
          {
            id: 'system-monitor',
            title: 'Monitor do Sistema',
            icon: Activity,
            href: '/admin/monitoring',
            status: 'production'
          },
          {
            id: 'database-config',
            title: 'Database & Storage',
            icon: Database,
            href: '/admin/configuracoes#database',
            status: 'production'
          }
        ]
      }
    ]
  },

  // === 🧪 LABS (BETA FEATURES) ===
  {
    id: 'labs',
    title: 'Labs',
    icon: TestTube,
    status: 'beta',
    badge: 'BETA',
    children: [
      {
        id: 'experimental',
        title: 'Recursos Experimentais',
        icon: TestTube,
        status: 'beta',
        children: [
          {
            id: 'advanced-ai',
            title: 'IA Avançada',
            icon: Brain,
            href: '/ai-features',
            status: 'lab',
            badge: 'Experimental'
          },
          {
            id: 'gamification-lab',
            title: 'Gamificação',
            icon: Gamepad2,
            href: '/interactive-elements',
            status: 'lab'
          }
        ]
      },
      {
        id: 'mockups-prototypes',
        title: 'Mockups & Protótipos',
        icon: Layers,
        status: 'lab',
        children: [
          {
            id: 'editor-animaker-demo',
            title: 'Animaker Clone Demo',
            icon: Edit3,
            href: '/editor-animaker',
            status: 'lab',
            badge: 'Mockup'
          }
        ]
      },
      {
        id: 'dev-tools',
        title: 'Ferramentas de Dev',
        icon: Code,
        status: 'lab',
        children: [
          {
            id: 'api-evolution',
            title: 'API Keys',
            icon: Code,
            href: '/api-keys',
            status: 'lab'
          },
          {
            id: 'ml-ops-lab',
            title: 'System Control',
            icon: Brain,
            href: '/system-control',
            status: 'lab'
          }
        ]
      }
    ]
  }
]

// Status colors and texts
export const getStatusConfig = (status?: string) => {
  switch (status) {
    case 'production':
      return {
        color: 'text-green-600 bg-green-100 border-green-200',
        text: '✅',
        label: 'Produção'
      }
    case 'active':
      return {
        color: 'text-blue-600 bg-blue-100 border-blue-200',
        text: '✓',
        label: 'Ativo'
      }
    case 'beta':
      return {
        color: 'text-orange-600 bg-orange-100 border-orange-200',
        text: '⚡',
        label: 'Beta'
      }
    case 'lab':
      return {
        color: 'text-purple-600 bg-purple-100 border-purple-200',
        text: '🧪',
        label: 'Lab'
      }
    default:
      return {
        color: 'text-gray-600 bg-gray-100 border-gray-200',
        text: '○',
        label: 'Dev'
      }
  }
}

export default navigationUnified
