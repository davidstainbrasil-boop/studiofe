import { test, expect, type Page } from '@playwright/test';
import crypto from 'crypto';

/**
 * E2E - Navigation Regression Suite
 *
 * Foco: 404, redirects, refresh e regressão de navegação.
 * - Evita testes frágeis baseados em `dev_bypass` (removido do middleware).
 * - Quando Supabase não está configurado (modo anônimo), pula testes que exigem autenticação real.
 */

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Login real depende de seed/configuração do Supabase (ex.: `database-seed-test-users.sql`).
// Para evitar flakiness em ambientes locais sem seed, mantenha opt-in.
const AUTH_E2E_ENABLED = process.env.E2E_AUTH_ENABLED === 'true';

const E2E_USER = {
  // Seed documentado em `database-seed-test-users.sql`
  email: process.env.E2E_EMAIL || 'admin@mvpvideo.test',
  password: process.env.E2E_PASSWORD || 'senha123',
};

async function checkNextStaticAssetsAreHealthy(page: Page): Promise<{
  ok: boolean;
  failing: Array<{ url: string; status: number }>;
}> {
  // Em dev, os chunks podem retornar 404 momentaneamente enquanto o Next compila.
  // Fazemos retries curtos antes de considerar falha.
  const maxAttempts = 6;
  const delayMs = 1500;

  let lastFailing: Array<{ url: string; status: number }> = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const failing: Array<{ url: string; status: number }> = [];

    const res = await page.request.get('/login');
    const html = await res.text();

    const scriptSrcs = Array.from(html.matchAll(/<script[^>]+src="([^"]+)"/g))
      .map((m) => m[1])
      .filter((src) => src.startsWith('/_next/static/chunks/'))
      .slice(0, 8);

    if (scriptSrcs.length === 0) {
      failing.push({ url: '/_next/static/chunks/* (none found)', status: res.status() });
    } else {
      for (const src of scriptSrcs) {
        const r = await page.request.get(src);
        const status = r.status();
        if (status >= 400) failing.push({ url: src, status });
      }
    }

    if (failing.length === 0) {
      return { ok: true, failing: [] };
    }

    lastFailing = failing;

    // Se ainda estamos compilando, aguarda e tenta de novo.
    await new Promise((r) => setTimeout(r, delayMs));
  }

  return { ok: false, failing: lastFailing };
}

async function assertNotOn404(page: Page) {
  // Não assumir que a página tem <h1>. O marcador mais confiável é o texto do not-found custom.
  await expect(page.locator('text=404 - Página não encontrada')).not.toBeVisible({ timeout: 5000 });
}

async function assertAnyDashboardMarkerVisible(page: Page) {
  // Dashboard varia por build/estado; usamos marcadores alternativos.
  const dashboardMarker = page
    .locator('text=Dashboard')
    .or(page.locator('text=Bem-vindo ao seu Estúdio'))
    .or(page.locator('h1:has-text("Estúdio IA de Vídeos")'));

  await expect(dashboardMarker.first()).toBeVisible({ timeout: 20000 });
}

async function loginViaUI(page: Page) {
  const assets = await checkNextStaticAssetsAreHealthy(page);
  if (!assets.ok) {
    throw new Error(
      `Não é possível autenticar via UI: chunks do Next falharam (client não hidrata).\n` +
        assets.failing.map((f) => `- ${f.status} ${f.url}`).join('\n'),
    );
  }

  await page.goto('/login');

  // A página de login usa Suspense + client component, então os inputs podem demorar para aparecer.
  const emailInput = page.locator('input#email, input[type="email"], input[name="email"]');
  const passwordInput = page.locator('input#password, input[type="password"], input[name="password"]');
  const submitButton = page.locator('button[type="submit"], button:has-text("Entrar")');

  await expect(emailInput).toBeVisible({ timeout: 20000 });
  await expect(passwordInput).toBeVisible({ timeout: 20000 });
  await expect(submitButton.first()).toBeVisible({ timeout: 20000 });

  await emailInput.fill(E2E_USER.email);
  await passwordInput.fill(E2E_USER.password);
  await submitButton.first().click();

  // Nem sempre há redirect automático imediato para /dashboard, então navegamos explicitamente.
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });
  await assertAnyDashboardMarkerVisible(page);
}

function attach404Collector(page: Page) {
  const notFoundUrls: string[] = [];

  page.on('response', (response) => {
    const url = response.url();
    const status = response.status();

    // Só nos importamos com GETs do próprio app.
    // Evitar falsos positivos em assets/next internals.
    if (status !== 404) return;
    if (url.includes('/_next/')) return;
    if (url.match(/\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?|ttf|eot)$/i)) return;
    if (url.includes('__intentional_missing__')) return;

    notFoundUrls.push(url);
  });

  return {
    assertNo404s: async () => {
      expect(
        notFoundUrls,
        `Encontradas respostas 404 durante a navegação:\n${notFoundUrls.map((u) => `- ${u}`).join('\n')}`,
      ).toEqual([]);
    },
  };
}

test.describe('Navigation Regression (404 / redirects / refresh)', () => {
  test.beforeAll(async ({ request }) => {
    // Warm-up de rotas críticas para evitar 404/500 transitórios durante compilação do Next dev.
    await request.get('/login').catch(() => null);
    await request.get('/').catch(() => null);
    await request.get(`/__intentional_missing__/${crypto.randomUUID()}`).catch(() => null);
  });

  test('should serve Next.js static chunks for public pages (asset delivery health)', async ({ page }) => {
    const result = await checkNextStaticAssetsAreHealthy(page);
    expect(
      result.ok,
      `Falha ao servir chunks do Next em /_next/static.\n` +
        result.failing.map((f) => `- ${f.status} ${f.url}`).join('\n'),
    ).toBe(true);
  });

  test('should render custom 404 page for unknown routes', async ({ page }) => {
    const missing = `/__intentional_missing__/${crypto.randomUUID()}`;
    const response = await page.goto(missing, { waitUntil: 'domcontentloaded' });

    // Next.js App Router costuma devolver 404 real aqui.
    if (response) {
      expect(response.status(), 'Unknown route should respond 404').toBe(404);
    }

    await expect(page.locator('text=404 - Página não encontrada')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Desculpe, não conseguimos encontrar a página')).toBeVisible({
      timeout: 15000,
    });
  });

  test('should not serve 404 for critical public routes', async ({ page }) => {
    const { assertNo404s } = attach404Collector(page);

    const publicRoutes = ['/', '/login', '/signup', '/privacy', '/terms', '/help'];

    for (const route of publicRoutes) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), `Route ${route} should respond < 400`).toBeLessThan(400);
      await assertNotOn404(page);
    }

    await assertNo404s();
  });

  test('should redirect to login when accessing protected routes without session (when Supabase configured)', async ({
    page,
  }) => {
    test.skip(!SUPABASE_CONFIGURED, 'Supabase não configurado: middleware opera em modo anônimo.');

    await page.context().clearCookies();
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Middleware deve preservar destino em query param.
    await expect(page).toHaveURL(/\/login(\?.*redirect=\/dashboard)?/);
  });

  test('should keep session after refresh on a protected route (when Supabase configured)', async ({ page }) => {
    test.skip(!SUPABASE_CONFIGURED, 'Supabase não configurado: não há sessão real para persistir.');
    test.skip(!AUTH_E2E_ENABLED, 'E2E auth desabilitado (defina E2E_AUTH_ENABLED=true para rodar).');

    const { assertNo404s } = attach404Collector(page);

    const assets = await checkNextStaticAssetsAreHealthy(page);
    test.skip(!assets.ok, 'Chunks do Next não estão sendo servidos; UI não hidrata para login.');

    await loginViaUI(page);
    await page.goto('/dashboard/projects', { waitUntil: 'domcontentloaded' });
    await assertNotOn404(page);

    // Refresh
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/dashboard\/projects/);
    await assertNotOn404(page);

    await assertNo404s();
  });

  test('should open key authenticated pages without 404 (when Supabase configured)', async ({ page }) => {
    test.skip(!SUPABASE_CONFIGURED, 'Supabase não configurado: não valida navegação autenticada.');
    test.skip(!AUTH_E2E_ENABLED, 'E2E auth desabilitado (defina E2E_AUTH_ENABLED=true para rodar).');

    const { assertNo404s } = attach404Collector(page);

    const assets = await checkNextStaticAssetsAreHealthy(page);
    test.skip(!assets.ok, 'Chunks do Next não estão sendo servidos; UI não hidrata para login.');

    await loginViaUI(page);

    const authenticatedRoutes = [
      '/dashboard',
      '/dashboard/projects',
      '/editor',
      '/projects',
      '/create',
      '/studio',
      '/settings',
    ];

    for (const route of authenticatedRoutes) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      // Pode haver redirects internos, mas não deve virar 404.
      expect(response?.status(), `Route ${route} should not be 404`).not.toBe(404);
      await assertNotOn404(page);
    }

    await assertNo404s();
  });
});

