import { test, expect } from '@playwright/test';
import { loginWithCookie, mockSupabaseAuth } from './helpers';

test.beforeEach(async ({ page }) => {
  // Debug Listeners
  page.on('console', msg => console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.error(`[BROWSER ERROR] ${err.message}`));
  page.on('requestfailed', req => console.error(`[FAILED REQ] ${req.url()}: ${req.failure()?.errorText}`));

  // Real Login
  // Note: Ensure admin@mvpvideo.test / senha123 exists in Supabase or modify helpers.ts
  await page.goto('/login');
  await page.fill('input[name="email"]', 'admin@mvpvideo.test');
  await page.fill('input[name="password"]', 'senha123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  
  // Mock Route for Tour (prevent popup)
  await page.route('**/api/user/tour', route => route.fulfill({ status: 200, body: JSON.stringify({ seen: true }) }));
  
  // Must navigate to a page before accessing localStorage
  await page.goto('/');

  await page.evaluate(() => {
    localStorage.setItem('hasSeenTour', 'true');
  });
  
  // Mock API Render to avoid waiting for real render and to ensure stability
  await page.route('/api/render', async (route) => {
    const method = route.request().method();
    
    if (method === 'POST') {
      // Start Render
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, jobId: 'mock-job-123' })
      });
    } else if (method === 'GET') {
      // Poll Status
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true, 
          status: 'completed', 
          progress: 100, 
          videoUrl: 'http://example.com/mock-video.mp4' 
        })
      });
    } else {
      await route.continue();
    }
  });

  // Mock AI Script Generation
  await page.route('/api/ai/generate-script', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ 
        success: true, 
        data: { scriptContent: "Este é um roteiro gerado automaticamente para testes. Olá mundo!" } 
      })
    });
  });

  // Mock Supabase Projects (REST API used by Client Hook)
  await page.route('**/rest/v1/projects*', async (route) => {
    const method = route.request().method();
    const url = route.request().url();

    if (method === 'GET') {
       // List projects (for Dashboard) or Single Project (if ID in URL)
       if (url.includes('count=exact')) {
          // Count query
          await route.fulfill({ status: 200, body: JSON.stringify([]), headers: { 'content-range': '0-0/0' } });
       } else if (url.includes('id=eq.')) {
           // Single project fetch by ID
           await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{ 
                id: 'mock-project-123', 
                name: 'Novo Projeto', 
                status: 'draft',
                metadata: {},
                user_id: 'test-user-id'
            }])
          });
       } else {
          // List
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          });
       }
    } else if (method === 'POST') {
       // Create Project
       await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ 
            id: 'mock-project-123', 
            name: 'Novo Projeto', 
            status: 'draft',
            metadata: {},
            user_id: 'test-user-id'
        })
      });
    } else if (method === 'PATCH') {
       // Update Project
       await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
            id: 'mock-project-123', 
            status: 'completed',
            metadata: {},
            user_id: 'test-user-id'
        })
      });
    } else {
        await route.continue();
    }
  });

  // Mock Project Analytics RPC
  await page.route('**/rest/v1/rpc/get_project_analytics', async route => {
      await route.fulfill({ status: 200, body: JSON.stringify({}) });
  });

  // Mock API Metrics (Dashboard)
  await page.route('/api/metrics*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            success: true,
            data: {
                overview: { totalProjects: 0, completedProjects: 0, totalDuration: 0, totalViews: 0 },
                performance: { successRate: 100, avgProcessingTime: 0, cacheHitRate: 0 },
                projectStatus: [],
                activity: { timeline: [], events: [] }
            }
        })
      });
  });
});

test.describe('Video Creation Wizard Flow', () => {
    test('should create a video from scratch successfully', async ({ page }) => {
        // 1. Navigate to Create
        await page.goto('/create');
        await expect(page.locator('h2:has-text("Qual o objetivo do seu vídeo?")')).toBeVisible();

        // 2. Step 1: Select "Treinamento / Curso"
        await page.click('text=Treinamento / Curso');

        // 3. Step 2: Write Script (Manual)
        await expect(page.locator('h2:has-text("Roteiro do Vídeo")')).toBeVisible();
        await page.fill('input[id="title"]', 'E2E Test Video');
        await page.fill('textarea[id="script"]', 'Este é um teste automatizado de criação de vídeo.');
        await page.click('button:has-text("Continuar")');

        // 4. Step 3: Choose Avatar
        await expect(page.locator('h2:has-text("Escolha um Apresentador")')).toBeVisible();
        // Select logic might need robust selector. Let's pick the first card.
        await page.locator('.cursor-pointer').first().click();
        await page.click('button:has-text("Continuar")');

        // 5. Step 4: Scenes (Auto)
        await expect(page.locator('h2:has-text("Cenas Geradas")')).toBeVisible({ timeout: 10000 });
        // Just click continue
        await page.click('button:has-text("Continuar")');

        // 6. Step 5: Preview
        await expect(page.locator('h2:has-text("Revisão Final")')).toBeVisible();
        await page.click('button:has-text("Renderizar Vídeo")');

        // 7. Step 6: Export (Auto-starts)
        // Verify status messages
        // It might be too fast to catch "Iniciando...", so we wait for completion
        await expect(page.locator('text=Vídeo Pronto!')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('h2:has-text("Vídeo Pronto!")')).toBeVisible();
        
        // Verify download button presence
        await expect(page.locator('text=Baixar MP4')).toBeVisible();
    });
});
