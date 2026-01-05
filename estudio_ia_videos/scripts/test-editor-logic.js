const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Starting Editor Logic Test...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Capture logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));

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

        console.log('📍 Navigating to AI Script Editor...');
        await page.goto('http://localhost:3000/editor/ai-script/new', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        console.log('✅ Page Loaded. Verifying key elements...');

        // Check for main container
        await page.waitForSelector('main', { timeout: 10000 });
        console.log('✅ Main container found.');

        // Check for specific text/components unique to this editor
        // Based on ai-script-generator.tsx seen earlier: "Gerador de Roteiros IA"
        const foundHeader = await page.evaluate(() => {
            return document.body.innerText.includes('Gerador de Roteiros IA');
        });

        if (foundHeader) {
            console.log('✅ Found "Gerador de Roteiros IA" text.');
        } else {
            throw new Error('Header "Gerador de Roteiros IA" NOT found. Page content might be wrong.');
        }

        console.log('🎉 Editor Logic Test PASSED');

    } catch (error) {
        console.error('❌ Test Failed:', error.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
})();
