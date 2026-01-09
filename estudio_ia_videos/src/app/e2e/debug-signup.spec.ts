import { test, expect } from '@playwright/test';

test('debug signup', async ({ page }) => {
  // Listen to console messages
  page.on('console', msg => console.log(`BROWSER: ${msg.type()}: ${msg.text()}`));
  
  await page.goto('/signup');
  
  const uniqueEmail = `test-${Date.now()}@example.com`;
  
  await page.fill('input[name="name"]', 'Test User');
  await page.fill('input[type="email"]', uniqueEmail);
  await page.fill('input[name="password"]', 'Test@12345');
  await page.fill('input[name="confirmPassword"]', 'Test@12345');
  
  await page.click('button[type="submit"]');
  
  // Wait a bit to see console logs
  await page.waitForTimeout(15000);
  
  // Take screenshot
  await page.screenshot({ path: '/tmp/signup-debug.png', fullPage: true });
});
