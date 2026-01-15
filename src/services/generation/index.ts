import { ChatOllama } from '@langchain/ollama';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { retrieveDocuments } from '../retrieval';
import { buildSystemPrompt, buildUserPrompt } from './promptBuilder';
import { GenerationResult, GenerationOptions, Citation } from './types';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { getDatabase } from '../../storage/metadata/database';
import { queryCache } from '../cache';
import { statusTracker } from '../status/statusTracker';
import { generateId } from '../../utils/helpers';

let llm: ChatOllama | null = null;

/**
 * Initialize the LLM
 */
function getLLM(): ChatOllama {
  if (llm) {
    return llm;
  }

  llm = new ChatOllama({
    baseUrl: config.ollama.baseUrl,
    model: config.ollama.llmModel,
    temperature: 0.7,
  });

  logger.info('LLM initialized', {
    model: config.ollama.llmModel,
    baseUrl: config.ollama.baseUrl,
  });

  return llm;
}

/**
 * Generate answer using RAG
 */
export async function generateAnswer(
  question: string,
  options: GenerationOptions = {}
): Promise<GenerationResult> {
  const startTime = Date.now();
  const queryId = generateId();

  try {
    const {
      topK = 5,
      temperature = 0.7,
      maxTokens,
      filter,
      useCache = true,
    } = options;

    // Check cache first
    if (useCache) {
      const cacheKey = { topK, temperature, maxTokens, filter };
      const cached = queryCache.get(question, cacheKey);
      if (cached) {
        logger.info('Returning cached answer', { question });
        statusTracker.emitStatus({
          type: 'query',
          id: queryId,
          status: 'cached',
          message: 'Returning cached result',
          progress: 100,
        });
        return cached;
      }
    }

    logger.info('Generating answer', { question, topK, temperature, useCache });

    statusTracker.emitStatus({
      type: 'query',
      id: queryId,
      status: 'retrieving',
      message: 'Searching knowledge base',
      progress: 20,
    });

    // Step 1: Retrieve relevant documents
    let retrievalResults;
    try {
      // Only pass filter if it's a valid non-empty object
      const retrievalOptions: { topK: number; filter?: Record<string, any> } = {
        topK,
      };
      
      if (filter && typeof filter === 'object' && !Array.isArray(filter) && Object.keys(filter).length > 0) {
        retrievalOptions.filter = filter;
      }
      
      retrievalResults = await retrieveDocuments(question, retrievalOptions);
    } catch (retrievalError) {
      logger.error('Document retrieval failed', {
        error: retrievalError instanceof Error ? retrievalError.message : String(retrievalError),
        question,
      });
      statusTracker.emitStatus({
        type: 'query',
        id: queryId,
        status: 'error',
        message: 'Retrieval failed',
        progress: 0,
      });
      return {
        answer: "I encountered an error while searching the knowledge base. Please try again or rephrase your question.",
        citations: [],
        sources: [],
        metadata: {
          responseTime: Date.now() - startTime,
        },
      };
    }

    if (retrievalResults.length === 0) {
      logger.warn('No documents retrieved for query', { question });
      statusTracker.emitStatus({
        type: 'query',
        id: queryId,
        status: 'no_results',
        message: 'No relevant documents found',
        progress: 0,
      });
      return {
        answer: "I couldn't find any relevant information in the knowledge base to answer your question.",
        citations: [],
        sources: [],
        metadata: {
          responseTime: Date.now() - startTime,
        },
      };
    }

    statusTracker.emitStatus({
      type: 'query',
      id: queryId,
      status: 'generating',
      message: `Generating answer from ${retrievalResults.length} relevant chunks`,
      progress: 50,
    });

    // Step 2: Build prompts
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(retrievalResults, question);

    // Step 3: Initialize LLM with options
    const model = new ChatOllama({
      baseUrl: config.ollama.baseUrl,
      model: config.ollama.llmModel,
      temperature,
      ...(maxTokens && { numCtx: maxTokens }),
    });

    // Step 4: Create the chain
    const promptTemplate = PromptTemplate.fromTemplate(
      `{systemPrompt}\n\n{userPrompt}`
    );

    const chain = RunnableSequence.from([
      promptTemplate,
      model,
      new StringOutputParser(),
    ]);

    // Step 5: Generate answer
    statusTracker.emitStatus({
      type: 'query',
      id: queryId,
      status: 'llm_processing',
      message: 'LLM is generating answer',
      progress: 70,
    });

    const answer = await chain.invoke({
      systemPrompt,
      userPrompt,
    });

    // Step 6: Extract citations and sources
    const citations: Citation[] = retrievalResults.map((result) => ({
      source: result.metadata.source,
      page: result.metadata.page,
      chunkIndex: result.metadata.chunkIndex,
      content: result.chunk.pageContent.substring(0, 200), // First 200 chars
    }));

    const sources = Array.from(
      new Set(retrievalResults.map((r) => r.metadata.source))
    );

    const responseTime = Date.now() - startTime;

    logger.info('Answer generated successfully', {
      question,
      answerLength: answer.length,
      citationsCount: citations.length,
      responseTime,
    });

    // Step 6: Build result object
    const result: GenerationResult = {
      answer,
      citations,
      sources,
      metadata: {
        model: config.ollama.llmModel,
        responseTime,
      },
    };

    statusTracker.emitStatus({
      type: 'query',
      id: queryId,
      status: 'completed',
      message: 'Answer generated successfully',
      progress: 100,
      data: { responseTime, citationsCount: citations.length },
    });

    // Step 7: Cache the result
    if (useCache) {
      const cacheKey = { topK, temperature, maxTokens, filter };
      queryCache.set(question, result, cacheKey);
    }

    // Step 8: Store query in database (optional, for analytics)
    try {
      const db = await getDatabase();
      const { generateId } = await import('../../utils/helpers');
      db.prepare(
        'INSERT INTO queries (id, query_text, response_time_ms) VALUES (?, ?, ?)'
      ).run(generateId(), question, responseTime);
    } catch (error) {
      logger.warn('Failed to store query in database', { error });
      // Don't fail the request if query storage fails
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to generate answer', {
      error: errorMessage,
      question,
    });

    throw error;
  }
}
