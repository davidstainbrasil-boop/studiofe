
const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Starting E2E Debug Test...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

    try {
        // 1. Go to Login
        console.log('📍 Navigating to Login...');
        await page.goto('http://localhost:3002/login', { waitUntil: 'domcontentloaded', timeout: 60000 });

        console.log(`📄 Page Title: ${await page.title()}`);

        // 2. Click Quick Login Admin
        console.log('🖱️ Clicking "Admin" Quick Login...');

        const clicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const adminBtn = buttons.find(b => b.textContent.includes('Admin'));
            if (adminBtn) {
                console.log('Found Admin BUTTON. Clicking...');
                adminBtn.click();
                return true;
            }
            return false;
        });

        if (!clicked) throw new Error('Could not find Admin button');

        // Wait for click effect (logs)
        await new Promise(r => setTimeout(r, 2000));

        // 3. Wait for Dashboard
        console.log('⏳ Waiting for Dashboard...');
        // We already waited 2s. Check URL.
        if (!page.url().includes('/dashboard')) {
            try {
                await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 5000 });
            } catch (e) {
                console.warn('Navigation wait timed out.');
            }
        }

        const url = page.url();
        console.log(`📍 Current URL: ${url}`);

        if (url.includes('/dashboard')) {
            console.log('✅ Login Successful! Reached Dashboard.');
        } else {
            console.log('⚠️ Login Failed. Dumping Cookies...');
            const cookies = await page.cookies();
            console.log('Cookies:', cookies);

            console.log('⚠️ Forcing manual jump to /dashboard...');
            await page.goto('http://localhost:3002/dashboard', { waitUntil: 'domcontentloaded' });
            if (page.url().includes('login')) {
                throw new Error(`❌ Login Failed even after manual jump. Cookies might be invalid.`);
            } else {
                console.log('✅ Manual Jump Worked!');
            }
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
            console.warn('⚠️ "Create Project" button NOT found.');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error);
        process.exit(1);
    } finally {
        await browser.close();
        console.log('👋 Browser Closed.');
    }
})();
