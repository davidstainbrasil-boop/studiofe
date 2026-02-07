"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"

/**
 * AnimatedContent - Componente interno que usa usePathname().
 * Só é montado client-side após hydration para evitar crash
 * durante prerenderização estática (useContext null).
 */
function AnimatedContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="h-full w-full"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    )
}

/**
 * Template wrapper - aplica animação de transição de página.
 * Durante SSR/prerender, renderiza children diretamente (sem animação).
 * Após hydration, monta AnimatedContent com framer-motion + usePathname.
 */
export default function Template({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return <div className="h-full w-full">{children}</div>
    }

    return <AnimatedContent>{children}</AnimatedContent>
}
