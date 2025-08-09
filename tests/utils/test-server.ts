import express from 'express';
import { registerRoutes } from '../../server/routes';
import { errorMiddleware } from '../../server/utils/error-handler';

/**
 * Starts a lightweight test server without Vite dev middleware or health monitor interval.
 * Returns the Express app (suitable for supertest) and a close() that finishes async subsystems.
 */
export async function startTestServer() {
  const app = express();
  app.use(express.json());
  const httpServer = await registerRoutes(app);
  // Attach error middleware last
  app.use(errorMiddleware);
  return {
    app,
    async close() {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}
