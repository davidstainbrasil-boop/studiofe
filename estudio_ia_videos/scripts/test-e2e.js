
const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Starting E2E Test...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();

    try {
        // 1. Go to Login
        console.log('📍 Navigating to Login...');
        await page.goto('http://localhost:3002/login', { waitUntil: 'domcontentloaded', timeout: 120000 });

        const title = await page.title();
        console.log(`📄 Page Title: ${title}`);

        // 2. Click Quick Login Admin
        console.log('🖱️ Clicking "Admin" Quick Login...');

        // Using evaluate to find element by text to be safe across versions
        await page.evaluate(async () => {
            const spans = Array.from(document.querySelectorAll('span'));
            const adminSpan = spans.find(s => s.textContent.includes('Admin'));
            if (adminSpan) {
                adminSpan.click();
            } else {
                // Fallback to button
                const buttons = Array.from(document.querySelectorAll('button'));
                // Admin is usually the first quick login button
                // But let's look for "Admin" in children
                const adminBtn = buttons.find(b => b.textContent.includes('Admin'));
                if (adminBtn) adminBtn.click();
                else if (buttons.length > 0) buttons[0].click(); // Last resort
                else throw new Error('No buttons found');
            }
        });

        // 3. Wait for Dashboard
        console.log('⏳ Waiting for Dashboard...');
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 });

        const url = page.url();
        console.log(`📍 Current URL: ${url}`);

        if (url.includes('/dashboard')) {
            console.log('✅ Login Successful! Reached Dashboard.');
        } else {
            throw new Error(`❌ Login Failed. URL is ${url}`);
        }

        // 4. Look for "Novo Projeto"
        console.log('🔍 Searching for "Novo Projeto"...');
        const created = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const target = buttons.find(b =>
                b.textContent.includes('Novo Projeto') ||
                b.textContent.includes('Criar Vídeo') ||
                b.textContent.includes('New Project')
            );
            return !!target;
        });

        if (created) {
            console.log('✅ Found "Create Project" button.');
        } else {
            console.warn('⚠️ "Create Project" button NOT found. Check Dashboard UI.');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    } finally {
        await browser.close();
        console.log('👋 Browser Closed.');
    }
})();
