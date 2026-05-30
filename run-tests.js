const { chromium } = require('playwright');
const path = require('path');
const http = require('http');
const handler = require('serve-handler');

(async () => {
  const server = http.createServer((request, response) => {
    return handler(request, response, {
      public: '.'
    });
  });

  server.listen(3000, async () => {
    console.log('Running at http://localhost:3000');
    console.log('Public dir is:', path.resolve('.'));

    const isDebug = process.argv.includes('--debug');
    const browser = await chromium.launch({ headless: !isDebug });
    const page = await browser.newPage();

    // Log console messages from the browser
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`BROWSER ${msg.type().toUpperCase()}: ${msg.text()}`);
      } else {
        console.log(`BROWSER: ${msg.text()}`);
      }
    });

    page.on('requestfailed', request => {
      console.log(`REQUEST FAILED: ${request.url()} - ${request.failure().errorText}`);
    });

    try {
      await page.goto('http://localhost:3000/tests/index.html');

      if (isDebug) {
        console.log('Debug mode: browser will stay open. Close browser or press Ctrl+C to stop.');
        return; // Don't wait for results or close browser/server
      }

      // Wait for Mocha to finish
      await page.waitForFunction(() => window.mochaResults && window.mochaResults.completed, { timeout: 30000 });

      const results = await page.evaluate(() => window.mochaResults);

      console.log(`Tests finished: ${results.passes} passes, ${results.failures} failures`);

      await browser.close();
      server.close();

      if (results.failures > 0) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    } catch (error) {
      console.error('Error during tests:', error);
      await browser.close();
      server.close();
      process.exit(1);
    }
  });
})();
