import { RetrievalResult } from '../retrieval/types';

const SYSTEM_PROMPT = `You are a helpful assistant that answers questions based on provided context documents.
Always cite your sources using the format: [Source: {filename}, Page: {page}]
If the context doesn't contain enough information to answer the question, say so clearly.
Be concise and accurate. Use the provided context to answer the question.`;

/**
 * Build the system prompt
 */
export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

/**
 * Build the user prompt with context and question
 */
export function buildUserPrompt(
  contextChunks: RetrievalResult[],
  question: string
): string {
  let prompt = 'Context:\n\n';

  // Add each chunk with its citation
  contextChunks.forEach((result, index) => {
    const { chunk, metadata } = result;
    const source = metadata.source || 'unknown';
    const page = metadata.page;

    prompt += `[${index + 1}] ${chunk.pageContent}\n`;
    prompt += `[Source: ${source}`;
    if (page !== undefined && page !== null) {
      prompt += `, Page: ${page}`;
    }
    prompt += ']\n\n';
  });

  prompt += `Question: ${question}\n\n`;
  prompt += 'Answer:';

  return prompt;
}

/**
 * Extract citations from the answer text
 */
export function extractCitations(answer: string): Array<{ source: string; page?: number }> {
  const citationRegex = /\[Source:\s*([^,]+)(?:,\s*Page:\s*(\d+))?\]/g;
  const citations: Array<{ source: string; page?: number }> = [];
  let match;

  while ((match = citationRegex.exec(answer)) !== null) {
    citations.push({
      source: match[1].trim(),
      page: match[2] ? parseInt(match[2], 10) : undefined,
    });
  }

  return citations;
}
