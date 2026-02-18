'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  LayoutDashboard,
  FolderOpen,
  BarChart3,
  Settings,
  Bell,
  Users,
  Shield,
  Search,
  Plus,
  Video,
  Activity,
} from 'lucide-react';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrentUser } from '@/hooks/use-current-user';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  keywords?: string[];
  section: string;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { isAdmin } = useCurrentUser();

  useKeyboardShortcuts([
    {
      key: 'mod+k',
      handler: () => setOpen((prev) => !prev),
      preventDefault: true,
    },
  ]);

  const commands: Command[] = useMemo(
    () => [
      // Navigation
      {
        id: 'nav-dashboard',
        label: 'Dashboard',
        description: 'Ir para o dashboard principal',
        icon: LayoutDashboard,
        action: () => router.push('/dashboard'),
        keywords: ['home', 'início', 'main'],
        section: 'Navegação',
      },
      {
        id: 'nav-projects',
        label: 'Projetos',
        description: 'Ver lista de projetos',
        icon: FolderOpen,
        action: () => router.push('/dashboard/projects'),
        keywords: ['projeto', 'list', 'lista'],
        section: 'Navegação',
      },
      {
        id: 'nav-analytics',
        label: 'Analytics',
        description: 'Ver métricas e gráficos',
        icon: BarChart3,
        action: () => router.push('/dashboard/analytics'),
        keywords: ['métricas', 'stats', 'estatísticas', 'gráfico'],
        section: 'Navegação',
      },
      {
        id: 'nav-notifications',
        label: 'Notificações',
        description: 'Central de notificações',
        icon: Bell,
        action: () => router.push('/dashboard/notifications'),
        keywords: ['alertas', 'avisos'],
        section: 'Navegação',
      },
      {
        id: 'nav-settings',
        label: 'Configurações',
        description: 'Perfil e preferências',
        icon: Settings,
        action: () => router.push('/dashboard/settings'),
        keywords: ['perfil', 'conta', 'profile', 'preferências'],
        section: 'Navegação',
      },
      // Actions
      {
        id: 'act-new-project',
        label: 'Criar Projeto',
        description: 'Começar um novo projeto de vídeo',
        icon: Plus,
        action: () => router.push('/dashboard/projects?action=create'),
        keywords: ['novo', 'new', 'criar', 'create'],
        section: 'Ações',
      },
      {
        id: 'act-search-projects',
        label: 'Buscar Projetos',
        description: 'Pesquisar nos projetos existentes',
        icon: Search,
        action: () => router.push('/dashboard/projects?focus=search'),
        keywords: ['pesquisar', 'find', 'procurar'],
        section: 'Ações',
      },
      {
        id: 'act-render-jobs',
        label: 'Render Jobs',
        description: 'Ver todos os jobs de renderização',
        icon: Video,
        action: () => router.push('/dashboard/render-jobs'),
        keywords: ['render', 'vídeo', 'job', 'renderização'],
        section: 'Ações',
      },
      {
        id: 'nav-activity',
        label: 'Atividade',
        description: 'Ver histórico de ações',
        icon: Activity,
        action: () => router.push('/dashboard/activity'),
        keywords: ['atividade', 'histórico', 'log', 'timeline', 'ações'],
        section: 'Navegação',
      },
      // Admin
      {
        id: 'admin-users',
        label: 'Gerenciar Usuários',
        description: 'Administração de usuários',
        icon: Users,
        action: () => router.push('/dashboard/admin/users'),
        keywords: ['admin', 'user', 'gerenciar'],
        section: 'Admin',
      },
      {
        id: 'admin-roles',
        label: 'Permissões',
        description: 'Gerenciar roles e permissões',
        icon: Shield,
        action: () => router.push('/dashboard/admin/roles'),
        keywords: ['admin', 'role', 'permissão'],
        section: 'Admin',
      },
    ],
    [router]
  );

  // Filter out admin commands for non-admin users
  const availableCommands = useMemo(() => {
    if (isAdmin) return commands;
    return commands.filter((cmd) => cmd.section !== 'Admin');
  }, [commands, isAdmin]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return availableCommands;
    const q = query.toLowerCase();
    return availableCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description?.toLowerCase().includes(q) ||
        cmd.keywords?.some((k) => k.includes(q))
    );
  }, [availableCommands, query]);

  // Reset selection when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  // Reset query when dialog opens
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const runCommand = (cmd: Command) => {
    setOpen(false);
    cmd.action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
      e.preventDefault();
      runCommand(filteredCommands[selectedIndex]);
    }
  };

  // Group commands by section
  const sections = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of filteredCommands) {
      const list = map.get(cmd.section) || [];
      list.push(cmd);
      map.set(cmd.section, list);
    }
    return map;
  }, [filteredCommands]);

  let flatIndex = 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-lg">
        <div className="flex items-center border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          <Input
            placeholder="Buscar comandos... (⌘K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-11"
            autoFocus
          />
        </div>

        <ScrollArea className="max-h-72">
          {filteredCommands.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum comando encontrado.
            </div>
          ) : (
            <div className="p-1">
              {Array.from(sections.entries()).map(([section, cmds]) => (
                <div key={section}>
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    {section}
                  </p>
                  {cmds.map((cmd) => {
                    const currentIndex = flatIndex++;
                    const isSelected = currentIndex === selectedIndex;
                    return (
                      <button
                        key={cmd.id}
                        className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                          isSelected
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent/50'
                        }`}
                        onClick={() => runCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                      >
                        <cmd.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 text-left">
                          <span className="font-medium">{cmd.label}</span>
                          {cmd.description && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {cmd.description}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
