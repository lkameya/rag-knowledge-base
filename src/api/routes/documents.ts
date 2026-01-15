import { Router, Request, Response } from 'express';
import multer from 'multer';
import { config } from '../../config';
import {
  createDocumentRecord,
  ingestDocument,
  getDocumentById,
  getAllDocuments,
  deleteDocument,
} from '../../services/ingestion';
import { saveFile, deleteFile, validateFileType, validateFileSize } from '../../storage/files/fileManager';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { statusTracker } from '../../services/status/statusTracker';
import { z } from 'zod';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: (req, file, cb) => {
    if (validateFileType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ValidationError(`Invalid file type: ${file.mimetype}`));
    }
  },
});

/**
 * Upload document
 * POST /api/documents/upload
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      throw new ValidationError('No file provided. Please include a file in the request.');
    }

    const file = req.file;

    // Validate file type
    if (!validateFileType(file.mimetype)) {
      throw new ValidationError(
        `Invalid file type: ${file.mimetype}. Allowed types: ${config.upload.allowedMimeTypes.join(', ')}`
      );
    }

    // Validate file size
    if (!validateFileSize(file.size)) {
      const maxSizeMB = (config.upload.maxFileSize / (1024 * 1024)).toFixed(2);
      throw new ValidationError(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds maximum of ${maxSizeMB}MB`
      );
    }

    // Validate filename
    if (!file.originalname || file.originalname.trim().length === 0) {
      throw new ValidationError('Filename is required');
    }

    // Create document record
    const documentId = await createDocumentRecord(
      file.originalname,
      '', // Will be set after saving
      file.mimetype,
      file.size
    );

    // Emit initial status
    statusTracker.emitStatus({
      type: 'document',
      id: documentId,
      status: 'uploaded',
      message: 'File uploaded, starting processing',
      progress: 5,
    });

    // Save file to disk
    const filepath = await saveFile(file, documentId);

    // Update document record with filepath
    const db = await import('../../storage/metadata/database').then((m) => m.getDatabase());
    db.prepare('UPDATE documents SET filepath = ? WHERE id = ?').run(filepath, documentId);

    // Process document asynchronously
    ingestDocument(filepath, file.originalname, documentId).catch((error) => {
      logger.error('Background ingestion failed', { error, documentId });
    });

    res.status(202).json({
      documentId,
      status: 'pending',
      message: 'Document uploaded and processing started',
    });
  } catch (error) {
    logger.error('Document upload failed', { error });
    throw error;
  }
});

/**
 * List all documents
 * GET /api/documents
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const querySchema = z.object({
      status: z.enum(['pending', 'processing', 'processed', 'failed']).optional(),
      limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
      offset: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 0)),
    });

    const { status, limit, offset } = querySchema.parse(req.query);
    const result = await getAllDocuments(status, limit, offset);

    res.json({
      documents: result.documents,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to list documents', { error });
    throw error;
  }
});

/**
 * Get document by ID
 * GET /api/documents/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const document = await getDocumentById(req.params.id);

    if (!document) {
      throw new NotFoundError('Document');
    }

    // Get chunks for this document
    const db = await import('../../storage/metadata/database').then((m) => m.getDatabase());
    const chunks = db
      .prepare('SELECT * FROM chunks WHERE document_id = ? ORDER BY chunk_index')
      .all(req.params.id);

    res.json({
      ...document,
      chunks: chunks.length,
    });
  } catch (error) {
    logger.error('Failed to get document', { error, documentId: req.params.id });
    throw error;
  }
});

/**
 * Delete document
 * DELETE /api/documents/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const document = await getDocumentById(req.params.id);

    if (!document) {
      throw new NotFoundError('Document');
    }

    // Delete file from disk
    if (document.filepath) {
      await deleteFile(document.filepath);
    }

    // Delete document and chunks from database and vector store
    await deleteDocument(req.params.id);

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete document', { error, documentId: req.params.id });
    throw error;
  }
});

export default router;
