"use client"

import React from "react"
import { Search, Bell, HelpCircle, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreateProjectDialog } from "@/components/dashboard/create-project-dialog"

export function PremiumHeader() {
    return (
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur-xl transition-all">
            <div className="flex flex-1 items-center gap-4">
                <div className="relative w-96 hidden md:block">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search projects, assets, or templates..."
                        className="h-9 w-full rounded-full bg-muted/50 pl-9 focus:bg-background focus:ring-2 focus:ring-primary/20"
                    />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                    <HelpCircle className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
                </Button>

                {/* We can incorporate the CreateProjectDialog here directly or pass it as prop? 
            Since CreateProjectDialog exports a component that wraps a trigger, we use it. 
        */}
                <div className="ml-2">
                    <CreateProjectDialog
                        trigger={
                            <Button size="sm" className="hidden md:flex bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-full px-4">
                                <Plus className="mr-2 h-4 w-4" />
                                New Project
                            </Button>
                        }
                    />
                </div>
            </div>
        </header>
    )
}
