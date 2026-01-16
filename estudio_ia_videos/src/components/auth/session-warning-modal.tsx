/**
 * 🔐 Session Warning Modal
 * Displays when user session is about to expire
 */

'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SessionWarningModalProps {
    open: boolean;
    onExtend: () => void;
    isRefreshing?: boolean;
}

export function SessionWarningModal({ open, onExtend, isRefreshing }: SessionWarningModalProps) {
    const router = useRouter();

    const handleLogout = () => {
        router.push('/logout');
    };

    // Auto-focus the extend button when modal opens
    useEffect(() => {
        if (open) {
            const timer = setTimeout(() => {
                const extendBtn = document.getElementById('session-extend-btn');
                extendBtn?.focus();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [open]);

    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center gap-2 text-amber-500">
                        <Clock className="h-5 w-5" />
                        <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-left">
                        Your session will expire in a few minutes due to inactivity.
                        Would you like to stay logged in?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={handleLogout}
                        className="flex items-center gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Log Out
                    </Button>
                    <AlertDialogAction
                        id="session-extend-btn"
                        onClick={onExtend}
                        disabled={isRefreshing}
                        className="flex items-center gap-2 bg-primary"
                    >
                        {isRefreshing ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Refreshing...
                            </>
                        ) : (
                            <>
                                <RefreshCw className="h-4 w-4" />
                                Stay Logged In
                            </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
