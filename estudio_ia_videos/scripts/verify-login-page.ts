
import { chromium } from 'playwright';

async function verifyLogin() {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  console.log('Navigating to login...');
  try {
    const response = await page.goto('http://localhost:3001/login');
    console.log('Status:', response?.status());
    
    // Wait for content
    await page.waitForLoadState('networkidle');
    
    const title = await page.title();
    console.log('Page Title:', title);
    
    const h1 = await page.locator('h1').textContent().catch(() => 'No h1 found');
    console.log('H1 Content:', h1);
    
    const bodyText = await page.locator('body').innerText();
    console.log('Body Text Preview:', bodyText.substring(0, 200).replace(/\n/g, ' '));
    
  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await browser.close();
  }
}

verifyLogin();
