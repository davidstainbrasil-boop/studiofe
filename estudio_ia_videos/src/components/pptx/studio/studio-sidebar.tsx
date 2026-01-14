import React from 'react'
import { Button } from '@components/ui/button'
import { ScrollArea } from '@components/ui/scroll-area'
import { cn } from '@lib/utils'
import {
    Upload,
    Layout,
    Type,
    Image as ImageIcon,
    Music,
    Settings,
    ChevronLeft,
    LucideIcon,
    Sparkles
} from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@components/ui/tooltip"

interface StudioSidebarProps {
    activeTab: string
    onTabChange: (tab: string) => void
    disabled?: boolean
}

interface SidebarItem {
    id: string
    label: string
    icon: LucideIcon
    disabled?: boolean
}

const SIDEBAR_ITEMS: SidebarItem[] = [
    { id: 'upload', label: 'Uploads', icon: Upload },
    { id: 'slides', label: 'Slides', icon: Layout },
    { id: 'text', label: 'Texto', icon: Type },
    { id: 'media', label: 'Mídia', icon: ImageIcon },
    { id: 'audio', label: 'Áudio', icon: Music },
    { id: 'ai', label: 'IA Voice', icon: Sparkles },
]

export function StudioSidebar({ activeTab, onTabChange, disabled }: StudioSidebarProps) {
    return (
        <TooltipProvider delayDuration={0}>
            <div className="flex flex-row h-full w-full">
                {/* Icon Navigation Rail */}
                <div className="w-16 md:w-20 bg-[#0f1115] flex flex-col items-center py-6 gap-4 border-r border-white/5 z-20">
                    <div className="mb-4">
                        {/* Logo or Brand Icon can go here */}
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 shadow-lg shadow-blue-500/20" />
                    </div>

                    {SIDEBAR_ITEMS.map((item) => {
                        const Icon = item.icon
                        return (
                            <Tooltip key={item.id}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={disabled || item.disabled}
                                        onClick={() => onTabChange(item.id)}
                                        className={cn(
                                            "w-10 h-10 md:w-12 md:h-12 rounded-xl mb-1 transition-all duration-200 hover:bg-white/10",
                                            activeTab === item.id
                                                ? "bg-white/10 text-white shadow-inner shadow-black/50 ring-1 ring-white/10"
                                                : "text-gray-400 hover:text-white"
                                        )}
                                    >
                                        <Icon className="w-5 h-5 md:w-6 md:h-6" />
                                        <span className="sr-only">{item.label}</span>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-[#1c1f26] border-white/10 text-white">
                                    <p>{item.label}</p>
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}

                    <div className="mt-auto">
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                            <Settings className="w-6 h-6" />
                        </Button>
                    </div>
                </div>

                {/* Expanded Panel (Drawer) - Visible on larger screens or when active */}
                <div className={cn(
                    "flex-1 bg-[#151921] h-full transition-all duration-300 overflow-hidden hidden lg:block",
                    "border-r border-white/5"
                )}>
                    <div className="h-full flex flex-col">
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
                                {SIDEBAR_ITEMS.find(i => i.id === activeTab)?.label || 'Ferramentas'}
                            </h2>
                        </div>

                        <ScrollArea className="flex-1 p-4">
                            {/* Content for each tab would go here */}
                            {activeTab === 'upload' && (
                                <div className="text-xs text-gray-500 text-center mt-10">
                                    Gerencie seus arquivos PPTX e mídias aqui.
                                </div>
                            )}
                            {activeTab === 'slides' && (
                                <div className="text-xs text-gray-500 text-center mt-10">
                                    Visualização rápida dos slides do projeto.
                                </div>
                            )}
                            {/* ... other empty states ... */}
                        </ScrollArea>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    )
}
