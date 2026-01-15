import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../../config';
import { ensureDir } from '../../utils/helpers';
import { logger } from '../../utils/logger';
import { FileProcessingError } from '../../utils/errors';

/**
 * Save uploaded file to disk
 */
export async function saveFile(
  file: Express.Multer.File,
  documentId: string
): Promise<string> {
  try {
    await ensureDir(config.upload.dir);

    const fileExtension = path.extname(file.originalname);
    const filename = `${documentId}${fileExtension}`;
    const filepath = path.join(config.upload.dir, filename);

    await fs.writeFile(filepath, file.buffer);

    logger.info('File saved', { documentId, filename, filepath });
    return filepath;
  } catch (error) {
    logger.error('Failed to save file', { error, documentId });
    throw new FileProcessingError(`Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete file from disk
 */
export async function deleteFile(filepath: string): Promise<void> {
  try {
    await fs.unlink(filepath);
    logger.info('File deleted', { filepath });
  } catch (error) {
    // Ignore if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.error('Failed to delete file', { error, filepath });
      throw new FileProcessingError(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Get file stats
 */
export async function getFileStats(filepath: string): Promise<{ size: number; exists: boolean }> {
  try {
    const stats = await fs.stat(filepath);
    return { size: stats.size, exists: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { size: 0, exists: false };
    }
    throw error;
  }
}

/**
 * Validate file type
 */
export function validateFileType(mimetype: string): boolean {
  return config.upload.allowedMimeTypes.includes(mimetype);
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): boolean {
  return size <= config.upload.maxFileSize;
}
