export interface ParsedDocument {
  id: string;
  filename: string;
  content: string;
  metadata: {
    fileType: string;
    pageCount?: number;
    headings?: string[];
    [key: string]: any;
  };
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    page?: number;
    chunkIndex: number;
    documentId: string;
    [key: string]: any;
  };
  embedding?: number[];
}

export interface IngestionResult {
  documentId: string;
  chunksCreated: number;
  status: 'success' | 'failed';
  error?: string;
}
