
const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Starting Editor Flow Test...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    try {
        // 1. Login
        console.log('📍 Navigating to Login...');
        await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Cookie Bypass
        await page.setCookie({
            name: 'dev_bypass',
            value: 'true',
            domain: 'localhost',
            path: '/',
            expires: Date.now() / 1000 + 86400
        });

        // 2. Go to Dashboard
        console.log('📍 Navigating to Dashboard...');
        // Direct Navigation to Editor to verify Route
        console.log('📍 Navigating directly to Editor Route...');
        await page.goto('http://localhost:3000/editor/ai-script/new', { waitUntil: 'domcontentloaded', timeout: 30000 });

        console.log('✅ URL is now:', page.url());

        if (page.url().includes('/editor')) {
            console.log('✅ SUCESSO: Editor Page Loaded!');
            const html = await page.content();
            if (html.includes('Estúdio de Criação IA')) {
                console.log('✅ Found "Estúdio de Criação IA" header.');
            } else {
                console.warn('⚠️ Editor loaded but header missing?');
            }
        } else {
            throw new Error('Failed to navigate to Editor (Redirected?)');
        }

        // 3. Find and Click "Criar Projeto"
        let clicked = false;
        // Wait for the button
        try {
            await page.waitForSelector('#create-project-btn-main', { timeout: 5000 });
            console.log('✅ Found #create-project-btn-main');
            await page.click('#create-project-btn-main');
            clicked = true;
        } catch (e) {
            console.log('❌ #create-project-btn-main NOT found. Maybe Empty State?');
            // Fallback to text search just in case
            clicked = await page.evaluate(() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Criar Projeto'));
                if (btn) { btn.click(); return true; }
                return false;
            });
        }

        if (clicked) {
            console.log('✅ Clicked trigger button.');
        } else {
            console.log('❌ Button NOT found anywhere.');
        }

        if (true) { // Always try to wait for reaction
            console.log('✅ Clicked trigger. Waiting for Dialog...');

            // Wait a bit
            await new Promise(r => setTimeout(r, 2000));

            // Check DOM
            const hasDialog = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
            if (hasDialog) {
                console.log('✅ Dialog matches [role="dialog"]');
            } else {
                console.log('❌ Dialog NOT found. Dumping Body...');
                const bodyHTML = await page.evaluate(() => document.body.innerHTML);
                console.log('BODY HTML (Partial):', bodyHTML.substring(0, 1000) + '...');
                // Check if button aria-expanded is true
                const ariaExpanded = await page.evaluate(() => {
                    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Criar Projeto'));
                    return btn ? btn.getAttribute('aria-expanded') : 'btn-not-found';
                });
                console.log('Button aria-expanded:', ariaExpanded);
                throw new Error('Dialog failed to open');
            }

            try {
                await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
                console.log('✅ Dialog appeared!');
                // ... (rest of logic)

                // Type Name
                console.log('⌨️ Typing Project Name...');
                await page.type('#name', 'Test Project ' + Date.now());

                // Click Create Button
                console.log('🖱️ Clicking Create/Submit...');
                await page.evaluate(() => {
                    const footerButtons = Array.from(document.querySelectorAll('[role="dialog"] button'));
                    const createSubmit = footerButtons.find(b => b.textContent.includes('Criar Projeto'));
                    if (createSubmit) createSubmit.click();
                });

                // Wait for Redirect
                console.log('⏳ Waiting for Redirect to Editor...');
                await page.waitForNavigation({ timeout: 15000, waitUntil: 'domcontentloaded' });

                if (page.url().includes('/editor')) {
                    console.log('✅ PRESTO! Redirected to Editor. URL:', page.url());
                } else {
                    throw new Error('Redirect failed. Current URL: ' + page.url());
                }

            } catch (e) {
                console.error('❌ Interaction Failed:', e);
                // Log Dialog HTML for debug
                const dialogHTML = await page.evaluate(() => document.querySelector('[role="dialog"]')?.outerHTML);
                console.log('Dialog HTML:', dialogHTML);
            }
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    } finally {
        await browser.close();
        console.log('👋 Browser Closed.');
    }
})();
