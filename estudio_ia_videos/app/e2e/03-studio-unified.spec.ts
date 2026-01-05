import { test, expect } from '@playwright/test';
import { loginWithCookie, mockSupabaseAuth } from './helpers';

/**
 * E2E Tests - Unified Studio Flow
 * 
 * Verifies access to the Unified Studio interface where TTS and other modules reside.
 */

test.beforeEach(async ({ page }) => {
  await mockSupabaseAuth(page);
  await loginWithCookie(page);
});

test.describe('Unified Studio Access', () => {
    test('should access studio unified page', async ({ page }) => {
        // Navigate directly to the route
        await page.goto('/studio-unified');
        
        // LoginWithCookie waits for Dashboard, so we might need to wait for load here check
        // Verify Header
        await expect(page.locator('h1:has-text("Studio Unificado")')).toBeVisible({ timeout: 15000 });
        
        // Verify Description
        await expect(page.locator('text=Crie vídeos profissionais com IA em um fluxo integrado')).toBeVisible();
    });

    test('should display workflow steps including TTS', async ({ page }) => {
        await page.goto('/studio-unified');
        
        // Verify "Fluxo de Trabalho" card
        await expect(page.locator('text=Fluxo de Trabalho')).toBeVisible();
        
        // Verify Steps presence
        const steps = ['Importar', 'Editar', 'Avatar', 'TTS', 'Render', 'Export'];
        
        for (const step of steps) {
            await expect(page.locator(`text=${step}`).first()).toBeVisible();
        }
    });

    // We can add a simple navigation test if needed, clicking blindly might be flaky if steps are disabled/pending
    // The code shows steps are clickable.
});
