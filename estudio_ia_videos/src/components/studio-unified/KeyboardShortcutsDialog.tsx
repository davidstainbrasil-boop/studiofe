/**
 * Keyboard Shortcuts Dialog
 * Displays all available keyboard shortcuts for Studio Pro
 */

'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ShortcutGroup {
  category: string;
  shortcuts: {
    keys: string[];
    description: string;
  }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'Playback',
    shortcuts: [
      { keys: ['Space'], description: 'Play/Pause video' },
      { keys: ['Esc'], description: 'Stop playback' },
      { keys: ['←'], description: 'Seek backward 1 second' },
      { keys: ['→'], description: 'Seek forward 1 second' },
    ],
  },
  {
    category: 'Project',
    shortcuts: [
      { keys: ['Ctrl', 'I'], description: 'Import PPTX file' },
      { keys: ['Ctrl', 'S'], description: 'Save project' },
      { keys: ['Ctrl', 'E'], description: 'Export video' },
    ],
  },
  {
    category: 'Timeline',
    shortcuts: [
      { keys: ['Delete'], description: 'Delete selected elements' },
      { keys: ['Backspace'], description: 'Delete selected elements' },
    ],
  },
  {
    category: 'Left Panel Tabs',
    shortcuts: [
      { keys: ['1'], description: 'Switch to Avatars tab' },
      { keys: ['2'], description: 'Switch to Text tab' },
      { keys: ['3'], description: 'Switch to Media tab' },
      { keys: ['4'], description: 'Switch to PPTX tab' },
    ],
  },
  {
    category: 'Right Panel',
    shortcuts: [
      { keys: ['C'], description: 'Toggle Conversation Builder' },
      { keys: ['L'], description: 'Switch to Layers panel' },
      { keys: ['P'], description: 'Switch to Properties panel' },
    ],
  },
];

interface KeyboardShortcutsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Keyboard Shortcuts">
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Speed up your workflow with these keyboard shortcuts
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.category}>
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase">
                  {group.category}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd className="px-2 py-1 text-xs font-semibold text-foreground bg-muted border border-border rounded-md shadow-sm">
                              {key}
                            </kbd>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="text-xs text-muted-foreground">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="pt-4 border-t text-xs text-muted-foreground">
          <p>💡 Tip: Shortcuts don't work while typing in text fields</p>
          <p className="mt-1">🍎 On Mac, use Cmd instead of Ctrl</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
