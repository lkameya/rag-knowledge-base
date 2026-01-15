import { startServer } from './api/server';
import { getDatabase } from './storage/metadata/database';
import { logger } from './utils/logger';
import { ensureDir } from './utils/helpers';
import { config } from './config';

async function main() {
  try {
    logger.info('Starting RAG Knowledge Base application...');

    // Ensure required directories exist
    await ensureDir(config.upload.dir);
    await ensureDir('logs');

    // Initialize database
    await getDatabase();
    logger.info('Database initialized');

    // Start server
    await startServer();
  } catch (error) {
    logger.error('Failed to start application', { error });
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

main();
