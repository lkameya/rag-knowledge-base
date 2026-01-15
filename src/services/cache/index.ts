import { LRUCache } from 'lru-cache';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { hashString } from '../../utils/helpers';
import { GenerationResult } from '../generation/types';

interface CacheEntry {
  result: GenerationResult;
  timestamp: number;
}

/**
 * LRU Cache for query results
 */
class QueryCache {
  private cache: LRUCache<string, CacheEntry>;

  constructor() {
    this.cache = new LRUCache<string, CacheEntry>({
      max: config.cache.maxSize,
      ttl: config.cache.ttl,
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    });

    logger.info('Query cache initialized', {
      maxSize: config.cache.maxSize,
      ttl: `${config.cache.ttl}ms`,
    });
  }

  /**
   * Generate cache key from query and options
   */
  private generateKey(query: string, options?: Record<string, any>): string {
    const keyData = {
      query: query.toLowerCase().trim(),
      ...(options && Object.keys(options).length > 0 ? options : {}),
    };
    return hashString(JSON.stringify(keyData));
  }

  /**
   * Get cached result
   */
  get(query: string, options?: Record<string, any>): GenerationResult | null {
    const key = this.generateKey(query, options);
    const entry = this.cache.get(key);

    if (entry) {
      logger.debug('Cache hit', { query, key });
      return entry.result;
    }

    logger.debug('Cache miss', { query, key });
    return null;
  }

  /**
   * Set cached result
   */
  set(query: string, result: GenerationResult, options?: Record<string, any>): void {
    const key = this.generateKey(query, options);
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });
    logger.debug('Cache set', { query, key });
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
  } {
    return {
      size: this.cache.size,
      maxSize: config.cache.maxSize,
    };
  }

  /**
   * Delete specific entry
   */
  delete(query: string, options?: Record<string, any>): boolean {
    const key = this.generateKey(query, options);
    return this.cache.delete(key);
  }
}

// Singleton instance
export const queryCache = new QueryCache();
