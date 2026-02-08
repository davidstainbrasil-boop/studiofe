
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Settings, Activity, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function AdminSidebar() {
    const pathname = usePathname();

    const links = [
        { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/users', label: 'Users', icon: Users },
        { href: '/admin/settings', label: 'Settings', icon: Settings },
        { href: '/admin/activity', label: 'Activity Logs', icon: Activity },
    ];

    return (
        <div className="w-64 border-r bg-muted/30 flex flex-col h-full">
            <div className="p-6 border-b">
                <h2 className="font-bold text-lg tracking-tight flex items-center gap-2">
                    🛡️ Admin Panel
                </h2>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

                    return (
                        <Link key={link.href} href={link.href}>
                            <Button
                                variant={isActive ? "secondary" : "ghost"}
                                className={cn("w-full justify-start gap-3", isActive && "bg-secondary")}
                            >
                                <Icon className="w-4 h-4" />
                                {link.label}
                            </Button>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t">
                <Link href="/studio-pro">
                    <Button variant="outline" className="w-full justify-start gap-3">
                        <Home className="w-4 h-4" />
                        Back to Studio
                    </Button>
                </Link>
            </div>
        </div>
    );
}
