'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Keyboard,
  Command,
  MousePointer2,
  Video,
  Edit3,
  Eye,
  Download,
  Search,
  ChevronRight,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortcutCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  shortcuts: ShortcutItem[];
}

interface ShortcutItem {
  id: string;
  name: string;
  description: string;
  keys: string[];
  context?: string;
}

const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const modKey = isMac ? '⌘' : 'Ctrl';
const altKey = isMac ? '⌥' : 'Alt';

const shortcutCategories: ShortcutCategory[] = [
  {
    id: 'file',
    name: 'Arquivo',
    icon: <Command className="h-4 w-4" />,
    shortcuts: [
      {
        id: 'save',
        name: 'Salvar Projeto',
        description: 'Salva todas as alterações do projeto atual',
        keys: [modKey, 'S'],
      },
      {
        id: 'export',
        name: 'Exportar Vídeo',
        description: 'Abre o diálogo de exportação de vídeo',
        keys: [modKey, 'E'],
      },
      {
        id: 'new',
        name: 'Novo Projeto',
        description: 'Cria um novo projeto em branco',
        keys: [modKey, 'N'],
      },
      {
        id: 'open',
        name: 'Abrir Projeto',
        description: 'Abre um projeto existente',
        keys: [modKey, 'O'],
      },
      {
        id: 'duplicate',
        name: 'Duplicar Projeto',
        description: 'Cria uma cópia do projeto atual',
        keys: [modKey, 'Shift', 'D'],
      },
    ],
  },
  {
    id: 'edit',
    name: 'Edição',
    icon: <Edit3 className="h-4 w-4" />,
    shortcuts: [
      {
        id: 'undo',
        name: 'Desfazer',
        description: 'Desfaz a última ação',
        keys: [modKey, 'Z'],
      },
      {
        id: 'redo',
        name: 'Refazer',
        description: 'Refaz a última ação desfeita',
        keys: [modKey, 'Shift', 'Z'],
      },
      {
        id: 'copy',
        name: 'Copiar',
        description: 'Copia o elemento selecionado',
        keys: [modKey, 'C'],
      },
      {
        id: 'paste',
        name: 'Colar',
        description: 'Cola o elemento copiado',
        keys: [modKey, 'V'],
      },
      {
        id: 'cut',
        name: 'Recortar',
        description: 'Recorta o elemento selecionado',
        keys: [modKey, 'X'],
      },
      {
        id: 'delete',
        name: 'Excluir',
        description: 'Exclui o elemento selecionado',
        keys: ['Delete'],
      },
      {
        id: 'selectAll',
        name: 'Selecionar Tudo',
        description: 'Seleciona todos os elementos',
        keys: [modKey, 'A'],
      },
    ],
  },
  {
    id: 'playback',
    name: 'Reprodução',
    icon: <Video className="h-4 w-4" />,
    shortcuts: [
      {
        id: 'playPause',
        name: 'Play/Pause',
        description: 'Inicia ou pausa a reprodução do vídeo',
        keys: ['Space'],
      },
      {
        id: 'stop',
        name: 'Parar',
        description: 'Para a reprodução e volta ao início',
        keys: ['S'],
      },
      {
        id: 'preview',
        name: 'Preview Rápido',
        description: 'Abre preview do slide atual',
        keys: [modKey, 'P'],
      },
      {
        id: 'fullscreen',
        name: 'Tela Cheia',
        description: 'Alterna modo de tela cheia',
        keys: ['F'],
      },
    ],
  },
  {
    id: 'navigation',
    name: 'Navegação',
    icon: <MousePointer2 className="h-4 w-4" />,
    shortcuts: [
      {
        id: 'nextSlide',
        name: 'Próximo Slide',
        description: 'Vai para o próximo slide',
        keys: ['→'],
      },
      {
        id: 'prevSlide',
        name: 'Slide Anterior',
        description: 'Volta para o slide anterior',
        keys: ['←'],
      },
      {
        id: 'firstSlide',
        name: 'Primeiro Slide',
        description: 'Vai para o primeiro slide',
        keys: [modKey, '←'],
      },
      {
        id: 'lastSlide',
        name: 'Último Slide',
        description: 'Vai para o último slide',
        keys: [modKey, '→'],
      },
      {
        id: 'goToSlide',
        name: 'Ir para Slide',
        description: 'Abre diálogo para ir a um slide específico',
        keys: [modKey, 'G'],
      },
    ],
  },
  {
    id: 'view',
    name: 'Visualização',
    icon: <Eye className="h-4 w-4" />,
    shortcuts: [
      {
        id: 'zoomIn',
        name: 'Aumentar Zoom',
        description: 'Aumenta o zoom do canvas',
        keys: [modKey, '+'],
      },
      {
        id: 'zoomOut',
        name: 'Diminuir Zoom',
        description: 'Diminui o zoom do canvas',
        keys: [modKey, '-'],
      },
      {
        id: 'zoomFit',
        name: 'Ajustar à Tela',
        description: 'Ajusta o zoom para caber na tela',
        keys: [modKey, '0'],
      },
      {
        id: 'toggleTimeline',
        name: 'Mostrar/Ocultar Timeline',
        description: 'Alterna visibilidade da timeline',
        keys: [modKey, 'T'],
      },
      {
        id: 'toggleSidebar',
        name: 'Mostrar/Ocultar Sidebar',
        description: 'Alterna visibilidade da barra lateral',
        keys: [modKey, 'B'],
      },
    ],
  },
  {
    id: 'tools',
    name: 'Ferramentas',
    icon: <Search className="h-4 w-4" />,
    shortcuts: [
      {
        id: 'search',
        name: 'Buscar',
        description: 'Abre a barra de busca global',
        keys: [modKey, 'K'],
      },
      {
        id: 'help',
        name: 'Ajuda',
        description: 'Abre a central de ajuda',
        keys: ['?'],
      },
      {
        id: 'shortcuts',
        name: 'Atalhos de Teclado',
        description: 'Mostra este painel de atalhos',
        keys: [modKey, '/'],
      },
    ],
  },
];

interface KeyProps {
  children: React.ReactNode;
  className?: string;
}

const Key: React.FC<KeyProps> = ({ children, className }) => (
  <span
    className={cn(
      'inline-flex items-center justify-center min-w-[24px] h-6 px-1.5',
      'bg-zinc-800 border border-zinc-600 rounded text-xs font-medium text-zinc-200',
      'shadow-sm',
      className
    )}
  >
    {children}
  </span>
);

export function KeyboardShortcutsPanel() {
  const [selectedCategory, setSelectedCategory] = useState<string>('file');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = shortcutCategories.map(category => ({
    ...category,
    shortcuts: category.shortcuts.filter(
      shortcut =>
        shortcut.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shortcut.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => searchQuery === '' || category.shortcuts.length > 0);

  const currentCategory = filteredCategories.find(c => c.id === selectedCategory) || filteredCategories[0];

  return (
    <div className="flex flex-col h-full bg-zinc-900 text-white">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Keyboard className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Atalhos de Teclado</h2>
            <p className="text-sm text-zinc-400">
              Acelere seu fluxo de trabalho com atalhos
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar atalhos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg
                       text-sm placeholder:text-zinc-500 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Category List */}
        <div className="w-48 border-r border-zinc-800 p-4 space-y-1">
          {filteredCategories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                selectedCategory === category.id
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
              )}
            >
              {category.icon}
              <span>{category.name}</span>
              {selectedCategory === category.id && (
                <ChevronRight className="h-4 w-4 ml-auto" />
              )}
            </button>
          ))}
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 p-4 overflow-y-auto">
          {currentCategory && (
            <div className="space-y-3">
              {currentCategory.shortcuts.map((shortcut, index) => (
                <motion.div
                  key={shortcut.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg
                             hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-medium">{shortcut.name}</h4>
                    <p className="text-sm text-zinc-400">{shortcut.description}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    {shortcut.keys.map((key, i) => (
                      <React.Fragment key={i}>
                        <Key>{key}</Key>
                        {i < shortcut.keys.length - 1 && (
                          <span className="text-zinc-600 text-xs">+</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </motion.div>
              ))}

              {currentCategory.shortcuts.length === 0 && (
                <div className="text-center py-8 text-zinc-500">
                  Nenhum atalho encontrado para "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-800/50">
        <div className="flex items-start gap-3 text-sm text-zinc-400">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            Pressione <Key>{modKey}</Key> + <Key>/</Key> a qualquer momento para
            abrir este painel. Os atalhos funcionam quando o foco está no editor.
          </p>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsPanel;
