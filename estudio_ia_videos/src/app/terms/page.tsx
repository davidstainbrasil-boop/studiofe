import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
    return (
        <div className="container mx-auto py-10 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6">Termos de Uso</h1>
            <div className="prose dark:prose-invert">
                <p>Última atualização: {new Date().toLocaleDateString()}</p>
                <h2>1. Aceitação dos Termos</h2>
                <p>Ao acessar e usar o Estúdio IA de Vídeos, você concorda e aceita cumprir estes termos e condições.</p>
                <h2>2. Descrição do Serviço</h2>
                <p>Fornecemos ferramentas baseadas em inteligência artificial para criação, edição e processamento de vídeos a partir de documentos (PPTX, PDF) e textos.</p>
                <h2>3. Conta do Usuário</h2>
                <p>Você é responsável por manter a confidencialidade de sua conta e senha. Notifique-nos imediatamente sobre qualquer uso não autorizado.</p>
                <h2>4. Uso Aceitável</h2>
                <p>Você concorda em não usar o serviço para qualquer finalidade ilegal ou proibida por estes termos.</p>
                <h2>5. Propriedade Intelectual</h2>
                <p>O conteúdo gerado por você pertence a você. O software e a tecnologia pertencem a nós.</p>
            </div>
            <div className="mt-8">
                <Link href="/">
                    <Button variant="outline">Voltar para Home</Button>
                </Link>
            </div>
        </div>
    );
}
