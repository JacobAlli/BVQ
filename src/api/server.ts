import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import path from 'path';
import { config } from '../config';
import { registerQueueRoutes } from './routes/queue';
import { registerMatchRoutes } from './routes/matches';
import { registerSettingsRoutes } from './routes/settings';
import { initWebSocket } from './ws';

export async function startApiServer(): Promise<void> {
  const app = Fastify({ logger: false });

  await app.register(fastifyCors, { origin: true });

  // API routes
  registerQueueRoutes(app);
  registerMatchRoutes(app);
  registerSettingsRoutes(app);

  // Serve frontend static files in production
  const frontendDist = path.join(process.cwd(), 'dist-frontend');
  try {
    await app.register(fastifyStatic, {
      root: frontendDist,
      prefix: '/',
      wildcard: false,
    });

    // SPA fallback — serve index.html for all non-API routes
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/') || req.url.startsWith('/socket.io/')) {
        reply.code(404).send({ error: 'Not found' });
      } else {
        reply.sendFile('index.html');
      }
    });
  } catch {
    // Frontend not built yet — that's fine during dev
  }

  // Start Socket.IO on the same server
  initWebSocket(app.server);

  await app.listen({ port: config.apiPort, host: '0.0.0.0' });
  console.log(`[api] Server listening on http://localhost:${config.apiPort}`);
}
