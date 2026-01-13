# Production Environment Variables Template

Use this template to configure your production variables in Vercel or your deployment platform.

## 🚨 Critical Security Notes
- **NEVER** commit this file with real values.
- **NEVER** share `SUPABASE_SERVICE_ROLE_KEY` or `NEXTAUTH_SECRET`.
- `NEXT_PUBLIC_` variables will be exposed to the browser.

---

## 1. Supabase Configuration
*Source: Supabase Dashboard > Settings > API*

```bash
# Project URL
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co

# Anon / Public Key (Safe for browser)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Service Role Key (SERVER ONLY - SECRET)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 2. Database Connection
*Source: Supabase Dashboard > Settings > Database > Connection Pooler*
*Note: Use port 6543 for Transaction Mode pooling*

```bash
DATABASE_URL=postgresql://postgres.[PROJECT_ID]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

## 3. Redis (Queue & Cache)
*Source: Upstash or your Redis provider*

```bash
REDIS_URL=redis://default:[PASSWORD]@[HOST]:[PORT]
```

## 4. Authentication (NextAuth.js)

```bash
# Production URL of your application
NEXTAUTH_URL=https://[YOUR_DOMAIN].vercel.app

# Secure random string (Generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=[GENERATED_SECRET]
```

## 5. Environment

```bash
NODE_ENV=production
```

## 6. Optional Integrations (Recommended)

```bash
# ElevenLabs (Text-to-Speech)
ELEVENLABS_API_KEY=sk_...

# HeyGen (AI Avatars)
HEYGEN_API_KEY=...

# Sentry (Monitoring)
SENTRY_DSN=...
```
