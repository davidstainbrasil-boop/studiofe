import jwt from 'jsonwebtoken';
import { logger } from '@lib/logger';

export interface DecodedToken {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  email: string;
  phone: string;
  app_metadata: {
    provider: string;
    providers: string[];
  };
  user_metadata: {
    avatar_url?: string;
    email?: string;
    email_verified?: boolean;
    full_name?: string;
    iss?: string;
    name?: string;
    picture?: string;
    provider_id?: string;
    sub?: string;
  };
  role: string;
  aal: string;
  amr: {
    method: string;
    timestamp: number;
  }[];
  session_id: string;
}

export const verifyJWT = async (token: string): Promise<DecodedToken | null> => {
  if (!process.env.SUPABASE_JWT_SECRET) {
    logger.error('SUPABASE_JWT_SECRET not set', new Error('Environment variable missing'), { component: 'Auth' });
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET) as DecodedToken;
    return decoded;
  } catch (error) {
    logger.warn('Invalid JWT', { component: 'Auth', error: (error as Error).message });
    return null;
  }
};
