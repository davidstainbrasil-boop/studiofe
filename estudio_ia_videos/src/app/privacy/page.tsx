import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
    return (
        <div className="container mx-auto py-10 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
            <div className="prose dark:prose-invert">
                <p>Última atualização: {new Date().toLocaleDateString()}</p>
                <h2>1. Coleta de Informações</h2>
                <p>Coletamos informações que você nos fornece diretamente, como nome, email e arquivos enviados para processamento.</p>
                <h2>2. Uso das Informações</h2>
                <p>Usamos suas informações para operar, manter e melhorar nossos serviços, além de comunicar novidades e atualizações.</p>
                <h2>3. Compartilhamento de Dados</h2>
                <p>Não vendemos seus dados pessoais. Compartilhamos dados com terceiros apenas quando necessário para a prestação do serviço (ex: provedores de IA, processamento de pagamentos).</p>
                <h2>4. Segurança</h2>
                <p>Implementamos medidas de segurança para proteger seus dados contra acesso não autorizado.</p>
                <h2>5. Seus Direitos</h2>
                <p>Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento.</p>
            </div>
            <div className="mt-8">
                <Link href="/">
                    <Button variant="outline">Voltar para Home</Button>
                </Link>
            </div>
        </div>
    );
}
