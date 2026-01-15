import dotenv from 'dotenv';
import { defaultConfig } from './defaults';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  ollama: {
    baseUrl: string;
    embeddingModel: string;
    llmModel: string;
  };
  chroma: {
    dbPath: string;
    collectionName: string;
  };
  sqlite: {
    dbPath: string;
  };
  upload: {
    dir: string;
    maxFileSize: number;
    allowedMimeTypes: string[];
  };
  chunking: {
    chunkSize: number;
    chunkOverlap: number;
  };
  cache: {
    ttl: number;
    maxSize: number;
  };
  logging: {
    level: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || String(defaultConfig.port), 10),
  nodeEnv: process.env.NODE_ENV || defaultConfig.nodeEnv,
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || defaultConfig.ollama.baseUrl,
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || defaultConfig.ollama.embeddingModel,
    llmModel: process.env.OLLAMA_LLM_MODEL || defaultConfig.ollama.llmModel,
  },
  chroma: {
    dbPath: process.env.CHROMA_DB_PATH || defaultConfig.chroma.dbPath,
    collectionName: defaultConfig.chroma.collectionName,
  },
  sqlite: {
    dbPath: process.env.SQLITE_DB_PATH || defaultConfig.sqlite.dbPath,
  },
  upload: {
    dir: process.env.UPLOAD_DIR || defaultConfig.upload.dir,
    maxFileSize: defaultConfig.upload.maxFileSize,
    allowedMimeTypes: defaultConfig.upload.allowedMimeTypes,
  },
  chunking: {
    chunkSize: parseInt(process.env.CHUNK_SIZE || String(defaultConfig.chunking.chunkSize), 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP || String(defaultConfig.chunking.chunkOverlap), 10),
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL || String(defaultConfig.cache.ttl), 10),
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || String(defaultConfig.cache.maxSize), 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || defaultConfig.logging.level,
  },
};
