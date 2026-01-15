export const defaultConfig = {
  port: 3000,
  nodeEnv: 'development',
  ollama: {
    baseUrl: 'http://localhost:11434',
    embeddingModel: 'nomic-embed-text',
    llmModel: 'llama3.2',
  },
  chroma: {
    dbPath: './chroma_db',
    collectionName: 'documents',
  },
  sqlite: {
    dbPath: './data/metadata.db',
  },
  upload: {
    dir: './uploads',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['application/pdf', 'text/markdown', 'text/plain'],
  },
  chunking: {
    chunkSize: 1000,
    chunkOverlap: 200,
  },
  cache: {
    ttl: 3600000, // 1 hour in milliseconds
    maxSize: 100,
  },
  logging: {
    level: 'info',
  },
} as const;
