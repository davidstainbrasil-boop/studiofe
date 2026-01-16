
'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class StudioErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error in Studio:', error, errorInfo);
        // Ideally log to Sentry here: Sentry.captureException(error);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground p-4">
                    <div className="bg-destructive/10 p-6 rounded-lg border border-destructive/20 max-w-md w-full text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-destructive" />
                            </div>
                        </div>

                        <h2 className="text-xl font-bold mb-2">Oops! Something went wrong.</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            The editor encountered an unexpected error. We've logged this issue.
                        </p>

                        {this.state.error && (
                            <div className="bg-black/50 p-2 rounded text-xs text-left font-mono mb-6 overflow-auto max-h-32">
                                {this.state.error.message}
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <Button onClick={this.handleReload} variant="outline" className="gap-2">
                                <RefreshCcw className="w-4 h-4" />
                                Reload Editor
                            </Button>
                            {/* 
                TODO: Add a "Save Snapshot" button here that attempts to dump 
                localStorage or useTimelineStore.getState() to JSON 
               */}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
