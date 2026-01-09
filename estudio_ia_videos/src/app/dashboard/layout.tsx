'use client'

import React from 'react'
import { PremiumSidebar } from '@components/dashboard/premium-sidebar'
import { PremiumHeader } from '@components/dashboard/premium-header'
import { ScrollArea } from '@components/ui/scroll-area'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <PremiumSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PremiumHeader />
        <main className="flex-1 overflow-hidden bg-gray-50/50 dark:bg-black/20">
          <ScrollArea className="h-full">
            <div className="container-fluid py-6">
              {children}
            </div>
          </ScrollArea>
        </main>
      </div>
    </div>
  )
}
