'use client';
import { logger } from '@/lib/logger';

import React from 'react';

export class EmergencyErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        logger.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.children;
        }
        return this.props.children;
    }
}
