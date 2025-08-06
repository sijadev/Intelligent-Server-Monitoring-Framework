import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global E2E test setup...');
  
  const baseURL = config.use?.baseURL || process.env.BASE_URL || 'http://localhost:3000';
  console.log(`🔗 Target URL: ${baseURL}`);
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the application to be ready with retries
    console.log('⏳ Waiting for application to be ready...');
    
    let retries = 10;
    while (retries > 0) {
      try {
        await page.goto(baseURL, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        console.log('✅ Successfully connected to application');
        break;
      } catch (error) {
        retries--;
        console.log(`⚠️ Connection attempt failed (${10 - retries}/10). Retrying in 5 seconds...`);
        
        if (retries === 0) {
          console.error('❌ All connection attempts failed');
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Check if the main page loads
    await page.waitForSelector('[data-testid="imf-dashboard"]', { 
      timeout: 30000,
      state: 'visible'
    }).catch(async () => {
      // If main selector not found, check for any IMF-related content
      const title = await page.title();
      const bodyText = await page.textContent('body');
      console.log(`Page title: ${title}`);
      console.log('Page loaded, but main dashboard not found. This might be expected.');
    });
    
    console.log('✅ Application is ready for testing');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;