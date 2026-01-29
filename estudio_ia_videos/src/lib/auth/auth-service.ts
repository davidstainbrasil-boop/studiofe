/**
 * Auth Service
 * Serviço de autenticação e autorização (IMPLEMENTAÇÃO REAL)
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@lib/auth';
import { prisma } from '@lib/prisma';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@lib/logger';
import { getRequiredEnv } from '@lib/env';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  organizationId?: string;
  currentOrgId?: string;
  isAdmin?: boolean;
  role?: string;
  avatar?: string;
  permissions?: string[];
  preferences?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt?: Date | string;
  lastLoginAt?: Date | string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser & { avatar?: string; permissions?: string[]; preferences?: Record<string, unknown> };
}

export class AuthService {
  private getSupabaseClient() {
    const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'); // Use service role for admin actions if needed, or anon for client simulation
    // Para operações de backend (refresh token, logout admin), melhor usar service role.
    
    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    return session.user as AuthUser;
  }
  
  async getUserFromToken(token: string): Promise<AuthUser | null> {
    try {
      // Verifica token com Supabase Auth
      const supabase = this.getSupabaseClient();
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        logger.warn('Token verification failed', { error: error?.message, component: 'AuthService' });
        return null;
      }

      // Busca dados extras no banco local se necessário
      const dbUser = await prisma.users.findUnique({ where: { id: user.id } });

      return {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.full_name || dbUser?.name || user.email?.split('@')[0],
        role: dbUser?.role || 'user',
        avatar: user.user_metadata?.avatar_url,
        isAdmin: dbUser?.role === 'admin'
      };

    } catch (error) {
      logger.error('Error getting user from token:', error instanceof Error ? error : new Error(String(error)), { component: 'AuthService' });
      return null;
    }
  }
  
  async login(email: string, password: string, request: Request): Promise<AuthTokens> {
    const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'); // Login usa chave anonima pública

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session || !data.user) {
      throw new Error(error?.message || 'Login failed');
    }

    const user: AuthUser & { avatar?: string; permissions?: string[]; preferences?: Record<string, unknown> } = {
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata?.full_name || data.user.email?.split('@')[0],
      role: data.user.user_metadata?.role || 'user',
      avatar: data.user.user_metadata?.avatar_url,
      permissions: [],
      preferences: {}
    };

    // Enrich with DB data
    try {
       const dbUser = await prisma.users.findUnique({ where: { id: data.user.id } });
       if (dbUser) {
           user.role = dbUser.role || user.role;
           user.isAdmin = dbUser.role === 'admin';
       }
    } catch (e) {
        logger.warn("Could not fetch user details from DB during login", { component: 'AuthService' });
    }
    
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: (data.session.expires_at || (Date.now() / 1000) + 3600) * 1000,
      user
    };
  }
  
  async logout(userId: string): Promise<void> {
    try {
        const supabase = this.getSupabaseClient();
        // Supabase Admin signOut requires session or token. 
        // Force logout by invalidating sessions for user (if supported by plan/API)
        // Or just rely on client side cleanup.
        // Server-side forced logout is tricky without saving session ID.
        // We can just log it for now as "User requested logout"
        logger.info('User logged out', { userId, component: 'AuthService' });
        
        // Se tivéssemos armazenando refresh tokens no banco, deletaríamos aqui.
    } catch (error) {
        logger.error('Error during logout', error as Error, { component: 'AuthService' });
    }
  }
  
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
    const supabaseKey = getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session || !data.user) {
        throw new Error('Failed to refresh token: ' + (error?.message || 'Unknown error'));
    }

    // Busca usuário atualizado
    const dbUser = await prisma.users.findUnique({ where: { id: data.user.id } });

    const user: AuthUser & { avatar?: string; permissions?: string[]; preferences?: Record<string, unknown> } = {
        id: data.user.id,
        email: data.user.email!,
        name: data.user.user_metadata?.full_name || dbUser?.name || 'User',
        role: dbUser?.role || 'user',
        isAdmin: dbUser?.role === 'admin',
        avatar: data.user.user_metadata?.avatar_url,
        permissions: [],
        preferences: {}
    };
    
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: (data.session.expires_at || (Date.now() / 1000) + 3600) * 1000,
      user
    };
  }
  
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    // Implementação real exigiria que o usuário estivesse logado (ter o token) para trocar a senha via Client SDK
    // Ou usar Service Role se for admin resetando.
    // Aqui, assumimos que esta função é chamada em contexto onde temos acesso ao cliente autenticado ou vamos usar service role admin.
    // Mas Supabase Admin API updateUserById não checa senha antiga, apenas sobrescreve.
    // Para checar senha antiga, teríamos que tentar login com ela primeiro.
    
    try {
        if (newPassword.length < 8) return false;

        const supabase = this.getSupabaseClient();
        
        // 1. Verificar senha antiga (opcional, mas recomendado)
        // Precisamos do email do usuário para isso.
        const user = await prisma.users.findUnique({ where: { id: userId }, select: { email: true } });
        if (!user || !user.email) return false;

        // Tentar login com senha antiga para validar
        // Isso requer chave anonima
        const supabaseAuth = createClient(
            getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
            getRequiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        );
        const { error: loginError } = await supabaseAuth.auth.signInWithPassword({
            email: user.email,
            password: oldPassword
        });

        if (loginError) {
            logger.warn('Password change failed: invalid old password', { userId, component: 'AuthService' });
            return false;
        }

        // 2. Atualizar senha
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            userId,
            { password: newPassword }
        );

        if (updateError) {
            throw updateError;
        }

        return true;
    } catch (error) {
      logger.error('Error changing password:', error instanceof Error ? error : new Error(String(error)), { component: 'AuthService' });
      return false;
    }
  }
  
  async verifyPermission(userId: string, resource: string, action: string): Promise<boolean> {
    try {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user) return false;

      // Admin has all permissions
      if (user.role === 'admin') return true;

      // Mapeamento básico de permissões (expandir conforme necessidade)
      // Exemplo: Editors podem editar projetos, Viewers apenas visualizar
      if (resource === 'project') {
          if (action === 'read') return true; // Todos leem (sujeito a RLS do projeto)
          if (action === 'create') return user.role !== 'viewer';
          if (action === 'update' || action === 'delete') return user.role === 'editor' || user.role === 'manager';
      }
      
      return false;
    } catch (error) {
      logger.error('Error verifying permission:', error instanceof Error ? error : new Error(String(error)), { component: 'AuthService' });
      return false;
    }
  }
  
  async isAdmin(userId: string): Promise<boolean> {
    try {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      return user?.role === 'admin';
    } catch (error) {
      return false;
    }
  }
}

export const authService = new AuthService();
