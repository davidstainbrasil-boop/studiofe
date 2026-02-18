'use client';

import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment, useMemo } from 'react';

const pathLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  projects: 'Projetos',
  'render-jobs': 'Render Jobs',
  analytics: 'Analytics',
  notifications: 'Notificações',
  activity: 'Atividade',
  settings: 'Configurações',
  admin: 'Admin',
  users: 'Usuários',
  roles: 'Permissões',
};

export function Breadcrumbs() {
  const pathname = usePathname();

  const crumbs = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    // Remove first 'dashboard' for cleaner breadcrumbs
    if (segments[0] === 'dashboard' && segments.length === 1) return [];

    const items: Array<{ label: string; href: string; isLast: boolean }> = [];
    let currentPath = '';

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      currentPath += `/${segment}`;
      const isLast = i === segments.length - 1;

      // Skip UUIDs in breadcrumbs (show as "Detalhes")
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/.test(segment);
      const label = isUuid ? 'Detalhes' : (pathLabels[segment] || segment);

      items.push({ label, href: currentPath, isLast });
    }

    return items;
  }, [pathname]);

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.map((crumb, index) => (
        <Fragment key={crumb.href}>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="hover:text-foreground transition-colors truncate max-w-[200px]"
            >
              {crumb.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
