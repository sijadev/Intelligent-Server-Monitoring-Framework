import express from 'express';
import { config } from './config';
import { logger } from './services/logger.service';
import { registerRoutes } from './routes-new';
import './migrate-config'; // Ensure config migration runs

async function startServer(): Promise<void> {
  try {
    const app = express();
    
    // Basic middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // CORS middleware
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Register routes and WebSocket
    const server = await registerRoutes(app);

    // Start server
    server.listen(config.PORT, () => {
      logger.server(`Server running on port ${config.PORT}`);
      logger.server(`Environment: ${config.NODE_ENV}`);
      logger.server(`Database: ${config.DATABASE_URL ? 'Connected' : 'Memory Storage'}`);
      
      if (config.NODE_ENV === 'development') {
        logger.server(`Dashboard: http://localhost:${config.PORT}`);
        logger.server(`API: http://localhost:${config.PORT}/api`);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    function gracefulShutdown(): void {
      logger.server('Shutting down gracefully...');
      server.close(() => {
        logger.server('Server closed');
        process.exit(0);
      });
    }

  } catch (error) {
    logger.error('server', 'Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
startServer();