'use client'

/**
 * Shortcuts Help Panel
 * Painel de ajuda com todos os atalhos de teclado disponíveis
 */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import { Badge } from '@components/ui/badge'
import { ScrollArea } from '@components/ui/scroll-area'
import { Separator } from '@components/ui/separator'
import {
  Play, Edit, Eye, Layers, Save, Move, HelpCircle, Zap
} from 'lucide-react'
import { formatShortcut, COMMON_SHORTCUTS } from '@hooks/useKeyboardShortcuts'

interface ShortcutGroup {
  title: string
  icon: React.ReactNode
  shortcuts: Array<{
    keys: string
    description: string
  }>
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Playback',
    icon: <Play className="h-4 w-4" />,
    shortcuts: [
      { keys: formatShortcut(COMMON_SHORTCUTS.PLAY_PAUSE), description: 'Play/Pause' },
      { keys: formatShortcut(COMMON_SHORTCUTS.STOP), description: 'Stop' },
      { keys: formatShortcut(COMMON_SHORTCUTS.NEXT_FRAME), description: 'Next Frame' },
      { keys: formatShortcut(COMMON_SHORTCUTS.PREV_FRAME), description: 'Previous Frame' }
    ]
  },
  {
    title: 'Edit',
    icon: <Edit className="h-4 w-4" />,
    shortcuts: [
      { keys: formatShortcut(COMMON_SHORTCUTS.UNDO), description: 'Undo' },
      { keys: formatShortcut(COMMON_SHORTCUTS.REDO_Y), description: 'Redo' },
      { keys: formatShortcut(COMMON_SHORTCUTS.CUT), description: 'Cut' },
      { keys: formatShortcut(COMMON_SHORTCUTS.COPY), description: 'Copy' },
      { keys: formatShortcut(COMMON_SHORTCUTS.PASTE), description: 'Paste' },
      { keys: formatShortcut(COMMON_SHORTCUTS.DUPLICATE), description: 'Duplicate' },
      { keys: formatShortcut(COMMON_SHORTCUTS.DELETE), description: 'Delete' },
      { keys: formatShortcut(COMMON_SHORTCUTS.SELECT_ALL), description: 'Select All' },
      { keys: formatShortcut(COMMON_SHORTCUTS.DESELECT), description: 'Deselect' }
    ]
  },
  {
    title: 'View',
    icon: <Eye className="h-4 w-4" />,
    shortcuts: [
      { keys: formatShortcut(COMMON_SHORTCUTS.ZOOM_IN), description: 'Zoom In' },
      { keys: formatShortcut(COMMON_SHORTCUTS.ZOOM_OUT), description: 'Zoom Out' },
      { keys: formatShortcut(COMMON_SHORTCUTS.FIT_TO_SCREEN), description: 'Fit to Screen' },
      { keys: formatShortcut(COMMON_SHORTCUTS.TOGGLE_GRID), description: 'Toggle Grid' }
    ]
  },
  {
    title: 'Move',
    icon: <Move className="h-4 w-4" />,
    shortcuts: [
      { keys: '↑/↓/←/→', description: 'Move Element (1px)' },
      { keys: 'Shift+↑/↓/←/→', description: 'Move Element (10px)' }
    ]
  },
  {
    title: 'Layers',
    icon: <Layers className="h-4 w-4" />,
    shortcuts: [
      { keys: formatShortcut(COMMON_SHORTCUTS.BRING_TO_FRONT), description: 'Bring to Front' },
      { keys: formatShortcut(COMMON_SHORTCUTS.SEND_TO_BACK), description: 'Send to Back' },
      { keys: formatShortcut(COMMON_SHORTCUTS.BRING_FORWARD), description: 'Bring Forward' },
      { keys: formatShortcut(COMMON_SHORTCUTS.SEND_BACKWARD), description: 'Send Backward' },
      { keys: formatShortcut(COMMON_SHORTCUTS.LOCK), description: 'Lock/Unlock' }
    ]
  },
  {
    title: 'File',
    icon: <Save className="h-4 w-4" />,
    shortcuts: [
      { keys: formatShortcut(COMMON_SHORTCUTS.SAVE), description: 'Save' },
      { keys: formatShortcut(COMMON_SHORTCUTS.EXPORT), description: 'Export' },
      { keys: formatShortcut(COMMON_SHORTCUTS.NEW), description: 'New Project' },
      { keys: formatShortcut(COMMON_SHORTCUTS.OPEN), description: 'Open Project' }
    ]
  }
]

interface ShortcutsHelpPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const ShortcutsHelpPanel: React.FC<ShortcutsHelpPanelProps> = ({
  isOpen,
  onClose
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Learn keyboard shortcuts to work faster
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {SHORTCUT_GROUPS.map((group, idx) => (
              <div key={group.title}>
                {idx > 0 && <Separator className="mb-6" />}

                <div className="mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    {group.icon}
                    {group.title}
                  </h3>
                </div>

                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, sidx) => (
                    <div
                      key={sidx}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50"
                    >
                      <span className="text-sm text-muted-foreground">
                        {shortcut.description}
                      </span>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {shortcut.keys}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HelpCircle className="h-3 w-3" />
            <span>Press Ctrl+/ to toggle this panel</span>
          </div>
          <Badge variant="outline" className="text-xs">
            Studio Pro v1.0
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ShortcutsHelpPanel
