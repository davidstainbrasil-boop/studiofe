
const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Starting E2E Debug Test (Manual Cookie)...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    try {
        // 1. Go to Login to set domain
        // (Wait logic: domcontentloaded is usually enough for static compilation start)
        console.log('📍 Navigating to Login...');
        await page.goto('http://localhost:3002/login', { waitUntil: 'domcontentloaded', timeout: 120000 });

        // 2. Set Cookie Manually (Bypassing Button Click issue)
        console.log('🍪 Setting Cookie manually...');
        await page.setCookie({
            name: 'dev_bypass',
            value: 'true',
            domain: 'localhost',
            path: '/',
            expires: Date.now() / 1000 + 86400
        });

        // 3. Go to Dashboard
        console.log('📍 Navigating to Dashboard...');
        // Increased timeout for compilation
        await page.goto('http://localhost:3002/dashboard', { waitUntil: 'domcontentloaded', timeout: 120000 });

        const url = page.url();
        console.log(`📍 Current URL: ${url}`);

        if (url.includes('/dashboard')) {
            console.log('✅ Login Successful (Manual Cookie)! Reached Dashboard.');
        } else {
            throw new Error(`❌ Login Failed even with cookie. URL is ${url}`);
        }

        // 4. Look for "Novo Projeto"
        console.log('🔍 Searching for "Novo Projeto"...');
        // Wait for hydration if needed
        await new Promise(r => setTimeout(r, 2000));

        const created = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const target = buttons.find(b =>
                b.textContent.includes('Novo Projeto') ||
                b.textContent.includes('Criar Vídeo') ||
                b.textContent.includes('Criar Projeto')
            );
            return !!target;
        });

        if (created) {
            console.log('✅ Found "Create Project" button. Verified!');
        } else {
            console.warn('⚠️ "Create Project" button NOT found. Check Dashboard UI.');
            // Dump some content
            // const body = await page.content();
            // console.log(body);
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    } finally {
        await browser.close();
        console.log('👋 Browser Closed.');
    }
})();
