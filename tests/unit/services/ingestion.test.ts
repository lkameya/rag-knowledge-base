import { parseDocument } from '../../../src/services/ingestion/documentParser';
import { chunkDocument } from '../../../src/services/ingestion/textChunker';
import { generateId } from '../../../src/utils/helpers';

// Mock file system
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

describe('Document Parsing', () => {
  test('should parse text file', async () => {
    const { promises: fs } = await import('fs/promises');
    (fs.readFile as jest.Mock).mockResolvedValue('This is test content');

    const documentId = generateId();
    const result = await parseDocument('/path/to/file.txt', 'test.txt', documentId);

    expect(result.id).toBe(documentId);
    expect(result.content).toBe('This is test content');
    expect(result.metadata.fileType).toBe('text');
  });

  test('should throw error for unsupported file type', async () => {
    await expect(
      parseDocument('/path/to/file.xyz', 'test.xyz', generateId())
    ).rejects.toThrow();
  });
});

describe('Text Chunking', () => {
  test('should chunk document into multiple chunks', async () => {
    const document = {
      id: generateId(),
      filename: 'test.txt',
      content: 'This is a long text that should be chunked into multiple pieces. '.repeat(50),
      metadata: {
        fileType: 'text',
      },
    };

    const chunks = await chunkDocument(document, document.id);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].metadata.documentId).toBe(document.id);
    expect(chunks[0].metadata.source).toBe(document.filename);
  });
});
