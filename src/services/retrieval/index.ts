import { Document } from 'langchain/document';
import {
  similaritySearch,
  similaritySearchWithMetadata,
} from '../../storage/vector/chromaClient';
import { RetrievalResult, RetrievalOptions } from './types';
import { logger } from '../../utils/logger';

/**
 * Retrieve relevant document chunks for a query
 */
export async function retrieveDocuments(
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievalResult[]> {
  const {
    topK = 5,
    filter,
    minScore = 0,
  } = options;

  try {
    logger.info('Retrieving documents', { query, topK, filter });

    let documents: Document[];
    let scores: number[] = [];

    // Validate filter - must be an object with at least one key
    const hasValidFilter = filter && 
                          typeof filter === 'object' && 
                          !Array.isArray(filter) &&
                          Object.keys(filter).length > 0;

    logger.debug('Filter validation', { 
      hasFilter: !!filter, 
      filterType: typeof filter,
      isArray: Array.isArray(filter),
      keysCount: filter && typeof filter === 'object' ? Object.keys(filter).length : 0,
      hasValidFilter 
    });

    if (hasValidFilter) {
      // Use metadata filtering with scores
      logger.info('Using filtered search', { filter });
      const store = await import('../../storage/vector/chromaClient').then(
        (m) => m.getVectorStore()
      );
      try {
        const resultsWithScores = await store.similaritySearchWithScore(
          query,
          topK,
          filter
        );
        documents = resultsWithScores.map(([doc]) => doc);
        scores = resultsWithScores.map(([, score]) => score);
      } catch (filterError) {
        // If filter format is invalid, fall back to regular search
        logger.warn('Filter search failed, falling back to regular search', {
          error: filterError instanceof Error ? filterError.message : String(filterError),
          filter,
        });
        documents = await similaritySearch(query, topK);
        scores = new Array(documents.length).fill(1.0);
      }
    } else {
      // Standard similarity search without filter
      // Use the retriever method which handles filters better
      logger.info('Using standard search without filter');
      try {
        const store = await import('../../storage/vector/chromaClient').then(
          (m) => m.getVectorStore()
        );
        // Use asRetriever which doesn't have the filter issue
        const retriever = store.asRetriever({ k: topK });
        const retrievedDocs = await retriever.getRelevantDocuments(query);
        documents = retrievedDocs;
        // Retriever doesn't return scores, so use default
        scores = new Array(documents.length).fill(1.0);
        logger.info('Retrieved documents via retriever', { count: documents.length });
      } catch (retrieverError) {
        // If retriever fails, fall back to similaritySearch
        logger.warn('Retriever search failed, using similaritySearch', {
          error: retrieverError instanceof Error ? retrieverError.message : String(retrieverError),
        });
        documents = await similaritySearch(query, topK);
        scores = new Array(documents.length).fill(1.0);
      }
    }

    // Convert to RetrievalResult format
    const results: RetrievalResult[] = documents.map((doc, index) => {
      const metadata = doc.metadata as {
        source: string;
        page?: number;
        chunkIndex: number;
        documentId: string;
        [key: string]: any;
      };

      return {
        chunk: doc,
        score: scores[index] || 1.0,
        metadata: {
          source: metadata.source || 'unknown',
          page: metadata.page,
          chunkIndex: metadata.chunkIndex ?? index,
          documentId: metadata.documentId || 'unknown',
          ...metadata,
        },
      };
    });

    // Filter by minimum score if specified
    const filteredResults = minScore > 0
      ? results.filter((r) => r.score >= minScore)
      : results;

    logger.info('Documents retrieved', {
      query,
      retrieved: filteredResults.length,
      requested: topK,
    });

    return filteredResults;
  } catch (error) {
    logger.error('Failed to retrieve documents', {
      error: error instanceof Error ? error.message : String(error),
      query,
    });
    throw error;
  }
}
