'use client';

/**
 * Mobile Navigation Component
 * 
 * Responsive navigation drawer for mobile devices with:
 * - Hamburger menu toggle
 * - Full-screen navigation drawer
 * - Touch-optimized interactions
 * - Grouped navigation items
 */

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Home,
  Video,
  FileText,
  Settings,
  User,
  BookOpen,
  HelpCircle,
  Upload,
  LayoutDashboard,
  Palette,
  Mic,
  Layers,
  GraduationCap,
  ChevronRight,
  LogOut,
  Bell,
  CreditCard,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// Navigation structure
interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description?: string;
}

interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'main',
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { id: 'projects', label: 'Projetos', href: '/projects', icon: Video },
      { id: 'templates', label: 'Templates NR', href: '/templates', icon: Layers, badge: 'Novo' },
    ],
  },
  {
    id: 'create',
    label: 'Criar',
    items: [
      { id: 'upload', label: 'Upload PPTX', href: '/upload', icon: Upload },
      { id: 'editor', label: 'Studio Pro', href: '/studio-pro', icon: Palette },
      { id: 'tts', label: 'Narração IA', href: '/tts', icon: Mic },
    ],
  },
  {
    id: 'learn',
    label: 'Aprender',
    items: [
      { id: 'courses', label: 'Cursos NR', href: '/courses', icon: GraduationCap },
      { id: 'docs', label: 'Documentação', href: '/docs', icon: BookOpen },
      { id: 'help', label: 'Ajuda', href: '/help', icon: HelpCircle },
    ],
  },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { id: 'profile', label: 'Meu Perfil', href: '/settings/profile', icon: User },
  { id: 'billing', label: 'Assinatura', href: '/settings/billing', icon: CreditCard },
  { id: 'notifications', label: 'Notificações', href: '/settings/notifications', icon: Bell },
  { id: 'security', label: 'Segurança', href: '/settings/security', icon: Shield },
];

interface MobileNavigationProps {
  user?: {
    name?: string | null;
    email?: string | null;
    avatar?: string | null;
  } | null;
  onSignOut?: () => void;
  className?: string;
}

export function MobileNavigation({ user, onSignOut, className }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const toggleMenu = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return (
    <>
      {/* Mobile Header Bar - Only visible on mobile */}
      <header className={cn(
        'md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800',
        className
      )}>
        <div className="flex items-center justify-between h-full px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Video className="w-6 h-6 text-violet-600" />
            <span className="font-bold text-lg">TécnicoCursos</span>
          </Link>

          {/* Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMenu}
            aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
            className="w-10 h-10"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </header>

      {/* Navigation Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.nav
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="md:hidden fixed top-0 right-0 bottom-0 z-50 w-[85%] max-w-sm bg-white dark:bg-gray-950 shadow-2xl overflow-y-auto"
            >
              {/* User Info */}
              <div className="p-4 bg-gradient-to-br from-violet-600 to-indigo-600">
                {user ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border-2 border-white/20">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="bg-white/10 text-white">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">
                        {user.name || 'Usuário'}
                      </p>
                      <p className="text-sm text-white/70 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <Link href="/login">Entrar</Link>
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-white text-violet-600 hover:bg-white/90"
                      asChild
                    >
                      <Link href="/register">Criar Conta</Link>
                    </Button>
                  </div>
                )}
              </div>

              {/* Navigation Groups */}
              <div className="p-4 space-y-6">
                {NAV_GROUPS.map((group) => (
                  <div key={group.id}>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">
                      {group.label}
                    </h3>
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            className={cn(
                              'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors',
                              isActive
                                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                            )}
                          >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            <span className="flex-1 font-medium">{item.label}</span>
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {item.badge}
                              </Badge>
                            )}
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <Separator />

                {/* Account Items */}
                {user && (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2">
                      Conta
                    </h3>
                    <div className="space-y-1">
                      {ACCOUNT_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            className={cn(
                              'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors',
                              isActive
                                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                            )}
                          >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            <span className="flex-1 font-medium">{item.label}</span>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sign Out */}
                {user && onSignOut && (
                  <button
                    onClick={onSignOut}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Sair</span>
                  </button>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 mt-auto border-t border-gray-200 dark:border-gray-800">
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  TécnicoCursos v7 • Estúdio IA
                </p>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Spacer for mobile header */}
      <div className="md:hidden h-14" />
    </>
  );
}

// Mobile Bottom Navigation (for quick actions)
interface BottomNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { id: 'home', label: 'Início', href: '/dashboard', icon: Home },
  { id: 'projects', label: 'Projetos', href: '/projects', icon: Video },
  { id: 'create', label: 'Criar', href: '/upload', icon: Upload },
  { id: 'templates', label: 'Templates', href: '/templates', icon: Layers },
  { id: 'settings', label: 'Mais', href: '/settings', icon: Settings },
];

export function MobileBottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 safe-area-pb">
      <div className="flex items-stretch h-16">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors',
                isActive
                  ? 'text-violet-600 dark:text-violet-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive && 'scale-110')} />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Safe Area Spacer */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

// Hook for mobile detection
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export default MobileNavigation;
