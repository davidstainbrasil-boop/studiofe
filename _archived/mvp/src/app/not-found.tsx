import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto max-w-md text-center">
        <FileQuestion className="mx-auto h-16 w-16 text-muted-foreground" />
        <h1 className="mt-4 text-4xl font-bold">404</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Página não encontrada
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          O conteúdo que você procura não existe ou foi movido.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Voltar ao Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
