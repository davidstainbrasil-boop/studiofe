'use client';

import { Bell, Search, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeToggle } from '@/components/theme-toggle';
import { useNotifications } from '@/hooks/use-notifications';
import { useCurrentUser } from '@/hooks/use-current-user';
import { formatRelativeTime } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { MobileSidebar } from '@/components/dashboard/sidebar';

export function DashboardHeader() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { notifications, unreadCount, markAsRead } = useNotifications(20);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || '??';

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const query = (e.target as HTMLInputElement).value.trim();
      if (query) {
        router.push(`/dashboard/projects?search=${encodeURIComponent(query)}`);
      }
    }
  };

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:px-6">
      {/* Mobile menu + Search */}
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <MobileSidebar />
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar projetos... (Enter para buscar)"
            className="pl-9"
            onKeyDown={handleSearch}
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <ThemeToggle />

        {/* Notifications dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-semibold">Notificações</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-0 px-1 text-xs text-muted-foreground"
                  onClick={() => markAsRead()}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Marcar todas como lida
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                Nenhuma notificação
              </div>
            ) : (
              <ScrollArea className="max-h-72">
                <div className="p-1">
                  {notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      className="flex flex-col items-start gap-1 px-3 py-2 cursor-pointer"
                      onClick={() => {
                        if (!n.read) markAsRead([n.id]);
                      }}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate">{n.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground line-clamp-2 pl-4">
                        {n.message}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60 pl-4">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
              </ScrollArea>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="justify-center text-xs text-muted-foreground">
              <a href="/dashboard/notifications">Ver todas as notificações</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:inline">
                {user?.name || user?.email || 'Carregando...'}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>
              <span className="text-xs text-muted-foreground">{user?.email}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/dashboard/settings">Configurações</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                window.location.href = '/api/auth/signout';
              }}
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
