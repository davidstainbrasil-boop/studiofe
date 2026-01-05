const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Starting Analytics Debug Test...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Log console messages
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    try {
        const cookies = [{
            'name': 'dev_bypass',
            'value': 'true',
            'domain': 'localhost',
            'path': '/',
            'expires': Date.now() / 1000 + 3600
        }];
        await page.setCookie(...cookies);

        console.log('📍 Navigating to Analytics Dashboard...');
        await page.goto('http://localhost:3000/dashboard/analytics', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        console.log('📸 Taking Debug Screenshot (simulated via HTML dump)...');
        const html = await page.content();
        console.log('HTML Content Length:', html.length);

        // Check for specific substrings
        console.log('Has "Visão Geral":', html.includes('Visão Geral'));
        console.log('Has "Loading":', html.includes('Loading'));
        console.log('Has "Error":', html.includes('Error'));

        // Dump specific relevant parts
        const bodyContent = await page.evaluate(() => document.body.innerText);
        console.log('Body Text Preview:', bodyContent.substring(0, 500));

    } catch (error) {
        console.error('❌ Debug Test Failed:', error.message);
    } finally {
        await browser.close();
    }
})();
