// Check what chromium revision Playwright needs
const path = require('path');
const browsersJSON = path.join(__dirname, 'node_modules/playwright-core/browsers.json');
const data = require(browsersJSON);
console.log('Playwright root browsers.json:', JSON.stringify(data, null, 2));
