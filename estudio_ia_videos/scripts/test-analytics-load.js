const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Starting Analytics Load Test...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        // Set cookie for dev bypass
        const cookies = [{
            'name': 'dev_bypass',
            'value': 'true',
            'domain': 'localhost',
            'path': '/',
            'expires': Date.now() / 1000 + 3600
        }];
        await page.setCookie(...cookies);

        console.log('📍 Navigating to Analytics Dashboard...');
        const response = await page.goto('http://localhost:3000/dashboard/analytics', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        if (response.status() !== 200) {
            throw new Error(`Failed to load page: status ${response.status()}`);
        }

        console.log('✅ Page Loaded. Checking for Charts...');

        // Wait for Recharts or specific analytics elements
        // .recharts-wrapper is a common class for Recharts
        await page.waitForSelector('.recharts-wrapper', { timeout: 15000 });
        console.log('✅ Charts (.recharts-wrapper) found!');

        // Check for specific text
        const content = await page.content();
        if (content.includes('Visão Geral')) {
            console.log('✅ Found "Visão Geral" header.');
        } else {
            console.warn('⚠️ Header "Visão Geral" not found?');
        }

        console.log('🎉 Analytics Dashboard Test PASSED');

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        // Dump body for debug
        try {
            const body = await page.evaluate(() => document.body.innerHTML);
            console.log('Partial Body Dump:', body.substring(0, 500));
        } catch (e) { }
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
