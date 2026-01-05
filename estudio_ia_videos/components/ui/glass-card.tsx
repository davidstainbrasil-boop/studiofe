"use client";

import { cn } from "@/lib/utils"
// import { motion, HTMLMotionProps } from "framer-motion"
import React from "react"
import dynamic from "next/dynamic"

// Dynamically import motion div to avoid SSR hydration issues
const MotionDiv = dynamic(() => import("framer-motion").then((mod) => mod.motion.div), {
    ssr: false,
    loading: () => <div className="w-full h-full opacity-0" /> // Invisible placeholder
})

// Use standard HTML props for the interface since we are wrapping it
interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode
    className?: string
    gradient?: boolean
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
    ({ children, className, gradient = false, ...props }, ref) => {
        return (
            <MotionDiv
                ref={ref}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className={cn(
                    "relative overflow-hidden rounded-xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-md dark:bg-black/20 dark:border-white/10",
                    gradient && "bg-gradient-to-br from-white/10 to-white/5 dark:from-white/5 dark:to-transparent",
                    className
                )}
                {...props}
            >
                {gradient && (
                    <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
                )}
                <div className="relative z-10">{children}</div>
            </MotionDiv>
        )
    }
)
GlassCard.displayName = "GlassCard"
