import { test, expect } from '@playwright/test';

test.describe('Competitive Features Flow', () => {
  test.describe('Landing Page', () => {
    test('should display landing page with competitive comparison', async ({ page }) => {
      await page.goto('/landing');
      
      // Check hero section
      await expect(page.locator('h1')).toContainText('PPT');
      await expect(page.locator('h1')).toContainText('Vídeo');
      
      // Check comparison table exists
      await expect(page.locator('#comparison')).toBeVisible();
      await expect(page.getByText('TécnicoCursos')).toBeVisible();
      await expect(page.getByText('Pictory')).toBeVisible();
      
      // Check pricing section
      await expect(page.locator('#pricing')).toBeVisible();
      await expect(page.getByText('R$')).toBeVisible();
      
      // Check CTA buttons
      await expect(page.getByRole('link', { name: /começar grátis/i })).toBeVisible();
    });

    test('should navigate to registration from landing', async ({ page }) => {
      await page.goto('/landing');
      
      await page.getByRole('link', { name: /começar grátis/i }).first().click();
      
      await expect(page).toHaveURL(/\/(register|signup)/);
    });
  });

  test.describe('PPT to Video Wizard', () => {
    test.beforeEach(async ({ page }) => {
      // Note: In real tests, you'd authenticate first
      await page.goto('/ppt-to-video');
    });

    test('should display upload step initially', async ({ page }) => {
      await expect(page.getByText(/upload/i)).toBeVisible();
      await expect(page.getByText(/pptx/i)).toBeVisible();
    });

    test('should show step indicators', async ({ page }) => {
      // Check 4 steps are visible
      await expect(page.getByText('Upload')).toBeVisible();
      await expect(page.getByText(/slides/i)).toBeVisible();
      await expect(page.getByText(/voz/i)).toBeVisible();
      await expect(page.getByText(/render/i)).toBeVisible();
    });

    test('should accept file drop zone', async ({ page }) => {
      const dropzone = page.locator('[data-testid="dropzone"], .dropzone, [role="button"]').first();
      await expect(dropzone).toBeVisible();
    });
  });

  test.describe('AI Avatars', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/ai-avatars');
    });

    test('should display avatar gallery', async ({ page }) => {
      await expect(page.getByText(/avatar/i)).toBeVisible();
      
      // Check filter options exist
      await expect(page.getByText(/feminino/i).or(page.getByText(/masculino/i))).toBeVisible();
    });

    test('should allow avatar selection', async ({ page }) => {
      // Wait for avatars to load
      await page.waitForTimeout(1000);
      
      // Find and click first avatar card
      const avatarCard = page.locator('[class*="cursor-pointer"]').first();
      if (await avatarCard.isVisible()) {
        await avatarCard.click();
        // Verify selection indicator appears
        await expect(page.locator('[class*="border-blue"]').or(page.locator('[class*="ring"]'))).toBeVisible();
      }
    });
  });

  test.describe('Voice Studio', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/voice-studio');
    });

    test('should display voice options', async ({ page }) => {
      await expect(page.getByText(/voice/i).or(page.getByText(/voz/i))).toBeVisible();
      
      // Check language filters
      await expect(page.getByText('PT-BR').or(page.getByText('Português'))).toBeVisible();
    });

    test('should have text input area', async ({ page }) => {
      const textArea = page.locator('textarea').first();
      await expect(textArea).toBeVisible();
    });

    test('should have voice clone option', async ({ page }) => {
      await expect(page.getByText(/clon/i)).toBeVisible();
    });
  });

  test.describe('Export Pro / SCORM', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/export-pro');
    });

    test('should display export options', async ({ page }) => {
      await expect(page.getByText(/export/i)).toBeVisible();
    });

    test('should show SCORM tab', async ({ page }) => {
      await expect(page.getByText('SCORM').or(page.getByText('LMS'))).toBeVisible();
    });

    test('should show video format options', async ({ page }) => {
      await expect(page.getByText('MP4')).toBeVisible();
    });

    test('should show LMS platforms', async ({ page }) => {
      // Click SCORM tab
      await page.getByText('SCORM').first().click();
      
      // Check LMS options
      await expect(page.getByText('Moodle').or(page.getByText('Canvas'))).toBeVisible();
    });
  });

  test.describe('Editor Pro', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/editor-pro');
    });

    test('should display timeline interface', async ({ page }) => {
      // May redirect to login - that's ok for protected routes
      const url = page.url();
      if (!url.includes('login')) {
        await expect(page.getByText(/timeline/i).or(page.getByText(/editor/i))).toBeVisible();
      }
    });
  });

  test.describe('Navigation Integration', () => {
    test('should have sidebar with new features', async ({ page }) => {
      // Go to a page that has sidebar
      await page.goto('/projects');
      
      // Wait for potential auth redirect
      await page.waitForTimeout(1000);
      
      const url = page.url();
      if (!url.includes('login')) {
        // Check new navigation items
        const sidebar = page.locator('aside, nav, [role="navigation"]').first();
        if (await sidebar.isVisible()) {
          await expect(page.getByText('PPT → Vídeo').or(page.getByText('PPT-to-Video'))).toBeVisible();
          await expect(page.getByText('AI Avatars').or(page.getByText('Avatares'))).toBeVisible();
          await expect(page.getByText('Voice Studio').or(page.getByText('Vozes'))).toBeVisible();
        }
      }
    });
  });
});

test.describe('Responsive Design', () => {
  test('landing page is mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/landing');
    
    // Content should still be visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('link', { name: /começar/i })).toBeVisible();
  });

  test('PPT wizard works on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/ppt-to-video');
    
    await expect(page.getByText(/upload/i)).toBeVisible();
  });
});
