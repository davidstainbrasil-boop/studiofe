/**
 * 🎛️ PPTX Pre-Render Editor
 *
 * Edit UniversalSlide data before rendering to video:
 * - Adjust slide duration
 * - Reorder slides
 * - Edit text content
 * - Modify animations
 * - Preview with Remotion Player
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Player } from '@remotion/player';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Slider } from '@components/ui/slider';
import { Textarea } from '@components/ui/textarea';
import { Card, CardContent } from '@components/ui/card';
import { ScrollArea } from '@components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import {
  Play,
  GripVertical,
  Clock,
  Type,
  Sparkles,
  Save,
  RotateCcw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type {
  UniversalSlide,
  UniversalSlideElement,
  UniversalPresentationData,
} from '@/lib/pptx/parsers/element-parser';
import { UniversalSlideComposition } from '@/app/remotion/UniversalSlide';

interface PPTXPreRenderEditorProps {
  presentation: UniversalPresentationData;
  onSave?: (slides: UniversalSlide[]) => void;
  onRender?: (slides: UniversalSlide[]) => void;
}

export const PPTXPreRenderEditor: React.FC<PPTXPreRenderEditorProps> = ({
  presentation,
  onSave,
  onRender,
}) => {
  const [slides, setSlides] = useState<UniversalSlide[]>([...presentation.slides]);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  const selectedSlide = slides[selectedSlideIndex];
  const fps = 30;

  // Calculate total duration
  const totalDuration = useMemo(
    () => slides.reduce((sum, slide) => sum + slide.duration, 0),
    [slides],
  );

  // Total frames available but not used in UI currently
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _totalFrames = useMemo(() => Math.round(totalDuration * fps), [totalDuration, fps]);

  // Update slide property
  const updateSlide = useCallback((index: number, updates: Partial<UniversalSlide>) => {
    setSlides((prev) => {
      const newSlides = [...prev];
      newSlides[index] = { ...newSlides[index], ...updates };
      return newSlides;
    });
    setIsDirty(true);
  }, []);

  // Update element property
  const updateElement = useCallback(
    (slideIndex: number, elementId: string, updates: Partial<UniversalSlideElement>) => {
      setSlides((prev) => {
        const newSlides = [...prev];
        const slide = { ...newSlides[slideIndex] };
        slide.elements = slide.elements.map((el) =>
          el.id === elementId ? { ...el, ...updates } : el,
        );
        newSlides[slideIndex] = slide;
        return newSlides;
      });
      setIsDirty(true);
    },
    [],
  );

  // Move slide
  const moveSlide = useCallback(
    (fromIndex: number, direction: 'up' | 'down') => {
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= slides.length) return;

      setSlides((prev) => {
        const newSlides = [...prev];
        const [moved] = newSlides.splice(fromIndex, 1);
        newSlides.splice(toIndex, 0, moved);
        // Update slide numbers
        return newSlides.map((slide, idx) => ({ ...slide, slideNumber: idx + 1 }));
      });
      setSelectedSlideIndex(toIndex);
      setIsDirty(true);
    },
    [slides.length],
  );

  // Delete slide (currently not exposed in UI)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _deleteSlide = useCallback(
    (index: number) => {
      if (slides.length <= 1) return;

      setSlides((prev) => {
        const newSlides = prev.filter((_, i) => i !== index);
        return newSlides.map((slide, idx) => ({ ...slide, slideNumber: idx + 1 }));
      });
      setSelectedSlideIndex(Math.max(0, index - 1));
      setIsDirty(true);
    },
    [slides.length],
  );

  // Reset to original
  const resetToOriginal = useCallback(() => {
    setSlides([...presentation.slides]);
    setSelectedSlideIndex(0);
    setIsDirty(false);
  }, [presentation.slides]);

  // Save changes
  const handleSave = useCallback(() => {
    onSave?.(slides);
    setIsDirty(false);
  }, [slides, onSave]);

  // Trigger render
  const handleRender = useCallback(() => {
    onRender?.(slides);
  }, [slides, onRender]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-xl font-bold">{presentation.metadata.title}</h2>
          <p className="text-sm text-muted-foreground">
            {slides.length} slides • {totalDuration.toFixed(1)}s total
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToOriginal} disabled={!isDirty}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={handleSave} disabled={!isDirty}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button size="sm" onClick={handleRender}>
            <Play className="w-4 h-4 mr-2" />
            Render Video
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Slide List */}
        <div className="w-64 border-r">
          <ScrollArea className="h-full p-2">
            {slides.map((slide, index) => (
              <Card
                key={slide.slideNumber}
                className={`mb-2 cursor-pointer transition-colors ${
                  index === selectedSlideIndex ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedSlideIndex(index)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">Slide {slide.slideNumber}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {slide.duration.toFixed(1)}s
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSlide(index, 'up');
                        }}
                        disabled={index === 0}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          moveSlide(index, 'down');
                        }}
                        disabled={index === slides.length - 1}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </div>

        {/* Preview & Editor */}
        <div className="flex-1 flex flex-col">
          {/* Remotion Preview */}
          <div className="flex-1 bg-black flex items-center justify-center p-4">
            <Player
              component={UniversalSlideComposition}
              inputProps={{ slide: selectedSlide }}
              durationInFrames={Math.round(selectedSlide.duration * fps)}
              fps={fps}
              compositionWidth={960}
              compositionHeight={540}
              style={{ width: '100%', maxWidth: '800px', aspectRatio: '16/9' }}
              controls
            />
          </div>

          {/* Properties Panel */}
          {selectedSlide && (
            <div className="h-64 border-t bg-muted/30">
              <Tabs defaultValue="timing" className="h-full">
                <TabsList className="mx-4 mt-2">
                  <TabsTrigger value="timing">
                    <Clock className="w-4 h-4 mr-2" />
                    Timing
                  </TabsTrigger>
                  <TabsTrigger value="content">
                    <Type className="w-4 h-4 mr-2" />
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="animation">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Animation
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="timing" className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Slide Duration (seconds)</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Slider
                          value={[selectedSlide.duration]}
                          onValueChange={([value]) =>
                            updateSlide(selectedSlideIndex, { duration: value })
                          }
                          min={1}
                          max={60}
                          step={0.5}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={selectedSlide.duration}
                          onChange={(e) =>
                            updateSlide(selectedSlideIndex, {
                              duration: parseFloat(e.target.value) || 1,
                            })
                          }
                          className="w-20"
                          min={1}
                          max={60}
                          step={0.5}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Transition</Label>
                      <Select
                        value={selectedSlide.transition?.type || 'none'}
                        onValueChange={(value) =>
                          updateSlide(selectedSlideIndex, {
                            transition:
                              value === 'none' ? undefined : { type: value, duration: 500 },
                          })
                        }
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="fade">Fade</SelectItem>
                          <SelectItem value="slide">Slide</SelectItem>
                          <SelectItem value="zoom">Zoom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="content" className="p-4">
                  <ScrollArea className="h-40">
                    {selectedSlide.elements
                      .filter((el) => el.type === 'text')
                      .map((element) => (
                        <div key={element.id} className="mb-4">
                          <Label className="text-xs text-muted-foreground">{element.name}</Label>
                          <Textarea
                            value={element.content.text || ''}
                            onChange={(e) =>
                              updateElement(selectedSlideIndex, element.id, {
                                content: { ...element.content, text: e.target.value },
                              })
                            }
                            className="mt-1 text-sm"
                            rows={2}
                          />
                        </div>
                      ))}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="animation" className="p-4">
                  <div className="text-sm text-muted-foreground">
                    {
                      selectedSlide.elements.filter(
                        (el) => el.animations && el.animations.length > 0,
                      ).length
                    }{' '}
                    elements with animations
                  </div>
                  <ScrollArea className="h-32 mt-2">
                    {selectedSlide.elements.map(
                      (element) =>
                        element.animations &&
                        element.animations.length > 0 && (
                          <div
                            key={element.id}
                            className="flex items-center gap-2 py-1 px-2 bg-muted rounded mb-1"
                          >
                            <span className="text-sm">{element.name}</span>
                            <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded">
                              {element.animations[0].type}
                            </span>
                          </div>
                        ),
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PPTXPreRenderEditor;
