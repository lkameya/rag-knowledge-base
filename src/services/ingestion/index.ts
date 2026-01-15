import { Document } from 'langchain/document';
import { getDatabase } from '../../storage/metadata/database';
import { parseDocument } from './documentParser';
import { chunkDocument } from './textChunker';
import {
  addDocumentsToVectorStore,
  getVectorStore,
} from '../../storage/vector/chromaClient';
import { DocumentChunk, IngestionResult } from './types';
import { generateId } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import { DatabaseError } from '../../utils/errors';
import { Document as DocModel } from '../../storage/metadata/models';

/**
 * Process and ingest a document
 */
export async function ingestDocument(
  filepath: string,
  filename: string,
  documentId: string
): Promise<IngestionResult> {
  const db = await getDatabase();
  const startTime = Date.now();

  try {
    // Update document status to processing
    db.prepare(
      'UPDATE documents SET status = ?, processed_at = ? WHERE id = ?'
    ).run('processing', new Date().toISOString(), documentId);

    // Step 1: Parse document
    logger.info('Step 1: Parsing document', { documentId, filename, filepath });
    const parsedDoc = await parseDocument(filepath, filename, documentId);
    logger.info('Document parsed successfully', { 
      documentId, 
      contentLength: parsedDoc.content.length,
      metadata: parsedDoc.metadata 
    });

    // Step 2: Chunk document
    logger.info('Step 2: Chunking document', { documentId });
    const chunks = await chunkDocument(parsedDoc, documentId);
    logger.info('Document chunked successfully', { 
      documentId, 
      chunkCount: chunks.length,
      chunkSizes: chunks.map(c => c.content.length)
    });

    if (chunks.length === 0) {
      throw new Error('No chunks created from document');
    }

    // Step 3: Store chunks in SQLite
    logger.info('Step 3: Storing chunks in SQLite', { documentId, chunkCount: chunks.length });
    const insertChunk = db.prepare(`
      INSERT INTO chunks (id, document_id, chunk_index, content, page_number, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertChunks = db.transaction((chunks: DocumentChunk[]) => {
      for (const chunk of chunks) {
        insertChunk.run(
          chunk.id,
          chunk.metadata.documentId,
          chunk.metadata.chunkIndex,
          chunk.content,
          chunk.metadata.page || null,
          JSON.stringify(chunk.metadata)
        );
      }
    });

    insertChunks(chunks);
    logger.info('Chunks stored in SQLite successfully', { documentId, chunkCount: chunks.length });

    // Step 4: Create embeddings and store in Chroma
    logger.info('Step 4: Creating embeddings and storing in Chroma', { documentId, chunkCount: chunks.length });
    const langchainDocs = chunks.map(
      (chunk) =>
        new Document({
          pageContent: chunk.content,
          metadata: chunk.metadata,
        })
    );

    logger.info('Calling addDocumentsToVectorStore', { documentId, docCount: langchainDocs.length });
    const vectorIds = await addDocumentsToVectorStore(langchainDocs);
    logger.info('Documents added to vector store successfully', { 
      documentId, 
      vectorIdsCount: vectorIds.length 
    });

    // Step 5: Update document status to processed
    const processedAt = new Date().toISOString();
    db.prepare(
      'UPDATE documents SET status = ?, processed_at = ? WHERE id = ?'
    ).run('processed', processedAt, documentId);

    const duration = Date.now() - startTime;
    logger.info('Document ingestion completed', {
      documentId,
      chunksCreated: chunks.length,
      duration: `${duration}ms`,
    });

    return {
      documentId,
      chunksCreated: chunks.length,
      status: 'success',
    };
  } catch (error) {
    // Update document status to failed
    db.prepare('UPDATE documents SET status = ? WHERE id = ?').run('failed', documentId);

    // Better error logging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Document ingestion failed', {
      documentId,
      error: errorMessage,
      stack: errorStack,
      errorType: error?.constructor?.name || typeof error,
    });
    
    return {
      documentId,
      chunksCreated: 0,
      status: 'failed',
      error: errorMessage,
    };
  }
}

/**
 * Create document record in database
 */
export async function createDocumentRecord(
  filename: string,
  filepath: string,
  fileType: string,
  fileSize: number
): Promise<string> {
  const db = await getDatabase();
  const documentId = generateId();

  try {
    db.prepare(
      `INSERT INTO documents (id, filename, filepath, file_type, file_size, status)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(documentId, filename, filepath, fileType, fileSize, 'pending');

    logger.info('Document record created', { documentId, filename });
    return documentId;
  } catch (error) {
    logger.error('Failed to create document record', { error });
    throw new DatabaseError('Failed to create document record');
  }
}

/**
 * Get document by ID
 */
export async function getDocumentById(documentId: string): Promise<DocModel | null> {
  const db = await getDatabase();
  const doc = db
    .prepare('SELECT * FROM documents WHERE id = ?')
    .get(documentId) as DocModel | undefined;

  return doc || null;
}

/**
 * Get all documents with pagination
 */
export async function getAllDocuments(
  status?: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ documents: DocModel[]; total: number }> {
  const db = await getDatabase();

  let query = 'SELECT * FROM documents';
  let countQuery = 'SELECT COUNT(*) as total FROM documents';
  const params: any[] = [];

  if (status) {
    query += ' WHERE status = ?';
    countQuery += ' WHERE status = ?';
    params.push(status);
  }

  query += ' ORDER BY uploaded_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const documents = db.prepare(query).all(...params) as DocModel[];
  const total = (db.prepare(countQuery).get(...(status ? [status] : [])) as { total: number })
    .total;

  return { documents, total };
}

/**
 * Delete document and all its chunks
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const db = await getDatabase();

  try {
    // Get all chunk IDs for this document
    const chunks = db
      .prepare('SELECT id FROM chunks WHERE document_id = ?')
      .all(documentId) as { id: string }[];

    const chunkIds = chunks.map((c) => c.id);

    // Delete from Chroma vector store
    if (chunkIds.length > 0) {
      const { deleteDocumentsFromVectorStore } = await import(
        '../../storage/vector/chromaClient'
      );
      await deleteDocumentsFromVectorStore(chunkIds);
    }

    // Delete from SQLite (chunks will be deleted via CASCADE)
    db.prepare('DELETE FROM documents WHERE id = ?').run(documentId);

    logger.info('Document deleted', { documentId, chunksDeleted: chunkIds.length });
  } catch (error) {
    logger.error('Failed to delete document', { error, documentId });
    throw new DatabaseError('Failed to delete document');
  }
}
