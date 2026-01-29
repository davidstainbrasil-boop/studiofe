export const metadata = {
    title: 'Blog - Studio Unified',
    description: 'Novidades e artigos sobre criação de vídeos com IA.',
};

export default function BlogPage() {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="container mx-auto px-6 py-24 text-center">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white">Blog</h1>
                <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                    Conteúdo em breve. Enquanto isso, confira o Studio Unified.
                </p>
            </div>
        </div>
    );
}
