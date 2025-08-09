#!/usr/bin/env node

import http from 'http';

const port = process.env.PORT || 3001;
const host = process.env.HOST || 'localhost';

const options = {
  hostname: host,
  port: port,
  path: '/health',
  method: 'GET',
  timeout: 3000,
};

const request = http.request(options, (response) => {
  if (response.statusCode === 200) {
    console.log('✅ Health check passed');
    process.exit(0);
  } else {
    console.error(`❌ Health check failed with status ${response.statusCode}`);
    process.exit(1);
  }
});

request.on('error', (error) => {
  console.error('❌ Health check request failed:', error.message);
  process.exit(1);
});

request.on('timeout', () => {
  console.error('❌ Health check timed out');
  request.destroy();
  process.exit(1);
});

request.end();
