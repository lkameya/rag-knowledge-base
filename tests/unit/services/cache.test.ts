import { queryCache } from '../../../src/services/cache';
import { GenerationResult } from '../../../src/services/generation/types';

describe('QueryCache', () => {
  beforeEach(() => {
    queryCache.clear();
  });

  test('should cache and retrieve results', () => {
    const query = 'test query';
    const result: GenerationResult = {
      answer: 'test answer',
      citations: [],
      sources: [],
    };

    queryCache.set(query, result);
    const cached = queryCache.get(query);

    expect(cached).toEqual(result);
  });

  test('should return null for uncached query', () => {
    const cached = queryCache.get('uncached query');
    expect(cached).toBeNull();
  });

  test('should generate different keys for different queries', () => {
    const result: GenerationResult = {
      answer: 'test',
      citations: [],
      sources: [],
    };

    queryCache.set('query 1', result);
    queryCache.set('query 2', result);

    expect(queryCache.get('query 1')).toEqual(result);
    expect(queryCache.get('query 2')).toEqual(result);
    expect(queryCache.get('query 3')).toBeNull();
  });

  test('should handle options in cache key', () => {
    const result: GenerationResult = {
      answer: 'test',
      citations: [],
      sources: [],
    };

    queryCache.set('query', result, { topK: 5 });
    queryCache.set('query', result, { topK: 10 });

    expect(queryCache.get('query', { topK: 5 })).toEqual(result);
    expect(queryCache.get('query', { topK: 10 })).toEqual(result);
    expect(queryCache.get('query')).toBeNull(); // No options
  });

  test('should clear cache', () => {
    const result: GenerationResult = {
      answer: 'test',
      citations: [],
      sources: [],
    };

    queryCache.set('query', result);
    expect(queryCache.get('query')).toEqual(result);

    queryCache.clear();
    expect(queryCache.get('query')).toBeNull();
  });

  test('should get cache statistics', () => {
    const stats = queryCache.getStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('maxSize');
    expect(typeof stats.size).toBe('number');
    expect(typeof stats.maxSize).toBe('number');
  });
});
