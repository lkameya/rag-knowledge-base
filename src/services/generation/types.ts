export interface Citation {
  source: string;
  page?: number;
  chunkIndex: number;
  content: string;
}

export interface GenerationResult {
  answer: string;
  citations: Citation[];
  sources: string[];
  metadata?: {
    model?: string;
    tokensUsed?: number;
    responseTime?: number;
  };
}

export interface GenerationOptions {
  topK?: number;
  temperature?: number;
  maxTokens?: number;
  filter?: Record<string, any>;
  useCache?: boolean;
}
