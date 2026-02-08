'use client';

/**
 * Properties Panel
 * Painel lateral para edição de propriedades de elementos selecionados
 * Transformação, Estilo, Animação, Efeitos
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Slider } from '@components/ui/slider';
import { Switch } from '@components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { ScrollArea } from '@components/ui/scroll-area';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@components/ui/accordion';
import {
  Move,
  Scale,
  RotateCw,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Palette,
  Type,
  Sparkles,
  Zap,
  Settings,
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Plus,
  X,
} from 'lucide-react';
import { Card } from '@components/ui/card';
import { cn } from '@lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface Transform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  width?: number;
  height?: number;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  backgroundColor?: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textDecoration: ('bold' | 'italic' | 'underline')[];
  lineHeight: number;
  letterSpacing: number;
}

export interface Animation {
  type: 'fade' | 'slide' | 'zoom' | 'rotate' | 'bounce' | 'elastic';
  direction?: 'in' | 'out' | 'inOut';
  duration: number;
  delay: number;
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic';
  loop?: boolean;
}

export interface ElementProperties {
  id: string;
  name: string;
  type: 'image' | 'video' | 'text' | 'avatar' | 'shape';
  locked: boolean;
  visible: boolean;
  transform: Transform;
  textStyle?: TextStyle;
  animations: Animation[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  effects: any[];
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  icon?: React.ReactNode;
  inputRef?: React.RefObject<HTMLInputElement>;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const NumberInput: React.FC<NumberInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  icon,
  inputRef,
  onKeyDown,
}) => {
  const inputId = React.useId();

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId} className="text-xs font-medium flex items-center gap-2">
        {icon}
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={inputId}
          ref={inputRef}
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          onKeyDown={onKeyDown}
          min={min}
          max={max}
          step={step}
          className="h-8 text-sm"
        />
        {unit && <span className="text-xs text-muted-foreground w-8">{unit}</span>}
      </div>
    </div>
  );
};

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  icon?: React.ReactNode;
}

const SliderInput: React.FC<SliderInputProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  icon,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium flex items-center gap-2">
          {icon}
          {label}
        </Label>
        <span className="text-xs text-muted-foreground">
          {value}
          {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([val]) => onChange(val)}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface PropertiesPanelProps {
  element: ElementProperties | null;
  onUpdate: (properties: Partial<ElementProperties>) => void;
  className?: string;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  element,
  onUpdate,
  className,
}) => {
  const [activeTab, setActiveTab] = useState('transform');
  const [constrainProportions, setConstrainProportions] = useState(false);

  // Refs for keyboard navigation
  const xInputRef = useRef<HTMLInputElement>(null);
  const yInputRef = useRef<HTMLInputElement>(null);
  const widthInputRef = useRef<HTMLInputElement>(null);
  const heightInputRef = useRef<HTMLInputElement>(null);

  // Store aspect ratio for constrain proportions
  const aspectRatio = useRef<number>(1);

  useEffect(() => {
    const width = element?.transform.width;
    const height = element?.transform.height;
    if (typeof width === 'number' && typeof height === 'number' && height !== 0) {
      aspectRatio.current = width / height;
    }
  }, [element]);

  const updateTransform = useCallback(
    (updates: Partial<Transform>) => {
      if (!element) return;

      if (typeof updates.opacity === 'number') {
        updates.opacity = Math.min(1, Math.max(0, updates.opacity));
      }

      // Apply constrain proportions for width/height changes
      const hasSize =
        element.transform.width !== undefined && element.transform.height !== undefined;
      const hasWidthUpdate = updates.width !== undefined;
      const hasHeightUpdate = updates.height !== undefined;
      const ratio = aspectRatio.current;
      const canUseRatio = Number.isFinite(ratio) && ratio > 0;

      if (constrainProportions && hasSize && canUseRatio && (hasWidthUpdate || hasHeightUpdate)) {
        if (hasWidthUpdate) {
          updates.height = updates.width! / ratio;
        } else if (hasHeightUpdate) {
          updates.width = updates.height! * ratio;
        }
      }

      onUpdate({
        transform: { ...element.transform, ...updates },
      });
    },
    [element, onUpdate, constrainProportions],
  );

  const updateTextStyle = useCallback(
    (updates: Partial<TextStyle>) => {
      if (!element || !element.textStyle) return;
      onUpdate({
        textStyle: { ...element.textStyle, ...updates },
      });
    },
    [element, onUpdate],
  );

  const addAnimation = useCallback(() => {
    if (!element) return;
    const newAnimation: Animation = {
      type: 'fade',
      direction: 'in',
      duration: 500,
      delay: 0,
      easing: 'easeInOut',
    };
    onUpdate({
      animations: [...element.animations, newAnimation],
    });
  }, [element, onUpdate]);

  // Keyboard navigation: Tab to cycle through inputs
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, nextRef?: React.RefObject<HTMLInputElement>) => {
      if (e.key === 'Tab' && !e.shiftKey && nextRef) {
        e.preventDefault();
        nextRef.current?.focus();
        nextRef.current?.select();
      } else if (e.key === 'Enter') {
        e.currentTarget.blur();
      }
    },
    [],
  );

  if (!element) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center h-full p-8 text-center',
          className,
        )}
      >
        <Settings className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-sm font-medium">No element selected</p>
        <p className="text-xs text-muted-foreground mt-1">
          Select an element to edit its properties
        </p>
      </div>
    );
  }

  const opacityPercent = Math.round(Math.min(1, Math.max(0, element.transform.opacity)) * 100);

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-sm truncate">{element.name}</h3>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label={element.visible ? 'Hide element' : 'Show element'}
              onClick={() => onUpdate({ visible: !element.visible })}
            >
              {element.visible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              aria-label={element.locked ? 'Unlock element' : 'Lock element'}
              onClick={() => onUpdate({ locked: !element.locked })}
            >
              {element.locked ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Unlock className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground capitalize">{element.type}</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid grid-cols-4 mx-4 mt-4">
          <TabsTrigger value="transform" className="text-xs">
            <Move className="h-3 w-3 mr-1" />
            Transform
          </TabsTrigger>
          <TabsTrigger value="style" className="text-xs">
            <Palette className="h-3 w-3 mr-1" />
            Style
          </TabsTrigger>
          <TabsTrigger value="animation" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Animation
          </TabsTrigger>
          <TabsTrigger value="effects" className="text-xs">
            <Zap className="h-3 w-3 mr-1" />
            Effects
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* Transform Tab */}
          <TabsContent value="transform" className="p-4 space-y-4">
            <Accordion type="multiple" defaultValue={['position', 'size', 'appearance']}>
              {/* Position */}
              <AccordionItem value="position">
                <AccordionTrigger className="text-sm font-medium">Position</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <NumberInput
                      label="X"
                      value={element.transform.x}
                      onChange={(val) => updateTransform({ x: val })}
                      step={1}
                      unit="px"
                      inputRef={xInputRef}
                      onKeyDown={(e) => handleKeyDown(e, yInputRef)}
                    />
                    <NumberInput
                      label="Y"
                      value={element.transform.y}
                      onChange={(val) => updateTransform({ y: val })}
                      step={1}
                      unit="px"
                      inputRef={yInputRef}
                      onKeyDown={(e) => handleKeyDown(e, widthInputRef)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Size */}
              <AccordionItem value="size">
                <AccordionTrigger className="text-sm font-medium">Size & Scale</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <SliderInput
                    label="Scale"
                    value={element.transform.scale}
                    onChange={(val) => updateTransform({ scale: val })}
                    min={0.1}
                    max={3}
                    step={0.1}
                    unit="x"
                    icon={<Scale className="h-3 w-3" />}
                  />
                  {element.transform.width !== undefined &&
                    element.transform.height !== undefined && (
                      <div className="flex items-center gap-2 mb-2">
                        <Switch
                          id="constrain-proportions"
                          checked={constrainProportions}
                          onCheckedChange={setConstrainProportions}
                        />
                        <Label htmlFor="constrain-proportions" className="text-xs cursor-pointer">
                          Constrain proportions
                        </Label>
                      </div>
                    )}
                  {element.transform.width !== undefined && (
                    <NumberInput
                      label="Width"
                      value={element.transform.width}
                      onChange={(val) => updateTransform({ width: val })}
                      min={0}
                      unit="px"
                      inputRef={widthInputRef}
                      onKeyDown={(e) => handleKeyDown(e, heightInputRef)}
                    />
                  )}
                  {element.transform.height !== undefined && (
                    <NumberInput
                      label="Height"
                      value={element.transform.height}
                      onChange={(val) => updateTransform({ height: val })}
                      min={0}
                      unit="px"
                      inputRef={heightInputRef}
                      onKeyDown={(e) => handleKeyDown(e, xInputRef)}
                    />
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Rotation & Opacity */}
              <AccordionItem value="appearance">
                <AccordionTrigger className="text-sm font-medium">Appearance</AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  <SliderInput
                    label="Rotation"
                    value={element.transform.rotation}
                    onChange={(val) => updateTransform({ rotation: val })}
                    min={0}
                    max={360}
                    step={1}
                    unit="°"
                    icon={<RotateCw className="h-3 w-3" />}
                  />
                  <SliderInput
                    label="Opacity"
                    value={opacityPercent}
                    onChange={(val) => updateTransform({ opacity: val / 100 })}
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    icon={<Eye className="h-3 w-3" />}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Style Tab */}
          <TabsContent value="style" className="p-4 space-y-4">
            {element.type === 'text' && element.textStyle ? (
              <Accordion type="multiple" defaultValue={['font', 'text-style', 'alignment']}>
                {/* Font */}
                <AccordionItem value="font">
                  <AccordionTrigger className="text-sm font-medium">Font</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Font Family</Label>
                      <Select
                        value={element.textStyle.fontFamily}
                        onValueChange={(val) => updateTextStyle({ fontFamily: val })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inter">Inter</SelectItem>
                          <SelectItem value="Roboto">Roboto</SelectItem>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Helvetica">Helvetica</SelectItem>
                          <SelectItem value="Georgia">Georgia</SelectItem>
                          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <SliderInput
                      label="Font Size"
                      value={element.textStyle.fontSize}
                      onChange={(val) => updateTextStyle({ fontSize: val })}
                      min={8}
                      max={144}
                      step={1}
                      unit="px"
                      icon={<Type className="h-3 w-3" />}
                    />

                    <SliderInput
                      label="Font Weight"
                      value={element.textStyle.fontWeight}
                      onChange={(val) => updateTextStyle({ fontWeight: val })}
                      min={100}
                      max={900}
                      step={100}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Text Style */}
                <AccordionItem value="text-style">
                  <AccordionTrigger className="text-sm font-medium">Text Style</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Color</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="color"
                          value={element.textStyle.color}
                          onChange={(e) => updateTextStyle({ color: e.target.value })}
                          className="h-8 w-12 p-1"
                        />
                        <Input
                          type="text"
                          value={element.textStyle.color}
                          onChange={(e) => updateTextStyle({ color: e.target.value })}
                          className="h-8 text-sm flex-1"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={
                          element.textStyle.textDecoration.includes('bold') ? 'default' : 'outline'
                        }
                        onClick={() => {
                          const decorations = element.textStyle!.textDecoration;
                          updateTextStyle({
                            textDecoration: decorations.includes('bold')
                              ? decorations.filter((d) => d !== 'bold')
                              : [...decorations, 'bold'],
                          });
                        }}
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          element.textStyle.textDecoration.includes('italic')
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() => {
                          const decorations = element.textStyle!.textDecoration;
                          updateTextStyle({
                            textDecoration: decorations.includes('italic')
                              ? decorations.filter((d) => d !== 'italic')
                              : [...decorations, 'italic'],
                          });
                        }}
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          element.textStyle.textDecoration.includes('underline')
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() => {
                          const decorations = element.textStyle!.textDecoration;
                          updateTextStyle({
                            textDecoration: decorations.includes('underline')
                              ? decorations.filter((d) => d !== 'underline')
                              : [...decorations, 'underline'],
                          });
                        }}
                      >
                        <Underline className="h-4 w-4" />
                      </Button>
                    </div>

                    <SliderInput
                      label="Line Height"
                      value={element.textStyle.lineHeight}
                      onChange={(val) => updateTextStyle({ lineHeight: val })}
                      min={0.8}
                      max={3}
                      step={0.1}
                    />

                    <SliderInput
                      label="Letter Spacing"
                      value={element.textStyle.letterSpacing}
                      onChange={(val) => updateTextStyle({ letterSpacing: val })}
                      min={-5}
                      max={20}
                      step={0.5}
                      unit="px"
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Alignment */}
                <AccordionItem value="alignment">
                  <AccordionTrigger className="text-sm font-medium">Alignment</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={element.textStyle.textAlign === 'left' ? 'default' : 'outline'}
                        onClick={() => updateTextStyle({ textAlign: 'left' })}
                      >
                        <AlignLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={element.textStyle.textAlign === 'center' ? 'default' : 'outline'}
                        onClick={() => updateTextStyle({ textAlign: 'center' })}
                      >
                        <AlignCenter className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={element.textStyle.textAlign === 'right' ? 'default' : 'outline'}
                        onClick={() => updateTextStyle({ textAlign: 'right' })}
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={element.textStyle.textAlign === 'justify' ? 'default' : 'outline'}
                        onClick={() => updateTextStyle({ textAlign: 'justify' })}
                      >
                        <AlignJustify className="h-4 w-4" />
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              <div className="text-center text-sm text-muted-foreground py-8">
                Style options not available for this element type
              </div>
            )}
          </TabsContent>

          {/* Animation Tab */}
          <TabsContent value="animation" className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium">Animations</h4>
              <Button size="sm" variant="outline" onClick={addAnimation}>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </div>

            {element.animations.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                No animations added yet
              </div>
            ) : (
              <div className="space-y-4">
                {element.animations.map((animation, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Animation {index + 1}</Label>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => {
                            const newAnimations = element.animations.filter((_, i) => i !== index);
                            onUpdate({ animations: newAnimations });
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={animation.type}
                          onValueChange={(val) => {
                            const newAnimations = [...element.animations];
                            newAnimations[index] = {
                              ...animation,
                              type: val as Animation['type'],
                            };
                            onUpdate({ animations: newAnimations });
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fade">Fade</SelectItem>
                            <SelectItem value="slide">Slide</SelectItem>
                            <SelectItem value="zoom">Zoom</SelectItem>
                            <SelectItem value="rotate">Rotate</SelectItem>
                            <SelectItem value="bounce">Bounce</SelectItem>
                            <SelectItem value="elastic">Elastic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <SliderInput
                        label="Duration"
                        value={animation.duration}
                        onChange={(val) => {
                          const newAnimations = [...element.animations];
                          newAnimations[index] = { ...animation, duration: val };
                          onUpdate({ animations: newAnimations });
                        }}
                        min={100}
                        max={3000}
                        step={100}
                        unit="ms"
                      />

                      <SliderInput
                        label="Delay"
                        value={animation.delay}
                        onChange={(val) => {
                          const newAnimations = [...element.animations];
                          newAnimations[index] = { ...animation, delay: val };
                          onUpdate({ animations: newAnimations });
                        }}
                        min={0}
                        max={2000}
                        step={100}
                        unit="ms"
                      />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Effects Tab */}
          <TabsContent value="effects" className="p-4">
            <div className="text-center text-sm text-muted-foreground py-8">
              Effects panel coming soon
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};

export default PropertiesPanel;
