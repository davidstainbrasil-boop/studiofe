'use client';

import { useEffect, useState } from 'react';
import type { UserFriendlyError } from '@lib/utils/error-handler';

interface ErrorToastProps {
    error: UserFriendlyError;
    onClose: () => void;
    duration?: number;
}

export function ErrorToast({ error, onClose, duration = 7000 }: ErrorToastProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for fade out animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div
            className={`fixed bottom-4 right-4 max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-lg border-l-4 border-red-500 p-4 transition-all duration-300 z-50 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
        >
            <div className="flex items-start">
                <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {error.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                        {error.message}
                    </p>
                    {error.action && (
                        <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 font-medium">
                            → {error.action}
                        </p>
                    )}
                    {process.env.NODE_ENV === 'development' && error.technical && (
                        <details className="mt-2">
                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                                Detalhes técnicos
                            </summary>
                            <pre className="mt-1 text-xs text-gray-500 overflow-auto max-h-20 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                                {error.technical}
                            </pre>
                        </details>
                    )}
                </div>
                <button
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(onClose, 300);
                    }}
                    className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    );
}

// Toast Container Hook
export function useErrorToast() {
    const [errors, setErrors] = useState<Array<{ id: string; error: UserFriendlyError }>>([]);

    const showError = (error: UserFriendlyError) => {
        const id = `error-${Date.now()}-${Math.random()}`;
        setErrors((prev) => [...prev, { id, error }]);
    };

    const removeError = (id: string) => {
        setErrors((prev) => prev.filter((e) => e.id !== id));
    };

    return {
        showError,
        ErrorToasts: (
            <div className="fixed bottom-4 right-4 space-y-2 z-50">
                {errors.map(({ id, error }) => (
                    <ErrorToast key={id} error={error} onClose={() => removeError(id)} />
                ))}
            </div>
        )
    };
}
