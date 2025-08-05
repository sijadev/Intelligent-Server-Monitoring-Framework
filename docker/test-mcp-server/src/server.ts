#!/usr/bin/env node

import { SimpleMcpServer } from './simple-mcp-server';

async function main() {
  console.log('🔧 Starting Test MCP Server...');
  
  const configPath = process.env.CONFIG_PATH;
  
  const server = new SimpleMcpServer(configPath);
  
  console.log(`📋 Server configuration loaded`);
  console.log(`🚀 Starting with HTTP transport`);
  
  try {
    await server.start();
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });
}

// Handle unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

if (require.main === module) {
  main();
}