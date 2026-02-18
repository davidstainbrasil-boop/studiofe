'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderOpen,
  BarChart3,
  Settings,
  Users,
  Shield,
  LogOut,
  ChevronLeft,
  Menu,
  Bell,
  Video,
  Activity,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCurrentUser } from '@/hooks/use-current-user';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projetos', href: '/dashboard/projects', icon: FolderOpen },
  { name: 'Render Jobs', href: '/dashboard/render-jobs', icon: Video },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Notificações', href: '/dashboard/notifications', icon: Bell },
  { name: 'Atividade', href: '/dashboard/activity', icon: Activity },
];

const adminNavigation = [
  { name: 'Usuários', href: '/dashboard/admin/users', icon: Users },
  { name: 'Permissões', href: '/dashboard/admin/roles', icon: Shield },
];

const bottomNavigation = [
  { name: 'Configurações', href: '/dashboard/settings', icon: Settings },
];

function SidebarContent({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { isAdmin } = useCurrentUser();

  return (
    <>
      {/* Main nav */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        {/* Admin section — only visible to admins */}
        {isAdmin && (
          <>
            {!collapsed && (
              <p className="mt-6 mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
                Admin
              </p>
            )}
            {collapsed && <Separator className="my-4" />}
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Bottom nav */}
      <div className="space-y-1 px-2 pb-4">
        <Separator className="mb-2" />
        {bottomNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        <button
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          title={collapsed ? 'Sair' : undefined}
          onClick={() => {
            onNavigate?.();
            window.location.href = '/api/auth/signout';
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </>
  );
}

/** Desktop sidebar — hidden on mobile */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r bg-card transition-all duration-200',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-4">
        {!collapsed && (
          <Link href="/dashboard" className="text-lg font-bold text-primary">
            TécnicoCursos
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <Separator />

      <SidebarContent collapsed={collapsed} />
    </aside>
  );
}

/** Mobile sidebar — Sheet overlay, visible only on small screens */
export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-14 items-center px-4">
          <Link
            href="/dashboard"
            className="text-lg font-bold text-primary"
            onClick={() => setOpen(false)}
          >
            TécnicoCursos
          </Link>
        </div>
        <Separator />
        <SidebarContent collapsed={false} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
