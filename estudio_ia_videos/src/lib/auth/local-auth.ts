/**
 * Local Authentication Service
 * Sistema de autenticação local usando JWT
 * Não depende de serviços externos como Supabase
 */

import { sign, verify } from 'jsonwebtoken';
import { hash, compare } from 'bcryptjs';
import { prisma } from '@lib/prisma';
import { cookies } from 'next/headers';
import { sessionService } from '@lib/database/services';
import { UserRole } from '@prisma/client';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret && secret.trim().length > 0) return secret;
  // In production, refuse to run with an implicit secret.
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET é obrigatório em produção');
  }
  // Dev-only fallback (explicitly insecure). Avoid using this outside local dev.
  return 'dev-only-insecure-jwt-secret';
}

const JWT_EXPIRES_IN = '7d';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole | string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Registrar novo usuário
 */
export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: UserRole = UserRole.user
): Promise<AuthResult> {
  try {
    // Verificar se email já existe
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: 'Email já cadastrado' };
    }

    // Hash da senha
    const passwordHash = await hash(password, 12);

    // Criar usuário com todos os campos
    const user = await prisma.users.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        isActive: true,
        isVerified: false, // Requer verificação de email
        loginCount: 0,
      },
    });

    // Criar sessão
    const session = await sessionService.createSession({
      userId: user.id,
    });

    // Gerar token JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role || UserRole.user,
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || '',
        role: user.role || UserRole.user,
        isActive: user.isActive,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      token,
    };
  } catch (error) {
    console.error('[Auth] Erro no registro:', error);
    return { success: false, error: 'Erro ao criar conta' };
  }
}

/**
 * Login de usuário
 */
export async function loginUser(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthResult> {
  try {
    // Buscar usuário com passwordHash
    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user || !user.passwordHash) {
      return { success: false, error: 'Credenciais inválidas' };
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      return { success: false, error: 'Conta desativada' };
    }

    // Verificar senha
    const isValidPassword = await compare(password, user.passwordHash);
    if (!isValidPassword) {
      return { success: false, error: 'Credenciais inválidas' };
    }

    // Atualizar último login e contador
    await prisma.users.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        loginCount: {
          increment: 1,
        },
      },
    });

    // Criar sessão
    const session = await sessionService.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
    });

    // Gerar token JWT
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role || UserRole.user,
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || '',
        role: user.role || UserRole.user,
        isActive: user.isActive,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      token,
    };
  } catch (error) {
    console.error('[Auth] Erro no login:', error);
    return { success: false, error: 'Erro ao fazer login' };
  }
}

/**
 * Verificar token JWT
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = verify(token, getJwtSecret()) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Gerar token JWT
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Obter usuário do token
 */
export async function getUserFromToken(token: string): Promise<User | null> {
  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    const user = await prisma.users.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role || UserRole.user,
      isActive: user.isActive,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  } catch {
    return null;
  }
}

/**
 * Obter usuário da sessão (cookies)
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return null;
    
    return getUserFromToken(token);
  } catch {
    return null;
  }
}

/**
 * Criar usuários padrão se não existirem
 */
export async function ensureDefaultUsers(): Promise<void> {
  // Never seed default users implicitly in production.
  if (process.env.NODE_ENV === 'production') return;
  if (process.env.SEED_DEFAULT_USERS !== 'true') return;

  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  const demoEmail = process.env.DEFAULT_DEMO_EMAIL;
  const demoPassword = process.env.DEFAULT_DEMO_PASSWORD;

  if (!adminEmail || !adminPassword || !demoEmail || !demoPassword) {
    console.error('[Auth] SEED_DEFAULT_USERS=true, mas faltam DEFAULT_* envs (email/senha). Abortando seed.');
    return;
  }

  try {
    // Admin
    const adminExists = await prisma.users.findUnique({
      where: { email: adminEmail },
    });

    if (!adminExists) {
      const passwordHash = await hash(adminPassword, 12);
      await prisma.users.create({
        data: {
          email: adminEmail,
          passwordHash,
          name: 'Administrador',
          role: UserRole.admin,
          isActive: true,
          isVerified: true,
          loginCount: 0,
        },
      });
      console.log('[Auth] Usuário admin criado');
    }

    // Demo
    const demoExists = await prisma.users.findUnique({
      where: { email: demoEmail },
    });

    if (!demoExists) {
      const passwordHash = await hash(demoPassword, 12);
      await prisma.users.create({
        data: {
          email: demoEmail,
          passwordHash,
          name: 'Usuário Demo',
          role: UserRole.user,
          isActive: true,
          isVerified: true,
          loginCount: 0,
        },
      });
      console.log('[Auth] Usuário demo criado');
    }
  } catch (error) {
    console.error('[Auth] Erro ao criar usuários padrão:', error);
  }
}

// Exportar serviço
export const LocalAuth = {
  register: registerUser,
  login: loginUser,
  verify: verifyToken,
  getUser: getUserFromToken,
  getCurrentUser,
  ensureDefaultUsers,
};

export default LocalAuth;

