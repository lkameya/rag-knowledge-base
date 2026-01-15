import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';
import { Document } from 'langchain/document';
import { ChromaClient } from 'chromadb';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { ensureDir } from '../../utils/helpers';
import path from 'path';

let vectorStore: Chroma | null = null;
let embeddings: OllamaEmbeddings | null = null;
let chromaClientInstance: ChromaClient | null = null;

/**
 * Initialize Chroma vector store
 */
export async function getVectorStore(): Promise<Chroma> {
  if (vectorStore) {
    return vectorStore;
  }

  try {
    // Ensure Chroma DB directory exists
    const dbPath = path.resolve(config.chroma.dbPath);
    await ensureDir(dbPath);

    logger.info('Initializing Chroma client', { dbPath });

    // Initialize embeddings
    embeddings = new OllamaEmbeddings({
      baseUrl: config.ollama.baseUrl,
      model: config.ollama.embeddingModel,
    });

    // For local Chroma, we need to use a server URL
    // Use the configured server URL
    const chromaServerUrl = config.chroma.serverUrl;
    
    logger.info('Connecting to Chroma server', { url: chromaServerUrl });

    // Initialize ChromaClient pointing to local server
    chromaClientInstance = new ChromaClient({
      path: chromaServerUrl,
    });

    logger.info('Chroma client initialized', { url: chromaServerUrl });

    // Check if collection exists by listing collections
    let collectionExists = false;
    try {
      const collections = await chromaClientInstance.listCollections();
      collectionExists = collections.some((col: any) => col.name === config.chroma.collectionName);
      if (collectionExists) {
        logger.info('Found existing Chroma collection', { collectionName: config.chroma.collectionName });
      } else {
        logger.info('Collection does not exist, will create new one', { 
          collectionName: config.chroma.collectionName,
        });
      }
    } catch (error) {
      collectionExists = false;
      logger.info('Collection does not exist, will create new one', { 
        collectionName: config.chroma.collectionName,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (collectionExists) {
      // Collection exists, use it
      vectorStore = await Chroma.fromExistingCollection(
        embeddings,
        {
          collectionName: config.chroma.collectionName,
          url: chromaServerUrl,
        }
      );

      logger.info('Chroma vector store initialized from existing collection', {
        collectionName: config.chroma.collectionName,
        dbPath: dbPath,
      });
    } else {
      // Collection doesn't exist, create it
      logger.info('Creating new Chroma collection...');
      
      vectorStore = await Chroma.fromDocuments(
        [],
        embeddings,
        {
          collectionName: config.chroma.collectionName,
          url: chromaServerUrl,
        }
      );

      logger.info('New Chroma collection created', {
        collectionName: config.chroma.collectionName,
        dbPath: dbPath,
      });
    }

    return vectorStore;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Failed to initialize Chroma vector store', {
      error: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name || typeof error,
      dbPath: config.chroma.dbPath,
    });
    throw error;
  }
}

/**
 * Add documents to vector store
 */
export async function addDocumentsToVectorStore(
  documents: Document[]
): Promise<string[]> {
  try {
    logger.info('Getting vector store instance', { documentCount: documents.length });
    const store = await getVectorStore();
    
    logger.info('Adding documents to vector store', { 
      documentCount: documents.length,
      firstDocLength: documents[0]?.pageContent?.length || 0,
    });
    
    const ids = await store.addDocuments(documents);
    
    logger.info('Documents added to vector store successfully', { 
      count: documents.length,
      idsReturned: ids.length 
    });
    
    return ids;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Failed to add documents to vector store', {
      error: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name || typeof error,
      documentCount: documents.length,
    });
    throw error;
  }
}

/**
 * Search similar documents
 * 
 * This function queries Chroma directly using ChromaClient to bypass LangChain's filter bug
 * where it passes empty {} filters causing "Invalid where clause" errors.
 */
export async function similaritySearch(
  query: string,
  k: number = 5
): Promise<Document[]> {
  try {
    // Get embeddings and ensure store is initialized
    await getVectorStore();
    const embeddingsInstance = embeddings!;
    const chromaClient = chromaClientInstance!;
    
    // Generate query embedding
    logger.debug('Generating query embedding', { query });
    const queryEmbedding = await embeddingsInstance.embedQuery(query);
    
    logger.debug('Querying Chroma directly via ChromaClient', { 
      collectionName: config.chroma.collectionName,
      k,
    });
    
    // Get collection and query directly - this bypasses LangChain's filter handling
    const collection = await chromaClient.getOrCreateCollection({
      name: config.chroma.collectionName,
    });
    
    // Query without any where/filter clause
    const queryResult = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: k,
      // Explicitly don't pass 'where' to avoid empty filter issue
    });
    
    // Convert Chroma results to LangChain Documents
    const documents: Document[] = [];
    if (queryResult.ids && queryResult.ids[0]) {
      const ids = queryResult.ids[0];
      const metadatas = queryResult.metadatas?.[0] || [];
      const documents_data = queryResult.documents?.[0] || [];
      
      for (let i = 0; i < ids.length; i++) {
        documents.push(
          new Document({
            pageContent: documents_data[i] || '',
            metadata: metadatas[i] || {},
          })
        );
      }
    }
    
    logger.info('Similarity search performed (via ChromaClient)', { 
      query, 
      resultsCount: documents.length 
    });
    return documents;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Similarity search failed', {
      error: errorMessage,
      query,
      k,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Search with metadata filter
 */
export async function similaritySearchWithMetadata(
  query: string,
  filter: Record<string, any>,
  k: number = 5
): Promise<Document[]> {
  try {
    // Validate filter is not empty
    if (!filter || typeof filter !== 'object' || Array.isArray(filter) || Object.keys(filter).length === 0) {
      throw new Error('Filter must be a non-empty object');
    }

    const store = await getVectorStore();
    const results = await store.similaritySearchWithScore(query, k, filter);
    logger.info('Similarity search with metadata performed', {
      query,
      filter,
      resultsCount: results.length,
    });
    return results.map(([doc]) => doc);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Similarity search with metadata failed', {
      error: errorMessage,
      query,
      filter,
      k,
    });
    throw error;
  }
}

/**
 * Delete documents by IDs
 */
export async function deleteDocumentsFromVectorStore(ids: string[]): Promise<void> {
  const store = await getVectorStore();
  await store.delete({ ids });
  logger.info('Documents deleted from vector store', { count: ids.length });
}

/**
 * Check if Chroma is connected
 */
export async function isChromaConnected(): Promise<boolean> {
  try {
    await getVectorStore();
    return true;
  } catch {
    return false;
  }
}
