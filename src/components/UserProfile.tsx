'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { z } from 'zod';

const profileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  });

export default function UserProfile() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile state
  const [profile, setProfile] = useState({
    name: '',
    email: '',
  });

  // Password state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Preferences state
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    language: 'pt-BR',
    theme: 'light',
  });

  useEffect(() => {
    if (session?.user) {
      setProfile({
        name: session.user.name || '',
        email: session.user.email || '',
      });
    }

    // Fetch preferences
    fetchPreferences();
  }, [session]);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Erro ao buscar preferências:', error);
    }
  };

  const updateProfile = async () => {
    try {
      const validatedData = profileSchema.parse(profile);
      setLoading(true);
      setMessage(null);

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
        // Update session
        if (session?.user) {
          session.user.name = validatedData.name;
          session.user.email = validatedData.email;
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao atualizar perfil' });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setMessage({ type: 'error', text: error.errors[0].message });
      } else {
        setMessage({ type: 'error', text: 'Erro ao atualizar perfil' });
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    try {
      const validatedData = passwordSchema.parse(passwords);
      setLoading(true);
      setMessage(null);

      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: validatedData.currentPassword,
          newPassword: validatedData.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
        setPasswords({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao atualizar senha' });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setMessage({ type: 'error', text: error.errors[0].message });
      } else {
        setMessage({ type: 'error', text: 'Erro ao atualizar senha' });
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async () => {
    try {
      setLoading(true);
      setMessage(null);

      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Preferências atualizadas com sucesso!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao atualizar preferências' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao atualizar preferências' });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
          <button
            onClick={() => (window.location.href = '/auth/signin')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Fazer Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">TécnicoCursos - Perfil</h1>
            </div>
            <button
              onClick={() => (window.location.href = '/dashboard')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Voltar ao Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Perfil
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'security'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Segurança
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'preferences'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Preferências
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Informações Pessoais</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
                      <input
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={updateProfile}
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Alterar Senha</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Senha Atual
                      </label>
                      <input
                        type="password"
                        value={passwords.currentPassword}
                        onChange={(e) =>
                          setPasswords({ ...passwords, currentPassword: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nova Senha
                      </label>
                      <input
                        type="password"
                        value={passwords.newPassword}
                        onChange={(e) =>
                          setPasswords({ ...passwords, newPassword: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirmar Nova Senha
                      </label>
                      <input
                        type="password"
                        value={passwords.confirmPassword}
                        onChange={(e) =>
                          setPasswords({ ...passwords, confirmPassword: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={updatePassword}
                      disabled={loading || !passwords.currentPassword || !passwords.newPassword}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Atualizando...' : 'Atualizar Senha'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Preferências do Usuário
                  </h2>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          Notificações por Email
                        </h3>
                        <p className="text-sm text-gray-600">
                          Receber notificações sobre seus vídeos e projetos
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setPreferences({
                            ...preferences,
                            emailNotifications: !preferences.emailNotifications,
                          })
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          preferences.emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">Notificações Push</h3>
                        <p className="text-sm text-gray-600">
                          Notificações em tempo real no navegador
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setPreferences({
                            ...preferences,
                            pushNotifications: !preferences.pushNotifications,
                          })
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          preferences.pushNotifications ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            preferences.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Idioma</label>
                      <select
                        value={preferences.language}
                        onChange={(e) =>
                          setPreferences({ ...preferences, language: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="pt-BR">Português (Brasil)</option>
                        <option value="en-US">English (US)</option>
                        <option value="es-ES">Español</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tema</label>
                      <select
                        value={preferences.theme}
                        onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="light">Claro</option>
                        <option value="dark">Escuro</option>
                        <option value="auto">Automático</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={updatePreferences}
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Salvando...' : 'Salvar Preferências'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
