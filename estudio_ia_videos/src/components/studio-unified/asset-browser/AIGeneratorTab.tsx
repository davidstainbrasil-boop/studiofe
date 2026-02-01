/**
 * 🤖 AI Generator Tab
 * Geração de conteúdo com IA (imagens, scripts, etc.)
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sparkles,
  Image,
  FileText,
  Mic,
  Video,
  Wand2,
  History,
  Download,
  Copy,
  RefreshCw,
  Loader2,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetItem } from '../UnifiedAssetBrowser';

interface AIGeneratorTabProps {
  searchQuery: string;
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'date' | 'size' | 'type';
  showFavoritesOnly: boolean;
  onAssetSelect?: (asset: AssetItem) => void;
  onAssetDragStart?: (asset: AssetItem) => void;
}

type GeneratorType = 'image' | 'script' | 'narration' | 'suggestions';

interface GenerationHistory {
  id: string;
  type: GeneratorType;
  prompt: string;
  result: string;
  thumbnail?: string;
  createdAt: Date;
}

// Prompt suggestions
const IMAGE_SUGGESTIONS = [
  'Professional workplace safety scene',
  'Industrial factory with workers wearing PPE',
  'Modern office meeting room',
  'Construction site with safety equipment',
  'Training classroom environment',
];

const SCRIPT_SUGGESTIONS = [
  'Introduction to workplace safety',
  'Benefits of wearing proper PPE',
  'Emergency evacuation procedures',
  'Fire safety best practices',
  'Ergonomics at the workplace',
];

export function AIGeneratorTab({
  onAssetSelect,
  onAssetDragStart,
}: AIGeneratorTabProps) {
  const [generatorType, setGeneratorType] = useState<GeneratorType>('image');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  
  // Image generation settings
  const [imageStyle, setImageStyle] = useState('realistic');
  const [imageRatio, setImageRatio] = useState('16:9');
  
  // Script settings
  const [scriptTone, setScriptTone] = useState('professional');
  const [scriptLength, setScriptLength] = useState('medium');

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    
    setGenerating(true);
    
    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    const newItem: GenerationHistory = {
      id: `gen-${Date.now()}`,
      type: generatorType,
      prompt,
      result: generatorType === 'image' 
        ? 'https://via.placeholder.com/512x288/4F46E5/FFFFFF?text=AI+Generated'
        : `Generated ${generatorType} content based on: "${prompt}"`,
      thumbnail: generatorType === 'image' 
        ? 'https://via.placeholder.com/512x288/4F46E5/FFFFFF?text=AI+Generated'
        : undefined,
      createdAt: new Date(),
    };
    
    setHistory((prev) => [newItem, ...prev]);
    setGenerating(false);
  }, [prompt, generatorType]);

  const handleUseSuggestion = useCallback((suggestion: string) => {
    setPrompt(suggestion);
  }, []);

  const handleResultSelect = useCallback(
    (item: GenerationHistory) => {
      if (item.type === 'image' && item.thumbnail) {
        const assetItem: AssetItem = {
          id: item.id,
          name: `AI Image: ${item.prompt.slice(0, 30)}...`,
          type: 'image',
          url: item.result,
          thumbnail: item.thumbnail,
          createdAt: item.createdAt,
          metadata: {
            generator: 'ai',
            prompt: item.prompt,
          },
        };
        onAssetSelect?.(assetItem);
      }
    },
    [onAssetSelect]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, item: GenerationHistory) => {
      if (item.type === 'image' && item.thumbnail) {
        const assetItem: AssetItem = {
          id: item.id,
          name: `AI Image: ${item.prompt.slice(0, 30)}...`,
          type: 'image',
          url: item.result,
          thumbnail: item.thumbnail,
          createdAt: item.createdAt,
          metadata: {
            generator: 'ai',
            prompt: item.prompt,
          },
        };
        e.dataTransfer.setData('application/json', JSON.stringify(assetItem));
        e.dataTransfer.effectAllowed = 'copy';
        onAssetDragStart?.(assetItem);
      }
    },
    [onAssetDragStart]
  );

  const suggestions = generatorType === 'image' ? IMAGE_SUGGESTIONS : SCRIPT_SUGGESTIONS;

  return (
    <div className="space-y-4">
      {/* Generator Type Tabs */}
      <Tabs value={generatorType} onValueChange={(v) => setGeneratorType(v as GeneratorType)}>
        <TabsList className="grid w-full grid-cols-4 h-8">
          <TabsTrigger value="image" className="text-xs">
            <Image className="h-3 w-3 mr-1" />
            Image
          </TabsTrigger>
          <TabsTrigger value="script" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Script
          </TabsTrigger>
          <TabsTrigger value="narration" className="text-xs">
            <Mic className="h-3 w-3 mr-1" />
            Narration
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="text-xs">
            <Lightbulb className="h-3 w-3 mr-1" />
            Ideas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Prompt Input */}
      <div className="space-y-2">
        <Label className="text-xs">Describe what you want to generate</Label>
        <Textarea
          placeholder={
            generatorType === 'image'
              ? 'A professional workplace safety scene with workers wearing helmets...'
              : generatorType === 'script'
              ? 'Write a script about the importance of fire safety...'
              : generatorType === 'narration'
              ? 'Create narration for a training video about PPE...'
              : 'I need ideas for a video about workplace safety...'
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-[80px] text-sm"
        />
      </div>

      {/* Type-specific settings */}
      {generatorType === 'image' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Style</Label>
            <Select value={imageStyle} onValueChange={setImageStyle}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realistic">Realistic</SelectItem>
                <SelectItem value="illustration">Illustration</SelectItem>
                <SelectItem value="3d">3D Render</SelectItem>
                <SelectItem value="cartoon">Cartoon</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Aspect Ratio</Label>
            <Select value={imageRatio} onValueChange={setImageRatio}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16:9">16:9 (Video)</SelectItem>
                <SelectItem value="1:1">1:1 (Square)</SelectItem>
                <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                <SelectItem value="4:3">4:3 (Standard)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {generatorType === 'script' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">Tone</Label>
            <Select value={scriptTone} onValueChange={setScriptTone}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="casual">Casual</SelectItem>
                <SelectItem value="educational">Educational</SelectItem>
                <SelectItem value="motivational">Motivational</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Length</Label>
            <Select value={scriptLength} onValueChange={setScriptLength}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short (~1 min)</SelectItem>
                <SelectItem value="medium">Medium (~3 min)</SelectItem>
                <SelectItem value="long">Long (~5 min)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <Button
        className="w-full"
        onClick={handleGenerate}
        disabled={!prompt.trim() || generating}
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            Generate {generatorType.charAt(0).toUpperCase() + generatorType.slice(1)}
          </>
        )}
      </Button>

      {/* Quick Suggestions */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Quick suggestions</Label>
        <div className="flex flex-wrap gap-1.5">
          {suggestions.slice(0, 3).map((suggestion, i) => (
            <Badge
              key={i}
              variant="outline"
              className="cursor-pointer hover:bg-muted text-xs"
              onClick={() => handleUseSuggestion(suggestion)}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              {suggestion.slice(0, 25)}...
            </Badge>
          ))}
        </div>
      </div>

      {/* Generation History */}
      {history.length > 0 && (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              <History className="h-3 w-3 inline mr-1" />
              Recent generations
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setHistory([])}
            >
              Clear
            </Button>
          </div>
          
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {history.map((item) => (
              <Card
                key={item.id}
                className="p-2 cursor-pointer hover:bg-muted/50"
                draggable={item.type === 'image'}
                onDragStart={(e) => handleDragStart(e, item)}
                onClick={() => handleResultSelect(item)}
              >
                <div className="flex items-start gap-2">
                  {item.thumbnail ? (
                    <div className="h-12 w-20 rounded overflow-hidden flex-shrink-0">
                      <img
                        src={item.thumbnail}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      {item.type === 'script' ? (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      ) : item.type === 'narration' ? (
                        <Mic className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Lightbulb className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{item.prompt}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.createdAt.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <Copy className="h-3 w-3" />
                    </Button>
                    {item.type === 'image' && (
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* API Status */}
      <div className="text-center text-[10px] text-muted-foreground pt-2 border-t">
        <Badge variant="outline" className="text-[10px]">
          <Sparkles className="h-3 w-3 mr-1" />
          Powered by OpenAI
        </Badge>
      </div>
    </div>
  );
}

export default AIGeneratorTab;
