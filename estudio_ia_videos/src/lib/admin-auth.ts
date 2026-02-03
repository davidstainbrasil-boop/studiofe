
import crypto from 'crypto';

// Configuração do admin (em produção, usar banco de dados)
export const ADMIN_CONFIG = {
  email: process.env.ADMIN_EMAIL || 'admin@cursostecno.com',
  // Hash da senha padrão "Admin@123" - em produção, usar bcrypt
  passwordHash: process.env.ADMIN_PASSWORD_HASH || hashPassword(process.env.ADMIN_PASSWORD || 'Admin@123'),
  name: process.env.ADMIN_NAME || 'Administrador'
};

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'mvp-salt-2024').digest('hex');
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Armazenamento de sessões em memória (em produção, usar Redis)
const sessions = new Map<string, { email: string; name: string; expiresAt: number }>();

export const sessionStore = sessions;

export function verifySession(token: string): { email: string; name: string } | null {
  const session = sessions.get(token);
  
  if (!session) {
    return null;
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return null;
  }

  return { email: session.email, name: session.name };
}

// Limpar sessões expiradas periodicamente
// Note: Side effects in lib files are generally okay or at least better than in route files
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessions.entries()) {
      if (now > session.expiresAt) {
        sessions.delete(token);
      }
    }
  }, 60 * 60 * 1000); // A cada hora
}
