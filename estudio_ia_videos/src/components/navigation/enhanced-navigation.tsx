
'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@lib/utils'
import { Button } from '@components/ui/button'
import { ScrollArea } from '@components/ui/scroll-area'
import { Separator } from '@components/ui/separator'
import { Badge } from '@components/ui/badge'
import {
  Home,
  Video,
  Bot,
  FileText,
  Upload,
  Settings,
  BarChart3,
  Users,
  Zap,
  Brain,
  Palette,
  Target,
  Sparkles,
  Layout,
  TrendingUp,
  Mic,
  Camera,
  Play,
  Folder,
  Search,
  Bell,
  User,
  ChevronDown,
  ChevronRight,
  Star
} from 'lucide-react'

interface NavigationItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string
  isNew?: boolean
  isPremium?: boolean
  children?: NavigationItem[]
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: Home
  },
  {
    title: 'IA Assistant',
    href: '/ai-assistant',
    icon: Brain,
    badge: 'NEW',
    isNew: true,
    isPremium: true
  },
  {
    title: 'Estúdios',
    href: '#',
    icon: Video,
    children: [
      {
        title: 'PPTX Studio',
        href: '/pptx-preview',
        icon: FileText,
        badge: 'PRO'
      },
      {
        title: 'Avatar 3D Studio',
        href: '/avatar-system-real',
        icon: Bot,
        badge: 'PREMIUM'
      },
      {
        title: 'Voice Studio Professional',
        href: '/elevenlabs-professional-studio',
        icon: Mic,
        badge: 'PREMIUM'
      },
      {
        title: 'Studio Pro',
        href: '/studio-pro',
        icon: Palette,
        badge: 'PRO'
      },
      {
        title: 'Video Pipeline',
        href: '/advanced-video-pipeline',
        icon: Camera,
        badge: 'PRO'
      }
    ]
  },
  {
    title: 'Templates Inteligentes',
    href: '/smart-templates',
    icon: Sparkles,
    badge: 'NEW',
    isNew: true
  },
  {
    title: 'Auto Layout',
    href: '/auto-layout',
    icon: Layout,
    badge: 'IA',
    isNew: true
  },
  {
    title: 'Analytics & Insights',
    href: '#',
    icon: BarChart3,
    children: [
      {
        title: 'Content Analysis',
        href: '/content-analytics',
        icon: TrendingUp,
        badge: 'NEW',
        isNew: true
      },
      {
        title: 'Performance Dashboard',
        href: '/performance',
        icon: Target
      },
      {
        title: 'Behavioral Analytics',
        href: '/dashboard/analytics',
        icon: Users,
        badge: 'PRO'
      }
    ]
  },
  {
    title: 'Upload & Processing',
    href: '#',
    icon: Upload,
    children: [
      {
        title: 'Importar PPTX',
        href: '/pptx',
        icon: FileText
      },
      {
        title: 'Render Studio',
        href: '/render-dashboard',
        icon: Play
      },
      {
        title: 'Biblioteca de Assets',
        href: '/asset-library-studio',
        icon: Folder
      }
    ]
  },
  {
    title: 'Colaboração',
    href: '#',
    icon: Users,
    badge: 'BETA',
    children: [
      {
        title: 'Salas Colaborativas',
        href: '/real-time-collaboration',
        icon: Users,
        badge: 'BETA'
      },
      {
        title: 'Comentários',
        href: '/comments',
        icon: Bell,
        badge: 'COMING'
      }
    ]
  },
  {
    title: 'Configurações',
    href: '/settings/security',
    icon: Settings
  }
]

export default function EnhancedNavigation() {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Estúdios'])

  const toggleExpanded = (title: string) => {
    setExpandedItems((prev: string[]) =>
      prev.includes(title)
        ? prev.filter((item: string) => item !== title)
        : [...prev, title]
    )
  }

  const getBadgeVariant = (badge?: string) => {
    switch (badge) {
      case 'NEW': return 'default'
      case 'PRO': return 'secondary'
      case 'PREMIUM': return 'default'
      case 'BETA': return 'outline'
      case 'IA': return 'default'
      case 'V3': return 'secondary'
      case 'COMING': return 'outline'
      default: return 'outline'
    }
  }

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case 'NEW': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'PRO': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'PREMIUM': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'BETA': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'IA': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'V3': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
      case 'COMING': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default: return ''
    }
  }

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.title)
    const isActive = pathname === item.href || (hasChildren && item.children?.some(child => pathname === child.href))

    if (hasChildren) {
      return (
        <div key={item.title} className="space-y-1">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start px-2 h-9 font-medium",
              level > 0 && "ml-4 w-[calc(100%-1rem)]",
              isActive && "bg-accent text-accent-foreground"
            )}
            onClick={() => toggleExpanded(item.title)}
          >
            {React.createElement(item.icon, { className: "mr-3 h-4 w-4 shrink-0" })}
            <span className="truncate flex-1 text-left">{item.title}</span>
            {item.badge && (
              <Badge
                variant={getBadgeVariant(item.badge)}
                className={cn("ml-2 text-xs h-5", getBadgeColor(item.badge))}
              >
                {item.badge}
              </Badge>
            )}
            {item.isNew && (
              <Star className="ml-2 h-3 w-3 text-yellow-500 fill-current" />
            )}
            {isExpanded ? (
              <ChevronDown className="ml-2 h-4 w-4" />
            ) : (
              <ChevronRight className="ml-2 h-4 w-4" />
            )}
          </Button>
          {isExpanded && item.children && (
            <div className="space-y-1">
              {item.children.map(child => renderNavigationItem(child, level + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link key={item.href} href={item.href}>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start px-2 h-9 font-medium",
            level > 0 && "ml-4 w-[calc(100%-1rem)]",
            pathname === item.href && "bg-accent text-accent-foreground"
          )}
        >
          {React.createElement(item.icon, { className: "mr-3 h-4 w-4 shrink-0" })}
          <span className="truncate flex-1 text-left">{item.title}</span>
          {item.badge && (
            <Badge
              variant={getBadgeVariant(item.badge)}
              className={cn("ml-2 text-xs h-5", getBadgeColor(item.badge))}
            >
              {item.badge}
            </Badge>
          )}
          {item.isNew && (
            <Star className="ml-2 h-3 w-3 text-yellow-500 fill-current" />
          )}
        </Button>
      </Link>
    )
  }

  return (
    <div className="pb-12 bg-white h-full border-r">
      <div className="flex h-16 items-center px-6 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Estúdio IA
          </span>
        </div>
      </div>

      <div className="space-y-4 py-4">
        <div className="px-3">
          <div className="space-y-1">
            {/* Quick Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar menu..."
                className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <ScrollArea className="h-[calc(100vh-10rem)]">
              <div className="space-y-2">
                {navigationItems.map(item => renderNavigationItem(item))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}
