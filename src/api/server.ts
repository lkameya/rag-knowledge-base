import express, { Express } from 'express';
import cors from 'cors';
import { config } from '../config';
import { logger } from '../utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import healthRouter from './routes/health';
import documentsRouter from './routes/documents';
import queriesRouter from './routes/queries';
import statusRouter from './routes/status';
import path from 'path';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // API Routes (before static files to avoid conflicts)
  app.use('/api/health', healthRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/query', queriesRouter);
  app.use('/api/status', statusRouter);

  // Serve static files (frontend)
  app.use(express.static(path.join(__dirname, '../../public')));

  // Root endpoint - serve the UI
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: {
        message: 'Route not found',
        statusCode: 404,
      },
    });
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

export async function startServer(): Promise<void> {
  const app = createApp();

  app.listen(config.port, () => {
    logger.info(`Server started on port ${config.port}`, {
      nodeEnv: config.nodeEnv,
      port: config.port,
    });
  });
}
