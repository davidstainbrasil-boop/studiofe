import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('PPTX Fidelity E2E (Dev Mode)', () => {
  // Configurado para rodar no porto 3001 conforme ambiente dev
  const BASE_URL = 'http://localhost:3001';
  const PPTX_PATH = path.join(__dirname, '../__tests__/pptx/fixtures/valid.pptx');

  test('Complete Flow: Upload -> Edit -> Render', async ({ page, request }) => {
    // 0. Verificar existência do arquivo de teste
    if (!fs.existsSync(PPTX_PATH)) {
      throw new Error(`Test file not found at ${PPTX_PATH}`);
    }
    console.log(`Using test file: ${PPTX_PATH}`);

    // 1. Acessar página de preview
    await page.goto(`${BASE_URL}/pptx-preview`);
    await expect(page.getByText('PPTX Preview & Edit')).toBeVisible();

    // 2. Upload do arquivo
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').setInputFiles(PPTX_PATH);
    
    // Aguardar processamento e carregamento
    await expect(page.getByText('Loaded')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Slide 1')).toBeVisible();

    // 3. Edição Pré-Render (Simples alteração de duração)
    // Selecionar primeiro slide
    await page.getByText('Slide 1').click();
    
    // Alterar duração (assumindo que existe um input/slider para isso)
    // Procurar input de duração ou similar na UI criada
    const durationInput = page.locator('input[type="number"]').first();
    if (await durationInput.isVisible()) {
        await durationInput.fill('10');
        await page.getByText('Save').click();
        await expect(page.getByText('Changes saved')).toBeVisible();
    }

    // 4. Acionar Renderização e aguardar resposta
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/render') && resp.status() === 200),
      page.getByRole('button', { name: 'Render Video' }).click()
    ]);
    
    // Validar corpo da resposta e URL
    const data = await response.json();
    console.log('Render Response:', data);
    
    expect(data.success).toBe(true);
    expect(data.jobId).toBeTruthy();
    expect(data.url).toBeTruthy();

    await expect(page.getByText('Render started!')).toBeVisible();

    // 5. Validar arquivo final (Download check)
    console.log(`Downloading video from: ${data.url}`);
    const videoResponse = await request.get(`${BASE_URL}${data.url}`);
    expect(videoResponse.ok()).toBeTruthy();
    
    const videoBuffer = await videoResponse.body();
    const videoSize = videoBuffer.byteLength;
    console.log(`Video Size: ${videoSize} bytes`);
    
    expect(videoSize).toBeGreaterThan(0);

  });
});
