import { promises as fs } from 'fs';
import pdfParse from 'pdf-parse';
import { marked } from 'marked';
import path from 'path';
import { ParsedDocument } from './types';
import { logger } from '../../utils/logger';
import { FileProcessingError } from '../../utils/errors';

/**
 * Parse PDF document
 */
export async function parsePDF(filepath: string, filename: string, documentId: string): Promise<ParsedDocument> {
  try {
    const buffer = await fs.readFile(filepath);
    const data = await pdfParse(buffer);

    const document: ParsedDocument = {
      id: documentId,
      filename,
      content: data.text,
      metadata: {
        fileType: 'pdf',
        pageCount: data.numpages,
        info: data.info,
      },
    };

    logger.info('PDF parsed', { filename, pages: data.numpages });
    return document;
  } catch (error) {
    logger.error('Failed to parse PDF', { error, filepath });
    throw new FileProcessingError(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse Markdown document
 */
export async function parseMarkdown(filepath: string, filename: string, documentId: string): Promise<ParsedDocument> {
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    
    // Extract headings from markdown
    const headings: string[] = [];
    const tokens = marked.lexer(content);
    for (const token of tokens) {
      if (token.type === 'heading') {
        headings.push(token.text);
      }
    }

    const document: ParsedDocument = {
      id: documentId,
      filename,
      content,
      metadata: {
        fileType: 'markdown',
        headings,
      },
    };

    logger.info('Markdown parsed', { filename, headings: headings.length });
    return document;
  } catch (error) {
    logger.error('Failed to parse Markdown', { error, filepath });
    throw new FileProcessingError(`Failed to parse Markdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse plain text document
 */
export async function parseText(filepath: string, filename: string, documentId: string): Promise<ParsedDocument> {
  try {
    const content = await fs.readFile(filepath, 'utf-8');

    const document: ParsedDocument = {
      id: documentId,
      filename,
      content,
      metadata: {
        fileType: 'text',
      },
    };

    logger.info('Text file parsed', { filename });
    return document;
  } catch (error) {
    logger.error('Failed to parse text file', { error, filepath });
    throw new FileProcessingError(`Failed to parse text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse document based on file type
 */
export async function parseDocument(filepath: string, filename: string, documentId: string): Promise<ParsedDocument> {
  const extension = path.extname(filename).toLowerCase();

  switch (extension) {
    case '.pdf':
      return parsePDF(filepath, filename, documentId);
    case '.md':
    case '.markdown':
      return parseMarkdown(filepath, filename, documentId);
    case '.txt':
      return parseText(filepath, filename, documentId);
    default:
      throw new FileProcessingError(`Unsupported file type: ${extension}`);
  }
}
