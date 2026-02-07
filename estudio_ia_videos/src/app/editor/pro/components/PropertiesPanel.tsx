'use client';
import React from 'react';
import { useEditorStore, CanvasElement } from '../stores/useEditorStore';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Slider } from '@components/ui/slider';
import { Settings2, Move, Maximize2, RotateCw, Palette, Type } from 'lucide-react';

interface PropertyFieldProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

const PropertyField = ({ label, value, onChange, min = 0, max = 2000, step = 1, suffix = '' }: PropertyFieldProps) => (
  <div className="flex items-center gap-2">
    <Label className="text-xs text-muted-foreground w-8 shrink-0">{label}</Label>
    <Input
      type="number"
      value={Math.round(value)}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-7 text-xs"
      min={min}
      max={max}
      step={step}
    />
    {suffix && <span className="text-[10px] text-muted-foreground">{suffix}</span>}
  </div>
);

const PropertiesPanel = () => {
  const selectedId = useEditorStore((state) => state.selectedId);
  const elements = useEditorStore((state) => state.elements);
  const updateElement = useEditorStore((state) => state.updateElement);

  const selectedElement = selectedId
    ? elements.find((el) => el.id === selectedId)
    : null;

  const handleUpdate = (updates: Partial<CanvasElement>) => {
    if (selectedId) {
      updateElement(selectedId, updates);
    }
  };

  return (
    <div className="w-72 border-l bg-background flex flex-col z-10 hidden lg:flex">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Properties
        </h2>
      </div>

      {selectedElement ? (
        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          {/* Element Type Badge */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
              {selectedElement.type}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {selectedElement.id}
            </span>
          </div>

          {/* Position */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Move className="w-3 h-3" /> Position
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <PropertyField label="X" value={selectedElement.x} onChange={(val) => handleUpdate({ x: val })} min={-2000} />
              <PropertyField label="Y" value={selectedElement.y} onChange={(val) => handleUpdate({ y: val })} min={-2000} />
            </div>
          </div>

          {/* Size */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Maximize2 className="w-3 h-3" /> Size
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <PropertyField label="W" value={selectedElement.width} onChange={(val) => handleUpdate({ width: val })} min={1} />
              <PropertyField label="H" value={selectedElement.height} onChange={(val) => handleUpdate({ height: val })} min={1} />
            </div>
          </div>

          {/* Rotation */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <RotateCw className="w-3 h-3" /> Rotation
            </h3>
            <div className="flex items-center gap-3">
              <Slider
                value={[selectedElement.rotation]}
                onValueChange={([val]) => handleUpdate({ rotation: val })}
                min={0}
                max={360}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10 text-right">
                {Math.round(selectedElement.rotation)}°
              </span>
            </div>
          </div>

          {/* Scale */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground">Scale</h3>
            <div className="grid grid-cols-2 gap-2">
              <PropertyField label="SX" value={selectedElement.scaleX} onChange={(val) => handleUpdate({ scaleX: val })} min={0.1} max={5} step={0.1} />
              <PropertyField label="SY" value={selectedElement.scaleY} onChange={(val) => handleUpdate({ scaleY: val })} min={0.1} max={5} step={0.1} />
            </div>
          </div>

          {/* Fill Color (for shapes/text) */}
          {(selectedElement.type === 'shape' || selectedElement.type === 'text') && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Palette className="w-3 h-3" /> Color
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={selectedElement.fill || '#ff0000'}
                  onChange={(e) => handleUpdate({ fill: e.target.value })}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <Input
                  value={selectedElement.fill || '#ff0000'}
                  onChange={(e) => handleUpdate({ fill: e.target.value })}
                  className="h-7 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Text Content */}
          {selectedElement.type === 'text' && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Type className="w-3 h-3" /> Text
              </h3>
              <textarea
                value={selectedElement.text || ''}
                onChange={(e) => handleUpdate({ text: e.target.value })}
                className="w-full min-h-[80px] text-sm px-3 py-2 rounded border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Timeline Properties */}
          <div className="space-y-2 border-t pt-4">
            <h3 className="text-xs font-semibold text-muted-foreground">Timeline</h3>
            <div className="grid grid-cols-2 gap-2">
              <PropertyField
                label="Start"
                value={selectedElement.startTime / 1000}
                onChange={(val) => handleUpdate({ startTime: val * 1000 })}
                min={0}
                step={0.1}
                suffix="s"
              />
              <PropertyField
                label="Dur"
                value={selectedElement.duration / 1000}
                onChange={(val) => handleUpdate({ duration: val * 1000 })}
                min={0.1}
                step={0.1}
                suffix="s"
              />
            </div>
          </div>

          {/* Z-Index */}
          <div className="space-y-2 border-t pt-4">
            <h3 className="text-xs font-semibold text-muted-foreground">Layer Order</h3>
            <PropertyField label="Z" value={selectedElement.zIndex} onChange={(val) => handleUpdate({ zIndex: val })} min={0} max={100} />
          </div>
        </div>
      ) : (
        <div className="p-4 flex-1 flex flex-col items-center justify-center text-center">
          <Settings2 className="w-8 h-8 text-muted-foreground/30 mb-3" />
          <p className="text-xs text-muted-foreground">
            Select an element on the canvas to edit its properties.
          </p>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;
