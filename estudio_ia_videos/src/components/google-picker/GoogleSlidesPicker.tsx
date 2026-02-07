/**
 * GoogleSlidesPicker - Select presentations from Google Drive
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Search,
  Presentation,
  Check,
  ExternalLink,
  RefreshCw,
  LogIn,
} from 'lucide-react';

interface Presentation {
  id: string;
  name: string;
  thumbnailUrl?: string;
  modifiedTime: string;
}

interface GoogleSlidesPickerProps {
  onSelect: (presentationId: string, name: string) => void;
  isConnected?: boolean;
}

export function GoogleSlidesPicker({ onSelect, isConnected }: GoogleSlidesPickerProps) {
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Fetch presentations on mount
  useEffect(() => {
    if (isConnected) {
      fetchPresentations();
    }
  }, [isConnected]);

  const fetchPresentations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/google/import-slides');

      if (!response.ok) {
        if (response.status === 401) {
          setError('Sessão expirada. Reconecte sua conta Google.');
          return;
        }
        throw new Error('Failed to fetch presentations');
      }

      const data = await response.json();
      setPresentations(data.presentations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar apresentações');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConnect = () => {
    // Redirect to Google OAuth
    window.location.href = '/api/google/auth';
  };

  const handleImport = async () => {
    if (!selected) return;

    setImporting(true);
    setError(null);

    try {
      const response = await fetch('/api/google/import-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presentationId: selected }),
      });

      if (!response.ok) {
        throw new Error('Failed to import presentation');
      }

      const selectedPresentation = presentations.find((p) => p.id === selected);
      onSelect(selected, selectedPresentation?.name || 'Presentation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar apresentação');
    } finally {
      setImporting(false);
    }
  };

  // Filter presentations by search
  const filteredPresentations = presentations.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Not connected state
  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
          <Presentation className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Conectar ao Google</h3>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Conecte sua conta Google para importar apresentações do Google Slides
        </p>
        <Button onClick={handleConnect} size="lg">
          <LogIn className="w-5 h-5 mr-2" />
          Conectar com Google
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Refresh */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar apresentações..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon" onClick={fetchPresentations} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Presentations Grid */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[350px] overflow-y-auto">
          {filteredPresentations.map((presentation) => (
            <div
              key={presentation.id}
              onClick={() => setSelected(presentation.id)}
              className={cn(
                'group relative rounded-lg border-2 overflow-hidden cursor-pointer transition-all',
                selected === presentation.id
                  ? 'border-blue-500 ring-2 ring-blue-500/20'
                  : 'border-transparent hover:border-muted-foreground/30'
              )}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-muted relative">
                {presentation.thumbnailUrl ? (
                  <img
                    src={presentation.thumbnailUrl}
                    alt={presentation.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Presentation className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}

                {/* Selected Indicator */}
                {selected === presentation.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-2 bg-card">
                <div className="font-medium text-sm truncate">{presentation.name}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(presentation.modifiedTime).toLocaleDateString('pt-BR')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!loading && filteredPresentations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Presentation className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhuma apresentação encontrada</p>
        </div>
      )}

      {/* Import Button */}
      {selected && (
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleImport} disabled={importing}>
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Presentation className="w-4 h-4 mr-2" />
                Importar Apresentação
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
