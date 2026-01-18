'use client';

/**
 * SPRINT 7: Conversation Builder Component
 *
 * Features:
 * - Create multi-avatar conversations
 * - Dialogue sequencing with timing
 * - Emotion selection per dialogue
 * - LookAt system (avatars looking at each other)
 * - Visual timeline of dialogue flow
 * - Auto-duration calculation based on text length
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  Plus,
  Trash2,
  Play,
  User,
  Clock,
  Smile,
  Frown,
  AlertCircle,
  Meh,
  Sparkles,
  Eye,
  MoveUp,
  MoveDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Avatar, Conversation, Dialogue, AvatarEmotion } from '@/types/video-project';

export interface ConversationBuilderProps {
  avatars: Avatar[];
  conversation?: Conversation;
  onSave: (conversation: Conversation) => void;
  onCancel: () => void;
  className?: string;
}

/**
 * Estimate dialogue duration based on text length
 * Average speaking rate: ~150 words per minute = 2.5 words per second
 */
function estimateDuration(text: string): number {
  const words = text.trim().split(/\s+/).length;
  const duration = Math.max(2, words / 2.5); // Minimum 2 seconds
  return Math.round(duration * 10) / 10; // Round to 1 decimal
}

/**
 * Emotion Icons
 */
const EMOTION_ICONS: Record<AvatarEmotion, React.ReactNode> = {
  neutral: <Meh className="h-4 w-4" />,
  happy: <Smile className="h-4 w-4" />,
  concerned: <Frown className="h-4 w-4" />,
  serious: <AlertCircle className="h-4 w-4" />,
  excited: <Sparkles className="h-4 w-4" />,
};

const EMOTION_COLORS: Record<AvatarEmotion, string> = {
  neutral: 'bg-gray-500',
  happy: 'bg-green-500',
  concerned: 'bg-yellow-500',
  serious: 'bg-red-500',
  excited: 'bg-purple-500',
};

export function ConversationBuilder({
  avatars,
  conversation: initialConversation,
  onSave,
  onCancel,
  className,
}: ConversationBuilderProps) {
  // Conversation state
  const [name, setName] = useState(initialConversation?.name || 'New Conversation');
  const [participants, setParticipants] = useState<string[]>(
    initialConversation?.participants || []
  );
  const [dialogues, setDialogues] = useState<Dialogue[]>(
    initialConversation?.dialogues || []
  );

  // Calculate total duration
  const totalDuration = useMemo(() => {
    return dialogues.reduce((sum, d) => sum + d.duration, 0);
  }, [dialogues]);

  // Add participant
  const addParticipant = useCallback((avatarId: string) => {
    if (!participants.includes(avatarId)) {
      setParticipants((prev) => [...prev, avatarId]);
    }
  }, [participants]);

  // Remove participant
  const removeParticipant = useCallback((avatarId: string) => {
    setParticipants((prev) => prev.filter((id) => id !== avatarId));
    // Remove dialogues from this participant
    setDialogues((prev) => prev.filter((d) => d.avatarId !== avatarId));
  }, []);

  // Add dialogue
  const addDialogue = useCallback(() => {
    if (participants.length === 0) return;

    const newDialogue: Dialogue = {
      id: `dialogue-${Date.now()}`,
      avatarId: participants[0],
      text: '',
      startTime: totalDuration,
      duration: 3,
      emotion: 'neutral',
    };

    setDialogues((prev) => [...prev, newDialogue]);
  }, [participants, totalDuration]);

  // Update dialogue
  const updateDialogue = useCallback((id: string, updates: Partial<Dialogue>) => {
    setDialogues((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const updated = { ...d, ...updates };

          // Auto-calculate duration if text changed
          if (updates.text !== undefined) {
            updated.duration = estimateDuration(updates.text);
          }

          return updated;
        }
        return d;
      })
    );
  }, []);

  // Delete dialogue
  const deleteDialogue = useCallback((id: string) => {
    setDialogues((prev) => prev.filter((d) => d.id !== id));
  }, []);

  // Move dialogue up
  const moveDialogueUp = useCallback((index: number) => {
    if (index === 0) return;
    setDialogues((prev) => {
      const newDialogues = [...prev];
      [newDialogues[index - 1], newDialogues[index]] =
        [newDialogues[index], newDialogues[index - 1]];
      return newDialogues;
    });
  }, []);

  // Move dialogue down
  const moveDialogueDown = useCallback((index: number) => {
    setDialogues((prev) => {
      if (index === prev.length - 1) return prev;
      const newDialogues = [...prev];
      [newDialogues[index], newDialogues[index + 1]] =
        [newDialogues[index + 1], newDialogues[index]];
      return newDialogues;
    });
  }, []);

  // Recalculate start times after reorder
  const recalculateStartTimes = useCallback(() => {
    setDialogues((prev) => {
      let currentTime = 0;
      return prev.map((d) => {
        const updated = { ...d, startTime: currentTime };
        currentTime += d.duration;
        return updated;
      });
    });
  }, []);

  // Save conversation
  const handleSave = useCallback(() => {
    // Recalculate start times before saving
    let currentTime = 0;
    const finalDialogues = dialogues.map((d) => {
      const updated = { ...d, startTime: currentTime };
      currentTime += d.duration;
      return updated;
    });

    const conversation: Conversation = {
      id: initialConversation?.id || `conversation-${Date.now()}`,
      name,
      participants,
      dialogues: finalDialogues,
      totalDuration: currentTime,
    };

    onSave(conversation);
  }, [name, participants, dialogues, initialConversation, onSave]);

  // Recalculate start times when dialogues change
  React.useEffect(() => {
    recalculateStartTimes();
  }, [dialogues.length]); // Only on add/remove

  // Get avatar by ID
  const getAvatar = useCallback(
    (avatarId: string) => avatars.find((a) => a.id === avatarId),
    [avatars]
  );

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Conversation Builder</h2>
        </div>

        {/* Conversation Name */}
        <div className="space-y-2">
          <Label className="text-sm">Conversation Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter conversation name..."
            className="h-9"
          />
        </div>
      </div>

      {/* Participants */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <Label className="text-sm font-medium">Participants ({participants.length})</Label>
          <Select onValueChange={addParticipant}>
            <SelectTrigger className="w-[180px] h-8 text-sm">
              <SelectValue placeholder="Add participant" />
            </SelectTrigger>
            <SelectContent>
              {avatars
                .filter((a) => !participants.includes(a.id))
                .map((avatar) => (
                  <SelectItem key={avatar.id} value={avatar.id}>
                    {avatar.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {participants.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {participants.map((participantId) => {
              const avatar = getAvatar(participantId);
              if (!avatar) return null;
              return (
                <Badge
                  key={participantId}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <User className="h-3 w-3" />
                  {avatar.name}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-4 w-4 ml-1"
                    onClick={() => removeParticipant(participantId)}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </Badge>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No participants added yet</p>
        )}
      </div>

      {/* Dialogues */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">
              Dialogues ({dialogues.length})
            </Label>
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {totalDuration.toFixed(1)}s
            </Badge>
          </div>
          <Button size="sm" onClick={addDialogue} disabled={participants.length === 0}>
            <Plus className="h-4 w-4 mr-1" />
            Add Dialogue
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {dialogues.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium">No dialogues yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Add participants and create your first dialogue
                </p>
              </div>
            ) : (
              dialogues.map((dialogue, index) => {
                const avatar = getAvatar(dialogue.avatarId);
                if (!avatar) return null;

                return (
                  <Card key={dialogue.id} className="p-3">
                    {/* Dialogue Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          #{index + 1}
                        </Badge>
                        <Select
                          value={dialogue.avatarId}
                          onValueChange={(val) =>
                            updateDialogue(dialogue.id, { avatarId: val })
                          }
                        >
                          <SelectTrigger className="w-[150px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {participants.map((participantId) => {
                              const a = getAvatar(participantId);
                              return a ? (
                                <SelectItem key={participantId} value={participantId}>
                                  {a.name}
                                </SelectItem>
                              ) : null;
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => moveDialogueUp(index)}
                          disabled={index === 0}
                        >
                          <MoveUp className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => moveDialogueDown(index)}
                          disabled={index === dialogues.length - 1}
                        >
                          <MoveDown className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => deleteDialogue(dialogue.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Dialogue Text */}
                    <Textarea
                      value={dialogue.text}
                      onChange={(e) =>
                        updateDialogue(dialogue.id, { text: e.target.value })
                      }
                      placeholder="Enter dialogue text..."
                      className="min-h-[60px] text-sm mb-3"
                    />

                    {/* Dialogue Settings */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Emotion */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Emotion</Label>
                        <Select
                          value={dialogue.emotion}
                          onValueChange={(val) =>
                            updateDialogue(dialogue.id, {
                              emotion: val as AvatarEmotion,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              ['neutral', 'happy', 'concerned', 'serious', 'excited'] as const
                            ).map((emotion) => (
                              <SelectItem key={emotion} value={emotion}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={cn(
                                      'h-2 w-2 rounded-full',
                                      EMOTION_COLORS[emotion]
                                    )}
                                  />
                                  <span className="capitalize">{emotion}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Duration */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Duration</Label>
                        <Input
                          type="number"
                          value={dialogue.duration}
                          onChange={(e) =>
                            updateDialogue(dialogue.id, {
                              duration: parseFloat(e.target.value) || 0,
                            })
                          }
                          step={0.1}
                          min={0.5}
                          className="h-8 text-xs"
                        />
                      </div>

                      {/* Look At */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Look At</Label>
                        <Select
                          value={dialogue.lookAt || 'none'}
                          onValueChange={(val) =>
                            updateDialogue(dialogue.id, {
                              lookAt: val === 'none' ? undefined : val,
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              <div className="flex items-center gap-2">
                                <Eye className="h-3 w-3" />
                                None
                              </div>
                            </SelectItem>
                            {participants
                              .filter((id) => id !== dialogue.avatarId)
                              .map((participantId) => {
                                const a = getAvatar(participantId);
                                return a ? (
                                  <SelectItem key={participantId} value={participantId}>
                                    <div className="flex items-center gap-2">
                                      <Eye className="h-3 w-3" />
                                      {a.name}
                                    </div>
                                  </SelectItem>
                                ) : null;
                              })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Timeline indicator */}
                    <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {dialogue.startTime.toFixed(1)}s - {(dialogue.startTime + dialogue.duration).toFixed(1)}s
                      <div
                        className={cn(
                          'ml-auto h-2 w-2 rounded-full',
                          EMOTION_COLORS[dialogue.emotion || 'neutral']
                        )}
                      />
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Actions */}
      <div className="border-t p-4 flex items-center justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Total: {totalDuration.toFixed(1)}s
          </Badge>
          <Button onClick={handleSave} disabled={dialogues.length === 0}>
            <Play className="h-4 w-4 mr-1" />
            Save Conversation
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConversationBuilder;
