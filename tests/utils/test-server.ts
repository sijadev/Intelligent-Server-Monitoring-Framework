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

  // Listen on ephemeral port
  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => resolve());
  });
  const address = httpServer.address();
  if (!address || typeof address === 'string') {
    throw new Error('Could not determine server address');
  }
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    async close() {
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}
