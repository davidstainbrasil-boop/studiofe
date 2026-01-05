const puppeteer = require('puppeteer');

(async () => {
    console.log('🚀 Starting Video Studio Tools Test...');

    // Launch browser
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
    });

    const page = await browser.newPage();

    // Detailed Logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    page.on('requestfailed', request => console.log('REQ FAILED:', request.failure().errorText, request.url()));

    try {
        // Set Dev Cookie
        await page.setCookie({
            name: 'dev_bypass',
            value: 'true',
            domain: 'localhost',
            path: '/',
            httpOnly: false,
            secure: false
        });

        // Use a fake project ID or an existing one.
        // Loading the new VideoStudio component at /editor/video-studio/[id]
        const testProjectId = 'dev-test-project';
        const targetUrl = `http://localhost:3000/editor/video-studio/${testProjectId}`;

        console.log(`📍 Navigating to ${targetUrl}...`);
        await page.goto(targetUrl, { waitUntil: 'networkidle0' });

        // Wait for Video Studio Header
        await page.waitForSelector('.font-bold.text-lg', { timeout: 60000 });
        const title = await page.$eval('.font-bold.text-lg', el => el.textContent);

        if (!title.includes('Video Studio Pro')) {
            throw new Error(`Expected title 'Video Studio Pro' but found '${title}'`);
        }
        console.log('✅ Video Studio Loaded.');

        // Check for Toolbar Buttons
        console.log('🔍 Searching for Canvas Tools...');

        const textBtn = await page.waitForSelector('button[title="Adicionar Texto"]', { timeout: 5000 });
        const rectBtn = await page.waitForSelector('button[title="Adicionar Retângulo"]', { timeout: 5000 });
        const circleBtn = await page.waitForSelector('button[title="Adicionar Círculo"]', { timeout: 5000 });

        if (textBtn && rectBtn && circleBtn) {
            console.log('✅ Found All Canvas Tools: Text, Rect, Circle');
        } else {
            throw new Error('Missing one or more canvas tools');
        }

        // Test Click (Optional, verifies no crash)
        await textBtn.click();
        console.log('✅ Clicked Add Text');

        await rectBtn.click();
        console.log('✅ Clicked Add Rectangle');

        // Verify Canvas exists
        const canvas = await page.$('canvas');
        if (canvas) {
            console.log('✅ Canvas element found.');
        } else {
            throw new Error('Canvas element not found');
        }

    } catch (e) {
        console.error('❌ Test Failed:', e.message);
        if (e.message.includes('Selector')) {
            const html = await page.content();
            console.log('Partial Body Dump:', html.substring(0, 500));
        }
        process.exit(1);
    } finally {
        await page.close();
        browser.disconnect();
    }
})();
