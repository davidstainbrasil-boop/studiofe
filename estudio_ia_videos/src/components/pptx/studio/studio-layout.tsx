import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface StudioLayoutProps {
    children: React.ReactNode
    sidebar: React.ReactNode
    bottomPanel?: React.ReactNode
    rightPanel?: React.ReactNode
    className?: string
}

export function StudioLayout({
    children,
    sidebar,
    bottomPanel,
    rightPanel,
    className
}: StudioLayoutProps) {
    return (
        <div className="flex h-screen w-full bg-[#0f1115] text-white overflow-hidden font-sans">
            {/* Sidebar - Video Creation Tools */}
            <aside className="w-16 md:w-20 lg:w-72 flex-shrink-0 border-r border-white/10 bg-[#0f1115] z-30 flex flex-col transition-all duration-300">
                {sidebar}
            </aside>

            {/* Main Content Area - Grid Layout */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#0f1115] relative">

                {/* Workspace - Canvas Area */}
                <div className="flex-1 relative overflow-hidden flex">
                    {/* Canvas Viewport */}
                    <div className="flex-1 relative bg-[#1c1f26] m-4 rounded-xl border border-white/5 shadow-2xl overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5 pointer-events-none" />
                        {children}
                    </div>

                    {/* Right Panel - Properties (Optional) */}
                    <AnimatePresence mode="wait">
                        {rightPanel && (
                            <motion.aside
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: 320, opacity: 1 }}
                                exit={{ width: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="border-l border-white/10 bg-[#0f1115] flex-shrink-0 z-20 overflow-hidden"
                            >
                                <div className="w-80 h-full">
                                    {rightPanel}
                                </div>
                            </motion.aside>
                        )}
                    </AnimatePresence>
                </div>

                {/* Bottom Panel - Timeline */}
                <AnimatePresence>
                    {bottomPanel && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 288, opacity: 1 }} // 72 * 4 = 288px
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="border-t border-white/10 bg-[#0f1115] z-20 flex-shrink-0 overflow-hidden"
                        >
                            <div className="h-72 w-full">
                                {bottomPanel}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Global Status Bar (Phase 5) */}
                <div className="h-6 bg-[#0a0c10] border-t border-white/5 flex items-center justify-between px-3 text-[10px] text-gray-500 select-none z-50">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            Online
                        </span>
                        <span>v3.0.0 (Unified)</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="hover:text-white cursor-pointer transition-colors">Auto-save: ON</span>
                        <span className="hover:text-white cursor-pointer transition-colors">Rendering Engine: Ready</span>
                        <span suppressHydrationWarning>{new Date().toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </main>
        </div>
    )
}
