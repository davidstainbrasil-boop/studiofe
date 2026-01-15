
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('PPTX Studio UI Flow', () => {
  test('should upload PPTX and trigger render', async ({ page }) => {
    // Debug
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('requestfailed', req => console.log('REQ FAILED:', req.url()));

    // Navigate
    await page.goto('/pptx-preview');

    // MOCKS
    await page.route('**/api/pptx/upload', async route => {
        await new Promise(f => setTimeout(f, 1000));
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                projectId: 'mock-project-id-123',
                slidesCount: 3,
                estimatedDuration: 15,
                data: { projectId: 'mock-project-id-123' }
            })
        });
    });

    await page.route('**/api/projects/mock-project-id-123', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                success: true,
                data: {
                    id: 'mock-project-id-123',
                    name: 'Test Presentation',
                    status: 'COMPLETED',
                    totalSlides: 3,
                    duration: 15,
                    slidesData: {
                        assets: { images: ['img1.jpg'] },
                        timeline: { tracks: [] }
                    },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            })
        });
    });

    await page.route('**/api/v1/export', async route => {
        console.log('!!! MOCK EXPORT HIT !!!');
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                jobId: 'render-job-123'
            })
        });
    });

    // Verify Title
    await expect(page.locator('h1')).toContainText('Novo Projeto');
    
    // Upload File
    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'fixtures', 'test-presentation.pptx');
    await fileInput.setInputFiles(filePath);
    
    // Start Processing
    await page.locator('button', { hasText: 'Iniciar Processamento' }).click();

    // Verify Editor Loaded (Implicit success check)
    await expect(page.locator('button[aria-label="Slides"]')).toBeVisible({ timeout: 30000 });

    // Click Export Tab
    const exportTab = page.locator('button[aria-label="Exportar"]');
    await expect(exportTab).toBeVisible();
    await exportTab.click();

    // Wait for Animation
    await page.waitForTimeout(2000);

    // Export Panel
    await expect(page.locator('h3', { hasText: 'Exportar Vídeo' })).toBeVisible();
    
    // Click Export
    const finalExportBtn = page.locator('button', { hasText: 'Exportar Vídeo Final' });
    await expect(finalExportBtn).toBeVisible();
    
    // Try standard click again, forcing if needed
    await finalExportBtn.click({ force: true });
    
    // Wait for Render Started toast
    await expect(page.locator('text=Renderização iniciada!')).toBeVisible({ timeout: 15000 });
  });
});
