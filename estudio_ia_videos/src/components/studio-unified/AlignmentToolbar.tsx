'use client';

/**
 * Alignment Toolbar Component
 * Provides quick access to alignment and distribution tools
 */

import React from 'react';
import { Button } from '@components/ui/button';
import { Separator } from '@components/ui/separator';
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  ArrowLeftRight,
  ArrowUpDown,
  Group,
  Ungroup,
} from 'lucide-react';
import { cn } from '@lib/utils';

export interface AlignmentToolbarProps {
  selectedCount: number;
  onAlignLeft: () => void;
  onAlignCenter: () => void;
  onAlignRight: () => void;
  onAlignTop: () => void;
  onAlignMiddle: () => void;
  onAlignBottom: () => void;
  onDistributeHorizontally: () => void;
  onDistributeVertically: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  className?: string;
}

export function AlignmentToolbar({
  selectedCount,
  onAlignLeft,
  onAlignCenter,
  onAlignRight,
  onAlignTop,
  onAlignMiddle,
  onAlignBottom,
  onDistributeHorizontally,
  onDistributeVertically,
  onGroup,
  onUngroup,
  className,
}: AlignmentToolbarProps) {
  const hasMultiple = selectedCount >= 2;
  const canDistribute = selectedCount >= 3;

  return (
    <div
      className={cn('flex items-center gap-1 px-2 py-1 bg-background border rounded-md', className)}
    >
      {/* Horizontal Alignment */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onAlignLeft}
          disabled={!hasMultiple}
          title="Align Left (select 2+ elements)"
        >
          <AlignStartVertical className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onAlignCenter}
          disabled={!hasMultiple}
          title="Align Center (select 2+ elements)"
        >
          <AlignCenterVertical className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onAlignRight}
          disabled={!hasMultiple}
          title="Align Right (select 2+ elements)"
        >
          <AlignEndVertical className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Vertical Alignment */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onAlignTop}
          disabled={!hasMultiple}
          title="Align Top (select 2+ elements)"
        >
          <AlignStartHorizontal className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onAlignMiddle}
          disabled={!hasMultiple}
          title="Align Middle (select 2+ elements)"
        >
          <AlignCenterHorizontal className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onAlignBottom}
          disabled={!hasMultiple}
          title="Align Bottom (select 2+ elements)"
        >
          <AlignEndHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Distribution */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onDistributeHorizontally}
          disabled={!canDistribute}
          title="Distribute Horizontally (select 3+ elements)"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onDistributeVertically}
          disabled={!canDistribute}
          title="Distribute Vertically (select 3+ elements)"
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Grouping */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onGroup}
          disabled={!hasMultiple}
          title="Group (Ctrl+G, select 2+ elements)"
        >
          <Group className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onUngroup}
          disabled={selectedCount === 0}
          title="Ungroup (Ctrl+Shift+G)"
        >
          <Ungroup className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
