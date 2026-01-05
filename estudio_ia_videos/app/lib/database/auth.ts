/**
 * Serviço de Autenticação Local
 * MVP Video TécnicoCursos v7
 * 
 * Sistema de autenticação completo usando JWT e PostgreSQL local.
 */

import { query, queryOne, insert, update } from './index';
import * as bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';

// ============================================
// TIPOS
// ============================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'manager' | 'editor' | 'viewer' | 'user';
  is_active: boolean;
  is_verified: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
  metadata: Record<string, any>;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: Date;
  created_at: Date;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

// ============================================
// CONFIGURAÇÃO JWT
// ============================================

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'mvp_video_tecnico_cursos_jwt_secret_2025'
);
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([dhms])$/);
  if (!match) return 7 * 24 * 60 * 60; // 7 days default
  
  const [, value, unit] = match;
  const num = parseInt(value, 10);
  
  switch (unit) {
    case 'd': return num * 24 * 60 * 60;
    case 'h': return num * 60 * 60;
    case 'm': return num * 60;
    case 's': return num;
    default: return 7 * 24 * 60 * 60;
  }
}

// ============================================
// FUNÇÕES DE HASH DE SENHA
// ============================================

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================
// FUNÇÕES JWT
// ============================================

export async function generateToken(user: User): Promise<string> {
  const expiresInSeconds = parseExpiresIn(JWT_EXPIRES_IN);
  
  const token = await new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(JWT_SECRET);
  
  return token;
}

export async function verifyToken(token: string): Promise<{
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { valid: true, payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Token verification failed';
    return { valid: false, error: message };
  }
}

// ============================================
// FUNÇÕES DE AUTENTICAÇÃO
// ============================================

/**
 * Registra um novo usuário
 */
export async function register(
  email: string,
  password: string,
  name?: string
): Promise<AuthResult> {
  try {
    // Verificar se email já existe
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) {
      return { success: false, error: 'Email já cadastrado' };
    }
    
    // Validar senha
    if (password.length < 8) {
      return { success: false, error: 'Senha deve ter no mínimo 8 caracteres' };
    }
    
    // Hash da senha
    const passwordHash = await hashPassword(password);
    
    // Criar usuário
    const user = await insert<User>('users', {
      email,
      password_hash: passwordHash,
      name: name || null,
      role: 'user',
      is_active: true,
      is_verified: false,
      verification_token: generateRandomToken(),
    });
    
    // Gerar token
    const token = await generateToken(user);
    
    // Remover password_hash do retorno
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...safeUser } = user;
    
    return { success: true, user: safeUser, token };
  } catch (error) {
    console.error('[Auth] Erro no registro:', error instanceof Error ? error.message : error);
    return { success: false, error: 'Erro ao criar conta' };
  }
}

/**
 * Login de usuário
 */
export async function login(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthResult> {
  try {
    // Buscar usuário
    const user = await queryOne<User & { password_hash: string }>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (!user) {
      return { success: false, error: 'Credenciais inválidas' };
    }
    
    // Verificar se conta está ativa
    if (!user.is_active) {
      return { success: false, error: 'Conta desativada' };
    }
    
    // Verificar senha
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return { success: false, error: 'Credenciais inválidas' };
    }
    
    // Gerar token
    const token = await generateToken(user);
    
    // Criar sessão
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + parseExpiresIn(JWT_EXPIRES_IN));
    
    await insert('sessions', {
      user_id: user.id,
      token,
      ip_address: ipAddress || null,
      user_agent: userAgent || null,
      expires_at: expiresAt,
    });
    
    // Atualizar último login
    await query(
      'UPDATE users SET last_login = NOW(), login_count = login_count + 1 WHERE id = $1',
      [user.id]
    );
    
    // Remover password_hash do retorno
    const { password_hash, ...safeUser } = user;
    
    return { success: true, user: safeUser, token };
  } catch (error) {
    console.error('[Auth] Erro no login:', error instanceof Error ? error.message : error);
    return { success: false, error: 'Erro ao fazer login' };
  }
}

/**
 * Logout de usuário
 */
export async function logout(token: string): Promise<boolean> {
  try {
    await query('DELETE FROM sessions WHERE token = $1', [token]);
    return true;
  } catch (error) {
    console.error('[Auth] Erro no logout:', error);
    return false;
  }
}

/**
 * Obtém usuário pelo token
 */
export async function getUserFromToken(token: string): Promise<User | null> {
  try {
    const { valid, payload } = await verifyToken(token);
    if (!valid || !payload?.sub) {
      return null;
    }
    
    // Verificar sessão
    const session = await queryOne<Session>(
      'SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (!session) {
      return null;
    }
    
    // Buscar usuário
    const user = await queryOne<User>(
      'SELECT id, email, name, avatar_url, role, is_active, is_verified, last_login, created_at, updated_at, metadata FROM users WHERE id = $1 AND is_active = true',
      [payload.sub]
    );
    
    return user;
  } catch (error) {
    console.error('[Auth] Erro ao obter usuário:', error);
    return null;
  }
}

/**
 * Obtém usuário por ID
 */
export async function getUserById(id: string): Promise<User | null> {
  return queryOne<User>(
    'SELECT id, email, name, avatar_url, role, is_active, is_verified, last_login, created_at, updated_at, metadata FROM users WHERE id = $1',
    [id]
  );
}

/**
 * Atualiza perfil do usuário
 */
export async function updateProfile(
  userId: string,
  data: Partial<Pick<User, 'name' | 'avatar_url' | 'metadata'>>
): Promise<User | null> {
  try {
    const updates: string[] = [];
    const values: (string | Record<string, unknown>)[] = [];
    let paramIndex = 1;
    
    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    
    if (data.avatar_url !== undefined) {
      updates.push(`avatar_url = $${paramIndex++}`);
      values.push(data.avatar_url);
    }
    
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(data.metadata));
    }
    
    if (updates.length === 0) {
      return getUserById(userId);
    }
    
    updates.push('updated_at = NOW()');
    values.push(userId);
    
    const result = await queryOne<User>(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, name, avatar_url, role, is_active, is_verified, last_login, created_at, updated_at, metadata`,
      values
    );
    
    return result;
  } catch (error) {
    console.error('[Auth] Erro ao atualizar perfil:', error);
    return null;
  }
}

/**
 * Altera senha do usuário
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Buscar usuário com hash da senha
    const user = await queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    
    if (!user) {
      return { success: false, error: 'Usuário não encontrado' };
    }
    
    // Verificar senha atual
    const validPassword = await verifyPassword(currentPassword, user.password_hash);
    if (!validPassword) {
      return { success: false, error: 'Senha atual incorreta' };
    }
    
    // Validar nova senha
    if (newPassword.length < 8) {
      return { success: false, error: 'Nova senha deve ter no mínimo 8 caracteres' };
    }
    
    // Atualizar senha
    const newHash = await hashPassword(newPassword);
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, userId]
    );
    
    // Invalidar todas as sessões
    await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    
    return { success: true };
  } catch (error) {
    console.error('[Auth] Erro ao alterar senha:', error);
    return { success: false, error: 'Erro ao alterar senha' };
  }
}

/**
 * Solicita reset de senha
 */
export async function requestPasswordReset(email: string): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  try {
    const user = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (!user) {
      // Não revelar se email existe
      return { success: true };
    }
    
    const resetToken = generateRandomToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hora para expirar
    
    await query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [resetToken, expires, user.id]
    );
    
    return { success: true, token: resetToken };
  } catch (error) {
    console.error('[Auth] Erro ao solicitar reset:', error);
    return { success: false, error: 'Erro ao processar solicitação' };
  }
}

/**
 * Reseta senha com token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await queryOne<{ id: string }>(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    
    if (!user) {
      return { success: false, error: 'Token inválido ou expirado' };
    }
    
    if (newPassword.length < 8) {
      return { success: false, error: 'Senha deve ter no mínimo 8 caracteres' };
    }
    
    const newHash = await hashPassword(newPassword);
    
    await query(
      'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE id = $2',
      [newHash, user.id]
    );
    
    // Invalidar todas as sessões
    await query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    
    return { success: true };
  } catch (error) {
    console.error('[Auth] Erro ao resetar senha:', error);
    return { success: false, error: 'Erro ao resetar senha' };
  }
}

/**
 * Limpa sessões expiradas
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await query('DELETE FROM sessions WHERE expires_at < NOW()');
  return result.rowCount || 0;
}

// ============================================
// HELPERS
// ============================================

function generateRandomToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  register,
  login,
  logout,
  getUserFromToken,
  getUserById,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPassword,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  cleanupExpiredSessions,
};

