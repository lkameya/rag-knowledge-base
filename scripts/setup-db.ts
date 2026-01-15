import { getDatabase, closeDatabase } from '../src/storage/metadata/database';
import { logger } from '../src/utils/logger';

async function setupDatabase() {
  try {
    logger.info('Setting up database...');
    await getDatabase();
    logger.info('Database setup completed successfully');
  } catch (error) {
    logger.error('Database setup failed', { error });
    process.exit(1);
  } finally {
    closeDatabase();
  }
}

setupDatabase();
