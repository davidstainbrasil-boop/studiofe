
'use client';

import React from 'react';
import { Button } from '@components/ui/button';
import { Progress } from '@components/ui/progress';
import { Zap } from 'lucide-react';
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from '@components/ui/hover-card';

interface UsageIndicatorProps {
    plan: 'free' | 'pro';
    usage: {
        renders: number;
        storage: number;
    };
    limits: {
        renders: number;
        storage: number;
    };
}

export function UsageIndicator({ plan, usage, limits }: UsageIndicatorProps) {
    const renderPercentage = (usage.renders / limits.renders) * 100;

    return (
        <HoverCard>
            <HoverCardTrigger asChild>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 cursor-pointer hover:bg-muted transition-colors border border-transparent hover:border-border">
                    <div className="relative">
                        <Zap className={`w-4 h-4 ${plan === 'pro' ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground'}`} />
                        {plan === 'free' && (
                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-semibold leading-tight uppercase tracking-wider text-muted-foreground">
                            {plan === 'free' ? 'Free Plan' : 'Pro Plan'}
                        </span>
                        <div className="flex items-center gap-1.5 h-3">
                            <Progress value={renderPercentage} className="h-1.5 w-16" />
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                                {usage.renders}/{limits.renders}
                            </span>
                        </div>
                    </div>
                </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-80" align="end">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Usage & Quotas</h4>
                        <p className="text-xs text-muted-foreground">
                            Resets on the 1st of every month.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Monthly Renders</span>
                                <span className={usage.renders >= limits.renders ? 'text-destructive' : ''}>
                                    {usage.renders} / {limits.renders}
                                </span>
                            </div>
                            <Progress value={renderPercentage} className={usage.renders >= limits.renders ? '[&>div]:bg-destructive' : ''} />
                        </div>

                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span>Storage Used</span>
                                <span>{(usage.storage / 1024 / 1024 / 1024).toFixed(1)} GB / {(limits.storage / 1024 / 1024 / 1024).toFixed(0)} GB</span>
                            </div>
                            <Progress value={(usage.storage / limits.storage) * 100} />
                        </div>
                    </div>

                    {plan === 'free' && (
                        <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0">
                            Upgrade to Pro 🚀
                        </Button>
                    )}
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}
