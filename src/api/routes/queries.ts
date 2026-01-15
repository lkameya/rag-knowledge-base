import { Router, Request, Response } from 'express';
import { generateAnswer } from '../../services/generation';
import { ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { validateBody } from '../middleware/validator';
import { z } from 'zod';

const router = Router();

const querySchema = z.object({
  query: z.string().min(1, 'Query cannot be empty'),
  topK: z.number().int().min(1).max(20).optional(),
  useCache: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).optional(),
  filter: z.record(z.any()).optional(),
});

/**
 * Query the knowledge base
 * POST /api/query
 */
router.post(
  '/',
  validateBody(querySchema),
  async (req: Request, res: Response) => {
    try {
      const {
        query,
        topK,
        useCache = false,
        temperature,
        maxTokens,
        filter,
      } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new ValidationError('Query is required and cannot be empty');
      }

      logger.info('Processing query', {
        query,
        topK,
        useCache,
        temperature,
      });

      // Ensure filter is either undefined or a valid non-empty object
      let validFilter: Record<string, any> | undefined = undefined;
      if (filter && typeof filter === 'object' && !Array.isArray(filter) && Object.keys(filter).length > 0) {
        validFilter = filter;
      }

      const result = await generateAnswer(query, {
        topK,
        temperature,
        maxTokens,
        filter: validFilter,
        useCache: useCache !== false, // Default to true if not specified
      });

      res.json(result);
    } catch (error) {
      logger.error('Query failed', {
        error: error instanceof Error ? error.message : String(error),
        body: req.body,
      });
      throw error;
    }
  }
);

/**
 * Get query history
 * GET /api/query/history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const db = await import('../../storage/metadata/database').then(
      (m) => m.getDatabase()
    );

    const queries = db
      .prepare(
        'SELECT * FROM queries ORDER BY created_at DESC LIMIT ?'
      )
      .all(limit) as Array<{
      id: string;
      query_text: string;
      response_time_ms: number | null;
      created_at: string;
    }>;

    res.json({ queries });
  } catch (error) {
    logger.error('Failed to get query history', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
});

/**
 * Get cache statistics
 * GET /api/query/cache/stats
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const { queryCache } = await import('../../services/cache');
    const stats = queryCache.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Failed to get cache stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
});

/**
 * Clear cache
 * DELETE /api/query/cache
 */
router.delete('/cache', async (req: Request, res: Response) => {
  try {
    const { queryCache } = await import('../../services/cache');
    queryCache.clear();
    res.json({ success: true, message: 'Cache cleared' });
  } catch (error) {
    logger.error('Failed to clear cache', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
});

export default router;
