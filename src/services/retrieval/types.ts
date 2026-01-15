import { Document } from 'langchain/document';

export interface RetrievalResult {
  chunk: Document;
  score: number;
  metadata: {
    source: string;
    page?: number;
    chunkIndex: number;
    documentId: string;
    [key: string]: any;
  };
}

export interface RetrievalOptions {
  topK?: number;
  filter?: Record<string, any>;
  minScore?: number;
}
