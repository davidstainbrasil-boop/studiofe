'use client';

import React from 'react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { ScrollArea } from '@components/ui/scroll-area';
import { cn } from '@lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import type { Scene } from '@/types/scene';

interface ScenesTimelineProps {
  scenes: Scene[];
  activeSceneId: string | null;
  onSelectScene: (sceneId: string) => void;
  onAddScene: () => void;
  onRemoveScene: (sceneId: string) => void;
  onDurationChange: (sceneId: string, duration: number) => void;
}

export function ScenesTimeline({
  scenes,
  activeSceneId,
  onSelectScene,
  onAddScene,
  onRemoveScene,
  onDurationChange,
}: ScenesTimelineProps) {
  if (scenes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <Button onClick={onAddScene}>Add first scene</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-12 border-b flex items-center justify-between px-4">
        <div className="text-sm font-semibold">Scenes</div>
        <Button variant="ghost" size="sm" onClick={onAddScene}>
          <Plus className="h-4 w-4 mr-2" />
          Add Scene
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 flex items-center gap-4">
          {scenes.map((scene, index) => {
            const isActive = scene.id === activeSceneId;
            return (
              <React.Fragment key={scene.id}>
                <div
                  className={cn(
                    'min-w-[200px] rounded-lg border px-3 py-2 cursor-pointer transition-colors',
                    isActive
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30'
                      : 'hover:bg-muted',
                  )}
                  onClick={() => onSelectScene(scene.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{scene.name}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemoveScene(scene.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Duration</span>
                    <Input
                      type="number"
                      min={1}
                      value={scene.duration}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        onDurationChange(scene.id, Math.max(1, Number(event.target.value || 1)))
                      }
                      className="h-7 w-20"
                    />
                    <span>s</span>
                  </div>
                </div>
                {index < scenes.length - 1 && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    Fade
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
