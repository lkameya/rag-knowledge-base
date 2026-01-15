import { Router, Request, Response } from 'express';
import { isDatabaseConnected } from '../../storage/metadata/database';
import { isChromaConnected } from '../../storage/vector/chromaClient';
import { queryCache } from '../../services/cache';
import { config } from '../../config';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const checks = {
      status: 'ok' as const,
      timestamp: new Date().toISOString(),
      services: {
        sqlite: isDatabaseConnected() ? 'connected' : 'disconnected',
        chroma: (await isChromaConnected()) ? 'connected' : 'disconnected',
        ollama: 'unknown',
      },
      cache: queryCache.getStats(),
    };

    // Check Ollama connection
    try {
      const response = await fetch(`${config.ollama.baseUrl}/api/tags`);
      if (response.ok) {
        checks.services.ollama = 'connected';
      } else {
        checks.services.ollama = 'disconnected';
      }
    } catch (error) {
      checks.services.ollama = 'disconnected';
      logger.warn('Ollama health check failed', { error });
    }

    const allHealthy = 
      checks.services.sqlite === 'connected' &&
      checks.services.chroma === 'connected' &&
      checks.services.ollama === 'connected';

    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json(checks);
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
    });
  }
});

export default router;
