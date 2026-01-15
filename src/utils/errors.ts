export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(`Database error: ${message}`, 500);
  }
}

export class FileProcessingError extends AppError {
  constructor(message: string) {
    super(`File processing error: ${message}`, 422);
  }
}

export class VectorStoreError extends AppError {
  constructor(message: string) {
    super(`Vector store error: ${message}`, 500);
  }
}

export class EmbeddingError extends AppError {
  constructor(message: string) {
    super(`Embedding generation error: ${message}`, 500);
  }
}

export class LLMError extends AppError {
  constructor(message: string) {
    super(`LLM error: ${message}`, 500);
  }
}
