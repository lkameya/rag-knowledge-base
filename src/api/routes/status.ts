import { Router, Request, Response } from 'express';
import { statusTracker, StatusEvent } from '../../services/status/statusTracker';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * Server-Sent Events endpoint for real-time status updates
 * GET /api/status/stream
 */
router.get('/stream', (req: Request, res: Response) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  logger.info('SSE connection established', { ip: req.ip });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to status stream' })}\n\n`);

  // Send recent events
  const recentEvents = statusTracker.getRecentEvents(20);
  recentEvents.forEach((event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  // Listen for new status events
  const statusHandler = (event: StatusEvent) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (error) {
      logger.error('Failed to write SSE data', { error });
      statusTracker.removeListener('status', statusHandler);
      res.end();
    }
  };

  statusTracker.on('status', statusHandler);

  // Handle client disconnect
  req.on('close', () => {
    logger.info('SSE connection closed', { ip: req.ip });
    statusTracker.removeListener('status', statusHandler);
    res.end();
  });

  // Keep connection alive with heartbeat
  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat\n\n`);
    } catch (error) {
      clearInterval(heartbeat);
      statusTracker.removeListener('status', statusHandler);
      res.end();
    }
  }, 30000); // Every 30 seconds

  // Cleanup on close
  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

/**
 * Get current status for a specific ID
 * GET /api/status/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const status = statusTracker.getStatus(req.params.id);
    
    if (!status) {
      return res.status(404).json({
        error: {
          message: 'Status not found',
          statusCode: 404,
        },
      });
    }

    res.json(status);
  } catch (error) {
    logger.error('Failed to get status', {
      error: error instanceof Error ? error.message : String(error),
      id: req.params.id,
    });
    throw error;
  }
});

/**
 * Get recent status events
 * GET /api/status
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const events = statusTracker.getRecentEvents(limit);
    res.json({ events });
  } catch (error) {
    logger.error('Failed to get status events', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
});

export default router;
