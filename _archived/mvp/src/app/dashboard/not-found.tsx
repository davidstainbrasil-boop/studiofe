import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function DashboardNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        <FileQuestion className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você está procurando não existe ou foi movida.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/dashboard">Ir para o Dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/projects">Ver Projetos</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
