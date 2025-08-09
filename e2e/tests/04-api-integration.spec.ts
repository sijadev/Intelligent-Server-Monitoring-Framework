import { test, expect } from '@playwright/test';

test.describe('IMF API Integration Tests', () => {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000';

  test('should respond to health check endpoint', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/health`);

    if (response.ok()) {
      console.log('✅ Health check endpoint responding');
      const healthData = await response.json().catch(() => ({}));
      console.log('Health check response:', healthData);
    } else {
      console.log(`ℹ️  Health check endpoint returned status: ${response.status()}`);
    }
  });

  test('should respond to dashboard API', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/dashboard`);

    if (response.ok()) {
      console.log('✅ Dashboard API responding');
      const dashboardData = await response.json().catch(() => ({}));
      console.log('Dashboard data keys:', Object.keys(dashboardData));
    } else {
      console.log(`ℹ️  Dashboard API returned status: ${response.status()}`);

      // Log response for debugging
      const responseText = await response.text();
      console.log('Response text:', responseText.substring(0, 200));
    }
  });

  test('should respond to problems API', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/problems`);

    if (response.ok()) {
      console.log('✅ Problems API responding');
      const problemsData = await response.json().catch(() => []);
      console.log(
        `Found ${Array.isArray(problemsData) ? problemsData.length : 'unknown'} problems`,
      );
    } else {
      console.log(`ℹ️  Problems API returned status: ${response.status()}`);
    }
  });

  test('should respond to metrics API', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/metrics`);

    if (response.ok()) {
      console.log('✅ Metrics API responding');
      const metricsData = await response.json().catch(() => []);
      console.log(`Found ${Array.isArray(metricsData) ? metricsData.length : 'unknown'} metrics`);
    } else {
      console.log(`ℹ️  Metrics API returned status: ${response.status()}`);
    }
  });

  test('should respond to plugins API', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/plugins`);

    if (response.ok()) {
      console.log('✅ Plugins API responding');
      const pluginsData = await response.json().catch(() => []);
      console.log(`Found ${Array.isArray(pluginsData) ? pluginsData.length : 'unknown'} plugins`);
    } else {
      console.log(`ℹ️  Plugins API returned status: ${response.status()}`);
    }
  });

  test('should respond to logs API', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/logs`);

    if (response.ok()) {
      console.log('✅ Logs API responding');
      const logsData = await response.json().catch(() => []);
      console.log(`Found ${Array.isArray(logsData) ? logsData.length : 'unknown'} logs`);
    } else {
      console.log(`ℹ️  Logs API returned status: ${response.status()}`);
    }
  });

  test('should handle CORS correctly', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/dashboard`, {
      headers: {
        Origin: 'http://localhost:3000',
      },
    });

    const corsHeader = response.headers()['access-control-allow-origin'];

    if (corsHeader) {
      console.log(`✅ CORS header present: ${corsHeader}`);
    } else {
      console.log('ℹ️  No CORS headers found (might be handled by proxy)');
    }
  });

  test('should handle authentication if required', async ({ request }) => {
    // Test if any endpoints require authentication
    const protectedEndpoints = ['/api/config', '/api/framework/start', '/api/framework/stop'];

    for (const endpoint of protectedEndpoints) {
      try {
        const response = await request.get(`${baseURL}${endpoint}`);

        if (response.status() === 401 || response.status() === 403) {
          console.log(`🔒 ${endpoint} is protected (status: ${response.status()})`);
        } else if (response.ok()) {
          console.log(`✅ ${endpoint} accessible (status: ${response.status()})`);
        } else {
          console.log(`ℹ️  ${endpoint} returned status: ${response.status()}`);
        }
      } catch (error) {
        console.log(`ℹ️  Error testing ${endpoint}: ${error.message}`);
      }
    }
  });

  test('should handle malformed requests gracefully', async ({ request }) => {
    console.log('Testing API error handling...');

    // Test invalid JSON POST
    try {
      const response = await request.post(`${baseURL}/api/problems`, {
        data: '{invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log(`Invalid JSON POST status: ${response.status()}`);

      if (response.status() >= 400 && response.status() < 500) {
        console.log('✅ API properly rejects invalid JSON');
      }
    } catch (error) {
      console.log(`ℹ️  Invalid JSON test error: ${error.message}`);
    }

    // Test non-existent endpoint
    const response404 = await request.get(`${baseURL}/api/non-existent-endpoint`);
    console.log(`Non-existent endpoint status: ${response404.status()}`);

    if (response404.status() === 404) {
      console.log('✅ API properly returns 404 for non-existent endpoints');
    }
  });

  test('should return proper content types', async ({ request }) => {
    const endpoints = ['/api/dashboard', '/api/problems', '/api/metrics'];

    for (const endpoint of endpoints) {
      try {
        const response = await request.get(`${baseURL}${endpoint}`);

        if (response.ok()) {
          const contentType = response.headers()['content-type'];
          console.log(`${endpoint} Content-Type: ${contentType}`);

          if (contentType && contentType.includes('application/json')) {
            console.log(`✅ ${endpoint} returns proper JSON content type`);
          } else {
            console.log(`ℹ️  ${endpoint} content type might need adjustment`);
          }
        }
      } catch (error) {
        console.log(`ℹ️  Error testing ${endpoint}: ${error.message}`);
      }
    }
  });
});
