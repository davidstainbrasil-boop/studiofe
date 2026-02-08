import { Loader2 } from 'lucide-react'

export default function StudioProLoading() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                    <div className="relative rounded-full bg-blue-600/20 p-4">
                        <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                    </div>
                </div>
                <div className="text-center">
                    <h2 className="text-lg font-semibold text-white">Carregando Studio Pro</h2>
                    <p className="text-sm text-slate-400 mt-1">Preparando editor de vídeo...</p>
                </div>
            </div>
        </div>
    )
}
