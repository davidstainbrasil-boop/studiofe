"use client"

import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    LayoutDashboard,
    FolderOpen,
    BarChart3,
    Bell,
    Play,
    Zap,
    Settings,
    ChevronLeft,
    ChevronRight,
    LayoutGrid
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const navigationItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/dashboard/browse", label: "Browse", icon: LayoutGrid },
    { href: "/dashboard/projects", label: "Projects", icon: FolderOpen },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
    { href: "/dashboard/render", label: "Render Pipeline", icon: Play },
    { href: "/dashboard/apis", label: "External APIs", icon: Zap },
]

export function PremiumSidebar() {
    const pathname = usePathname()
    const [isCollapsed, setIsCollapsed] = useState(false)

    // Animation variants
    const sidebarVariants = {
        expanded: { width: 280 },
        collapsed: { width: 80 }
    }

    return (
        <motion.div
            initial="expanded"
            animate={isCollapsed ? "collapsed" : "expanded"}
            variants={sidebarVariants}
            transition={{ duration: 0.3, type: "spring", stiffness: 100 }}
            className="relative z-20 flex h-screen flex-col border-r border-white/10 bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white shadow-2xl"
        >
            {/* Glow Effect */}
            <div className="pointer-events-none absolute -left-1/2 top-0 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px]" />

            {/* Header */}
            <div className="flex items-center justify-between p-6">
                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center space-x-2"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/25">
                                <Play className="h-4 w-4 fill-current text-white" />
                            </div>
                            <span className="text-lg font-bold tracking-tight">VideoStudio</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="ml-auto text-muted-foreground hover:bg-white/10 hover:text-white"
                >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-4 py-2">
                <nav className="space-y-1">
                    {navigationItems.map((item) => {
                        const Icon = item.icon
                        const isActive = item.exact
                            ? pathname === item.href
                            : pathname?.startsWith(item.href)

                        return (
                            <Link key={item.href} href={item.href} passHref>
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "group relative w-full justify-start overflow-hidden rounded-xl px-3 py-6 transition-all hover:bg-white/10",
                                            isActive
                                                ? "bg-white/10 text-white shadow-inner font-semibold"
                                                : "text-muted-foreground hover:text-white"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute left-0 top-0 h-full w-1 bg-primary"
                                            />
                                        )}
                                        <Icon className={cn("h-5 w-5 transition-colors", isActive ? "text-primary-400" : "group-hover:text-white")} />

                                        {!isCollapsed && (
                                            <motion.span
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="ml-3"
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </Button>
                                </motion.div>
                            </Link>
                        )
                    })}
                </nav>
            </ScrollArea>

            {/* Footer / User Profile */}
            <div className="border-t border-white/10 p-4">
                {isCollapsed ? (
                    <div className="flex justify-center">
                        <Avatar className="h-8 w-8 ring-2 ring-white/10 transition-shadow hover:ring-primary/50">
                            <AvatarImage src="/placeholder-avatar.jpg" />
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                    </div>
                ) : (
                    <GlassCardComponent className="flex items-center space-x-3 border-none bg-white/5 p-3 hover:bg-white/10 transition-colors">
                        <Avatar className="h-9 w-9 ring-2 ring-white/10">
                            <AvatarImage src="/placeholder-avatar.jpg" />
                            <AvatarFallback>U</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-sm font-medium text-white">User Name</p>
                            <p className="truncate text-xs text-muted-foreground">Pro Plan</p>
                        </div>
                        <Settings className="h-4 w-4 text-muted-foreground hover:text-white cursor-pointer" />
                    </GlassCardComponent>
                )}
            </div>
        </motion.div>
    )
}

function GlassCardComponent({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={cn("rounded-xl backdrop-blur-md", className)}>
            {children}
        </div>
    )
}
