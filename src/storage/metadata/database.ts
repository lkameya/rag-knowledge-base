import Database from 'better-sqlite3';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { ensureDir } from '../../utils/helpers';
import { runMigrations } from './migrations';
import path from 'path';
import { promises as fs } from 'fs';

let dbInstance: Database.Database | null = null;

/**
 * Initialize and get the database instance
 */
export async function getDatabase(): Promise<Database.Database> {
  if (dbInstance) {
    return dbInstance;
  }

  try {
    // Ensure data directory exists
    const dbDir = path.dirname(config.sqlite.dbPath);
    await ensureDir(dbDir);

    // Initialize database
    dbInstance = new Database(config.sqlite.dbPath);
    
    // Enable foreign keys
    dbInstance.pragma('foreign_keys = ON');
    
    // Run migrations
    runMigrations(dbInstance);

    logger.info(`SQLite database initialized at ${config.sqlite.dbPath}`);
    return dbInstance;
  } catch (error) {
    logger.error('Failed to initialize database', { error });
    throw error;
  }
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Database connection closed');
  }
}

/**
 * Check if database is connected
 */
export function isDatabaseConnected(): boolean {
  try {
    if (!dbInstance) {
      return false;
    }
    dbInstance.prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}
