import express, { Express } from 'express';
import cors from 'cors';
import { config } from '../config';
import { logger } from '../utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import healthRouter from './routes/health';
import documentsRouter from './routes/documents';

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Routes
  app.use('/api/health', healthRouter);
  app.use('/api/documents', documentsRouter);

  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      name: 'RAG Knowledge Base API',
      version: '1.0.0',
      status: 'running',
    });
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
