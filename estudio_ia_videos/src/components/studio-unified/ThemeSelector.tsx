
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check, Lock } from 'lucide-react';
import { EXPORT_THEMES, Theme } from '@/lib/themes/theme-registry';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

import { useTimelineStore } from '@/lib/stores/timeline-store';

export function ThemeSelector() {
    const currentThemeId = useTimelineStore(state => state.project?.themeId);
    const setTheme = useTimelineStore(state => state.setTheme);
    const themes = Object.values(EXPORT_THEMES);

    // Mock Pro status for now, or get from user store
    const isPro = true;

    const onThemeSelect = (id: string) => {
        setTheme(id);
    };

    return (
        <div className="grid grid-cols-2 gap-3 p-1">
            {themes.map((theme) => {
                const isSelected = currentThemeId === theme.id;
                const isLocked = theme.isPremium && !isPro;

                return (
                    <button
                        key={theme.id}
                        onClick={() => !isLocked && onThemeSelect(theme.id)}
                        disabled={isLocked}
                        className={cn(
                            "relative group text-left transition-all rounded-lg border-2 overflow-hidden",
                            isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-slate-200",
                            isLocked && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        <div
                            className="h-16 w-full relative"
                            style={{ background: theme.styles.background }}
                        >
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span
                                    className="text-xs font-bold"
                                    style={{ color: theme.styles.textPrimary, fontFamily: theme.styles.fontFamily }}
                                >
                                    Aa
                                </span>
                            </div>
                            {isSelected && (
                                <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                                    <Check className="w-3 h-3" />
                                </div>
                            )}
                            {isLocked && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                    <Lock className="w-5 h-5 text-white" />
                                </div>
                            )}
                        </div>
                        <div className="p-2 bg-card">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium truncate w-[80%]">{theme.name}</span>
                                {theme.isPremium && <Badge variant="secondary" className="text-[10px] px-1 h-4">Pro</Badge>}
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
