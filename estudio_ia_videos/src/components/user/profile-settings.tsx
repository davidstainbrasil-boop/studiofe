'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Lock,
  Bell,
  Palette,
  Globe,
  Shield,
  CreditCard,
  Camera,
  Check,
  X,
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
  LogOut,
  Trash2,
  Download,
  Key,
  Smartphone,
  History,
  HelpCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types
interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  location?: string;
  bio?: string;
  language: string;
  timezone: string;
  createdAt: string;
}

interface NotificationPreferences {
  emailDigest: boolean;
  projectUpdates: boolean;
  marketing: boolean;
  securityAlerts: boolean;
  weeklyReport: boolean;
}

interface ProfileSettingsProps {
  profile?: UserProfile;
  notifications?: NotificationPreferences;
  onProfileUpdate?: (data: Partial<UserProfile>) => Promise<void>;
  onPasswordChange?: (oldPassword: string, newPassword: string) => Promise<void>;
  onNotificationsUpdate?: (prefs: NotificationPreferences) => Promise<void>;
  onAvatarUpload?: (file: File) => Promise<string>;
  onDeleteAccount?: () => Promise<void>;
  onExportData?: () => Promise<void>;
  onLogout?: () => void;
  className?: string;
}

// Default values
const defaultProfile: UserProfile = {
  id: 'user-1',
  email: 'usuario@empresa.com',
  name: 'Usuário Demo',
  phone: '+55 11 99999-9999',
  company: 'Empresa S.A.',
  jobTitle: 'Técnico de Segurança',
  location: 'São Paulo, SP',
  bio: 'Profissional de segurança do trabalho com foco em treinamentos NR.',
  language: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  createdAt: '2024-01-01T00:00:00Z',
};

const defaultNotifications: NotificationPreferences = {
  emailDigest: true,
  projectUpdates: true,
  marketing: false,
  securityAlerts: true,
  weeklyReport: true,
};

// Tab types
type SettingsTab = 'profile' | 'security' | 'notifications' | 'preferences' | 'billing' | 'danger';

// Tab Component
function SettingsTab({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all',
        active 
          ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500' 
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
      <ChevronRight className={cn('w-4 h-4 ml-auto transition-transform', active && 'rotate-90')} />
    </button>
  );
}

// Form Input Component
function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  icon: Icon,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel' | 'password';
  placeholder?: string;
  icon?: React.ElementType;
  disabled?: boolean;
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        )}
        <input
          type={type === 'password' && showPassword ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full bg-zinc-800 border border-zinc-700 rounded-lg text-white',
            'placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            Icon ? 'pl-10 pr-4 py-2.5' : 'px-4 py-2.5',
            type === 'password' && 'pr-10'
          )}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

// Toggle Switch Component
function ToggleSwitch({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-white font-medium">{label}</p>
        {description && <p className="text-sm text-zinc-400">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={cn(
          'relative w-12 h-6 rounded-full transition-colors',
          enabled ? 'bg-blue-600' : 'bg-zinc-700'
        )}
      >
        <motion.div
          animate={{ x: enabled ? 24 : 2 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );
}

// Profile Tab Content
function ProfileTab({
  profile,
  onUpdate,
  onAvatarUpload,
}: {
  profile: UserProfile;
  onUpdate: (data: Partial<UserProfile>) => void;
  onAvatarUpload?: (file: File) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone || '');
  const [company, setCompany] = useState(profile.company || '');
  const [jobTitle, setJobTitle] = useState(profile.jobTitle || '');
  const [location, setLocation] = useState(profile.location || '');
  const [bio, setBio] = useState(profile.bio || '');

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Informações Pessoais</h3>
        
        {/* Avatar */}
        <div className="flex items-center gap-6 mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">{profile.name[0]?.toUpperCase()}</span>
              )}
            </div>
            <button
              onClick={() => document.getElementById('avatar-upload')?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:bg-blue-500 transition-colors"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && onAvatarUpload?.(e.target.files[0])}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-white font-medium">{profile.name}</p>
            <p className="text-sm text-zinc-400">{profile.email}</p>
            <p className="text-xs text-zinc-500 mt-1">
              Membro desde {new Date(profile.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Nome completo"
            value={name}
            onChange={setName}
            icon={User}
            placeholder="Seu nome"
          />
          <FormInput
            label="Email"
            value={profile.email}
            onChange={() => {}}
            type="email"
            icon={Mail}
            disabled
          />
          <FormInput
            label="Telefone"
            value={phone}
            onChange={setPhone}
            type="tel"
            icon={Phone}
            placeholder="+55 11 99999-9999"
          />
          <FormInput
            label="Empresa"
            value={company}
            onChange={setCompany}
            icon={Building2}
            placeholder="Nome da empresa"
          />
          <FormInput
            label="Cargo"
            value={jobTitle}
            onChange={setJobTitle}
            icon={User}
            placeholder="Seu cargo"
          />
          <FormInput
            label="Localização"
            value={location}
            onChange={setLocation}
            icon={MapPin}
            placeholder="Cidade, Estado"
          />
        </div>

        {/* Bio */}
        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium text-zinc-300">Sobre você</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Uma breve descrição sobre você..."
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white 
                     placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => onUpdate({ name, phone, company, jobTitle, location, bio })}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors"
        >
          <Save className="w-4 h-4" />
          Salvar Alterações
        </button>
      </div>
    </div>
  );
}

// Security Tab Content
function SecurityTab({
  onPasswordChange,
}: {
  onPasswordChange?: (oldPassword: string, newPassword: string) => Promise<void>;
}) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    if (newPassword.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres');
      return;
    }
    setError('');
    setIsChanging(true);
    try {
      await onPasswordChange?.(oldPassword, newPassword);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError('Erro ao alterar senha');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Alterar Senha</h3>
        <div className="space-y-4 max-w-md">
          <FormInput
            label="Senha atual"
            value={oldPassword}
            onChange={setOldPassword}
            type="password"
            icon={Lock}
          />
          <FormInput
            label="Nova senha"
            value={newPassword}
            onChange={setNewPassword}
            type="password"
            icon={Key}
          />
          <FormInput
            label="Confirmar nova senha"
            value={confirmPassword}
            onChange={setConfirmPassword}
            type="password"
            icon={Key}
          />
          {error && (
            <p className="text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </p>
          )}
          <button
            onClick={handlePasswordChange}
            disabled={isChanging || !oldPassword || !newPassword || !confirmPassword}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white 
                     font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChanging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Alterar Senha
          </button>
        </div>
      </div>

      <hr className="border-zinc-800" />

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Autenticação de Dois Fatores</h3>
        <div className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg">
          <div className="p-3 bg-orange-500/20 rounded-lg">
            <Smartphone className="w-6 h-6 text-orange-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-medium">2FA não configurado</p>
            <p className="text-sm text-zinc-400 mt-1">
              Adicione uma camada extra de segurança à sua conta
            </p>
          </div>
          <button className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white text-sm transition-colors">
            Configurar
          </button>
        </div>
      </div>

      <hr className="border-zinc-800" />

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Sessões Ativas</h3>
        <div className="space-y-3">
          {[
            { device: 'Chrome no Windows', location: 'São Paulo, BR', current: true },
            { device: 'Safari no iPhone', location: 'São Paulo, BR', current: false },
          ].map((session, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-zinc-400" />
                <div>
                  <p className="text-white">{session.device}</p>
                  <p className="text-sm text-zinc-400">{session.location}</p>
                </div>
              </div>
              {session.current ? (
                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                  Sessão atual
                </span>
              ) : (
                <button className="text-sm text-red-400 hover:text-red-300">
                  Encerrar
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Notifications Tab Content
function NotificationsTab({
  notifications,
  onUpdate,
}: {
  notifications: NotificationPreferences;
  onUpdate: (prefs: NotificationPreferences) => void;
}) {
  const [prefs, setPrefs] = useState(notifications);

  const handleChange = (key: keyof NotificationPreferences, value: boolean) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    onUpdate(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Preferências de Notificação</h3>
        <div className="space-y-1 divide-y divide-zinc-800">
          <ToggleSwitch
            label="Resumo por email"
            description="Receba um resumo semanal das atividades"
            enabled={prefs.emailDigest}
            onChange={(v) => handleChange('emailDigest', v)}
          />
          <ToggleSwitch
            label="Atualizações de projetos"
            description="Notificações sobre seus projetos e renders"
            enabled={prefs.projectUpdates}
            onChange={(v) => handleChange('projectUpdates', v)}
          />
          <ToggleSwitch
            label="Alertas de segurança"
            description="Notificações importantes sobre sua conta"
            enabled={prefs.securityAlerts}
            onChange={(v) => handleChange('securityAlerts', v)}
          />
          <ToggleSwitch
            label="Relatório semanal"
            description="Estatísticas semanais dos seus conteúdos"
            enabled={prefs.weeklyReport}
            onChange={(v) => handleChange('weeklyReport', v)}
          />
          <ToggleSwitch
            label="Marketing"
            description="Novidades, dicas e ofertas especiais"
            enabled={prefs.marketing}
            onChange={(v) => handleChange('marketing', v)}
          />
        </div>
      </div>
    </div>
  );
}

// Preferences Tab Content
function PreferencesTab() {
  const [language, setLanguage] = useState('pt-BR');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Preferências do Sistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Idioma</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white"
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en-US">English (US)</option>
              <option value="es">Español</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Fuso horário</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-white"
            >
              <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
              <option value="America/New_York">New York (GMT-5)</option>
              <option value="Europe/London">London (GMT+0)</option>
            </select>
          </div>
        </div>
      </div>

      <hr className="border-zinc-800" />

      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Aparência</h3>
        <div className="flex gap-3">
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                'flex-1 p-4 rounded-lg border-2 transition-all',
                theme === t
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-700 hover:border-zinc-600'
              )}
            >
              <Palette className={cn('w-6 h-6 mx-auto mb-2', theme === t ? 'text-blue-400' : 'text-zinc-400')} />
              <p className={cn('text-sm font-medium', theme === t ? 'text-blue-400' : 'text-zinc-400')}>
                {t === 'dark' ? 'Escuro' : t === 'light' ? 'Claro' : 'Sistema'}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Danger Zone Tab Content
function DangerZoneTab({
  onDeleteAccount,
  onExportData,
  onLogout,
}: {
  onDeleteAccount?: () => void;
  onExportData?: () => void;
  onLogout?: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-medium">Zona de Perigo</p>
            <p className="text-sm text-zinc-400 mt-1">
              Ações irreversíveis. Prossiga com cuidado.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
          <div>
            <p className="text-white font-medium">Exportar meus dados</p>
            <p className="text-sm text-zinc-400">Baixe uma cópia de todos os seus dados</p>
          </div>
          <button
            onClick={onExportData}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white text-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg">
          <div>
            <p className="text-white font-medium">Sair de todas as sessões</p>
            <p className="text-sm text-zinc-400">Encerra todas as sessões ativas</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div>
            <p className="text-red-400 font-medium">Excluir minha conta</p>
            <p className="text-sm text-zinc-400">Remove permanentemente sua conta e dados</p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Excluir
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Excluir Conta</h3>
              </div>
              <p className="text-zinc-400 mb-6">
                Esta ação é irreversível. Todos os seus projetos, vídeos e dados serão
                permanentemente excluídos. Tem certeza que deseja continuar?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { onDeleteAccount?.(); setShowDeleteConfirm(false); }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white transition-colors"
                >
                  Excluir Permanentemente
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Main Component
export function ProfileSettings({
  profile = defaultProfile,
  notifications = defaultNotifications,
  onProfileUpdate,
  onPasswordChange,
  onNotificationsUpdate,
  onAvatarUpload,
  onDeleteAccount,
  onExportData,
  onLogout,
  className,
}: ProfileSettingsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  const handleProfileUpdate = useCallback(async (data: Partial<UserProfile>) => {
    await onProfileUpdate?.(data);
  }, [onProfileUpdate]);

  const tabs: { id: SettingsTab; icon: React.ElementType; label: string }[] = [
    { id: 'profile', icon: User, label: 'Perfil' },
    { id: 'security', icon: Shield, label: 'Segurança' },
    { id: 'notifications', icon: Bell, label: 'Notificações' },
    { id: 'preferences', icon: Palette, label: 'Preferências' },
    { id: 'danger', icon: AlertTriangle, label: 'Zona de Perigo' },
  ];

  return (
    <div className={cn('flex flex-col md:flex-row gap-6 bg-zinc-900 rounded-xl p-6', className)}>
      {/* Sidebar */}
      <div className="w-full md:w-64 flex-shrink-0">
        <h2 className="text-xl font-bold text-white mb-4">Configurações</h2>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <SettingsTab
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'profile' && (
              <ProfileTab
                profile={profile}
                onUpdate={handleProfileUpdate}
                onAvatarUpload={onAvatarUpload}
              />
            )}
            {activeTab === 'security' && (
              <SecurityTab onPasswordChange={onPasswordChange} />
            )}
            {activeTab === 'notifications' && (
              <NotificationsTab
                notifications={notifications}
                onUpdate={(prefs) => onNotificationsUpdate?.(prefs)}
              />
            )}
            {activeTab === 'preferences' && <PreferencesTab />}
            {activeTab === 'danger' && (
              <DangerZoneTab
                onDeleteAccount={onDeleteAccount}
                onExportData={onExportData}
                onLogout={onLogout}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ProfileSettings;
