import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { DocumentChunk, ParsedDocument } from './types';
import { generateId } from '../../utils/helpers';
import { config } from '../../config';
import { logger } from '../../utils/logger';

/**
 * Chunk a parsed document into smaller pieces
 */
export async function chunkDocument(
  document: ParsedDocument,
  documentId: string
): Promise<DocumentChunk[]> {
  try {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: config.chunking.chunkSize,
      chunkOverlap: config.chunking.chunkOverlap,
      separators: ['\n\n', '\n', '. ', ' ', ''],
    });

    // Split the document content
    const chunks = await splitter.createDocuments(
      [document.content],
      [document.metadata]
    );

    // Convert to DocumentChunk format
    const documentChunks: DocumentChunk[] = chunks.map((chunk, index) => ({
      id: generateId(),
      content: chunk.pageContent,
      metadata: {
        source: document.filename,
        chunkIndex: index,
        documentId,
        ...chunk.metadata,
      },
    }));

    logger.info('Document chunked', {
      documentId,
      filename: document.filename,
      chunksCreated: documentChunks.length,
    });

    return documentChunks;
  } catch (error) {
    logger.error('Failed to chunk document', { error, documentId });
    throw error;
  }
}
