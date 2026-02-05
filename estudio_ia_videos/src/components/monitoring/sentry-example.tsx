'use client';

import { useSentry } from '@/hooks/use-sentry';

/**
 * Exemplo de componente usando Sentry para monitoramento
 */
export function SentryExample() {
  const { captureError, logMessage, setUserInfo } = useSentry();

  const handleTestError = () => {
    try {
      throw new Error('Erro de teste do componente Sentry');
    } catch (error) {
      captureError(error as Error, {
        component: 'SentryExample',
        action: 'test_error',
      });
    }
  };

  const handleTestMessage = () => {
    logMessage('Mensagem informativa de teste', 'info');
  };

  const handleSetUser = () => {
    setUserInfo({
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'testuser',
    });
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="font-bold mb-2">Testes Sentry</h3>
      <div className="space-y-2">
        <button
          onClick={handleTestError}
          className="px-3 py-1 bg-red-500 text-white rounded text-sm"
        >
          Testar Erro
        </button>
        <button
          onClick={handleTestMessage}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm ml-2"
        >
          Testar Mensagem
        </button>
        <button
          onClick={handleSetUser}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm ml-2"
        >
          Definir Usuário
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-2">
        Configure SENTRY_DSN no .env.local para enviar eventos
      </p>
    </div>
  );
}
