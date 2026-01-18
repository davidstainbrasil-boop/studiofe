/**
 * Video Render Dialog
 * UI for rendering VideoProject to video file
 */

'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Download, Film, Settings2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { VideoProject } from '@/types/video-project';
import { VideoRenderer, type RenderProgress, type RenderOptions } from '@/lib/video/video-renderer';

interface VideoRenderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: VideoProject | null;
}

export function VideoRenderDialog({ open, onOpenChange, project }: VideoRenderDialogProps) {
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  const [resolution, setResolution] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [renderProgress, setRenderProgress] = useState<RenderProgress | null>(null);
  const [renderResult, setRenderResult] = useState<{ url: string; duration: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderer, setRenderer] = useState<VideoRenderer | null>(null);

  // Get resolution dimensions
  const getResolution = useCallback(() => {
    switch (resolution) {
      case '720p':
        return { width: 1280, height: 720 };
      case '1080p':
        return { width: 1920, height: 1080 };
      case '4k':
        return { width: 3840, height: 2160 };
      default:
        return { width: 1920, height: 1080 };
    }
  }, [resolution]);

  // Calculate estimated file size
  const getEstimatedSize = useCallback(() => {
    if (!project) return '0 MB';

    const totalDuration = project.scenes.reduce((sum, scene) => sum + scene.duration, 0);
    const bitrate = quality === 'low' ? 2.5 : quality === 'medium' ? 5 : 10; // Mbps
    const sizeInMB = (totalDuration * bitrate) / 8;

    return sizeInMB < 1 ? `${(sizeInMB * 1024).toFixed(0)} KB` : `${sizeInMB.toFixed(1)} MB`;
  }, [project, quality]);

  // Start rendering
  const handleRender = useCallback(async () => {
    if (!project) return;

    setIsRendering(true);
    setRenderProgress(null);
    setRenderResult(null);
    setError(null);

    const dims = getResolution();
    const options: Partial<RenderOptions> = {
      quality,
      fps: 30,
      width: dims.width,
      height: dims.height,
      format: 'mp4',
      onProgress: (progress) => {
        setRenderProgress(progress);
      },
    };

    const newRenderer = new VideoRenderer(options);
    setRenderer(newRenderer);

    try {
      const result = await newRenderer.render(project);

      if (result.success && result.url) {
        setRenderResult({ url: result.url, duration: result.duration });
      } else {
        setError(result.error || 'Unknown error occurred');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rendering failed');
    } finally {
      setIsRendering(false);
      setRenderer(null);
    }
  }, [project, quality, getResolution]);

  // Cancel rendering
  const handleCancel = useCallback(() => {
    if (renderer) {
      renderer.abort();
    }
    setIsRendering(false);
    setRenderProgress(null);
  }, [renderer]);

  // Download video
  const handleDownload = useCallback(() => {
    if (!renderResult || !project) return;

    const a = document.createElement('a');
    a.href = renderResult.url;
    a.download = `${project.name.replace(/\s+/g, '_')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [renderResult, project]);

  // Reset and close
  const handleClose = useCallback(() => {
    if (isRendering) {
      handleCancel();
    }
    setRenderProgress(null);
    setRenderResult(null);
    setError(null);
    onOpenChange(false);
  }, [isRendering, handleCancel, onOpenChange]);

  if (!project) return null;

  const totalDuration = project.scenes.reduce((sum, scene) => sum + scene.duration, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            Render Video
          </DialogTitle>
          <DialogDescription>
            Export your project as a video file. This may take several minutes depending on project
            complexity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Project Info */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Project</div>
                <div className="font-medium">{project.name}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Scenes</div>
                <div className="font-medium">{project.scenes.length}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Duration</div>
                <div className="font-medium">{totalDuration.toFixed(1)}s</div>
              </div>
            </div>
          </div>

          {/* Settings */}
          {!isRendering && !renderResult && !error && (
            <>
              {/* Quality */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Quality
                </Label>
                <RadioGroup value={quality} onValueChange={(v) => setQuality(v as typeof quality)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="quality-low" />
                    <Label htmlFor="quality-low" className="cursor-pointer font-normal">
                      Low (2.5 Mbps) - Smaller file size
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="quality-medium" />
                    <Label htmlFor="quality-medium" className="cursor-pointer font-normal">
                      Medium (5 Mbps) - Balanced (Recommended)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="quality-high" />
                    <Label htmlFor="quality-high" className="cursor-pointer font-normal">
                      High (10 Mbps) - Best quality
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Resolution */}
              <div className="space-y-3">
                <Label>Resolution</Label>
                <RadioGroup
                  value={resolution}
                  onValueChange={(v) => setResolution(v as typeof resolution)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="720p" id="res-720p" />
                    <Label htmlFor="res-720p" className="cursor-pointer font-normal">
                      720p (1280x720) - HD
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1080p" id="res-1080p" />
                    <Label htmlFor="res-1080p" className="cursor-pointer font-normal">
                      1080p (1920x1080) - Full HD (Recommended)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4k" id="res-4k" />
                    <Label htmlFor="res-4k" className="cursor-pointer font-normal">
                      4K (3840x2160) - Ultra HD
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Estimated Size */}
              <div className="p-3 bg-muted/50 rounded border border-border">
                <div className="text-sm">
                  <span className="text-muted-foreground">Estimated file size: </span>
                  <span className="font-medium">{getEstimatedSize()}</span>
                </div>
              </div>
            </>
          )}

          {/* Rendering Progress */}
          {isRendering && renderProgress && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{renderProgress.message}</span>
                  <span className="text-muted-foreground">
                    {renderProgress.progress.toFixed(0)}%
                  </span>
                </div>
                <Progress value={renderProgress.progress} className="h-2" />
                {renderProgress.currentFrame && renderProgress.totalFrames && (
                  <div className="text-xs text-muted-foreground">
                    Frame {renderProgress.currentFrame} / {renderProgress.totalFrames}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  Rendering in progress. This may take a few minutes...
                </p>
              </div>
            </div>
          )}

          {/* Success */}
          {renderResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">
                    Video rendered successfully!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Completed in {renderResult.duration.toFixed(1)} seconds
                  </p>
                </div>
              </div>

              {/* Video Preview */}
              <div className="rounded-lg overflow-hidden border border-border bg-black">
                <video
                  src={renderResult.url}
                  controls
                  className="w-full"
                  style={{ maxHeight: '300px' }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">Rendering failed</p>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {!isRendering && !renderResult && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleRender}>
                <Film className="h-4 w-4 mr-2" />
                Start Rendering
              </Button>
            </>
          )}

          {isRendering && (
            <Button variant="destructive" onClick={handleCancel}>
              Cancel Rendering
            </Button>
          )}

          {renderResult && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download Video
              </Button>
            </>
          )}

          {error && (
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
