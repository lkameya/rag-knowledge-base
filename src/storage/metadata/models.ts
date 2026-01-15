export interface Document {
  id: string;
  filename: string;
  filepath: string;
  file_type: string;
  file_size: number | null;
  uploaded_at: string;
  processed_at: string | null;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  metadata_json: string | null;
}

export interface Chunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number: number | null;
  metadata_json: string | null;
  created_at: string;
}

export interface Query {
  id: string;
  query_text: string;
  response_time_ms: number | null;
  created_at: string;
}
