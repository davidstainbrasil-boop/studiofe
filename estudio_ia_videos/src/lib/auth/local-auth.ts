/**
 * Local Authentication Service
 * Sistema de autenticação local usando JWT
 * ADAPTADO: Métodos de login/registro local desativados em favor do Supabase Auth
 */

import { sign, verify } from 'jsonwebtoken';
// import { hash, compare } from 'bcryptjs'; // Removido pois auth é via Supabase
import { prisma } from '@lib/prisma';
import { cookies } from 'next/headers';
import { sessionService } from '@lib/database/services';
// import { UserRole } from '@prisma/client'; // Enum não existe

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
  role: string;
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
 * @deprecated Use Supabase Auth signUp
 */
export async function registerUser(
  email: string,
  password: string,
  name: string,
  role: string = 'user'
): Promise<AuthResult> {
  return { success: false, error: 'Registro local desativado. Use Supabase Auth.' };
}

/**
 * Login de usuário
 * @deprecated Use Supabase Auth signInWithPassword
 */
export async function loginUser(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthResult> {
  return { success: false, error: 'Login local desativado. Use Supabase Auth.' };
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
        // isActive: true, // Não existe no schema
        // isVerified: true, // Não existe no schema
        createdAt: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role || 'user',
      isActive: true, // Mocked for interface compat
      isVerified: true, // Mocked for interface compat
      createdAt: user.createdAt || new Date(),
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
    // Implementação desativada pois requer criação no Supabase Auth
    // console.log('[Auth] ensureDefaultUsers skipped (use Supabase seeding)');
    return;
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
