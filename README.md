# RAG Knowledge Base

A production-ready Retrieval-Augmented Generation (RAG) backend service for document ingestion and question answering.

## 🛠️ Tech Stack

### Core Framework & Language

- **Node.js** - JavaScript runtime environment
- **TypeScript** - Type-safe JavaScript with modern features
- **Express.js** - Fast, minimalist web framework for Node.js

### AI & ML Stack

- **LangChain** - Framework for building LLM applications and orchestration
- **Ollama** - Local LLM runtime (using `llama3.2` for generation, `nomic-embed-text` for embeddings)
- **ChromaDB** - Open-source vector database for embeddings storage and similarity search

### Data Storage

- **SQLite** (via `better-sqlite3`) - Lightweight relational database for metadata storage
- **ChromaDB** - Vector database for semantic search and document retrieval

### Document Processing

- **pdf-parse** - PDF text extraction
- **marked** - Markdown parser
- **multer** - File upload handling middleware

### Caching & Performance

- **lru-cache** - In-memory LRU cache for query results

### Validation & Security

- **Zod** - TypeScript-first schema validation
- **CORS** - Cross-origin resource sharing middleware

### Observability & Logging

- **Winston** - Production-ready logging library with file and console transports

### Development Tools

- **ts-node-dev** - TypeScript development server with hot reload
- **Jest** - Testing framework
- **Supertest** - HTTP assertion library for API testing

### Infrastructure

- **Docker** - Containerization for ChromaDB server
- **Docker Compose** - Multi-container Docker application orchestration

### Frontend

- **Vanilla HTML/CSS/JavaScript** - Simple, lightweight web interface
- **Server-Sent Events (SSE)** - Real-time status updates

## 🏗️ Architecture Overview

The system follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    Web UI (Frontend)                     │
│              Real-time status via SSE                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Express.js REST API                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │Documents │  │  Query  │  │  Status  │  │  Health  │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼────┐ ┌─────▼─────┐ ┌───▼────────┐
│ Ingestion  │ │ Retrieval │ │ Generation │
│  Service   │ │  Service  │ │  Service   │
└───────┬────┘ └─────┬─────┘ └───┬────────┘
        │            │            │
        │    ┌───────▼────────────▼───────┐
        │    │      LangChain              │
        │    │   (Orchestration Layer)     │
        │    └───────┬────────────────────┘
        │            │
┌───────▼────────────▼────────────────────┐
│         Storage Layer                    │
│  ┌────────────┐      ┌──────────────┐   │
│  │  SQLite    │      │   ChromaDB   │   │
│  │ (Metadata) │      │  (Vectors)   │   │
│  └────────────┘      └──────────────┘   │
└──────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────┐
│         External Services                │
│  ┌────────────┐      ┌──────────────┐   │
│  │   Ollama   │      │   Docker     │   │
│  │  (LLM/     │      │  (ChromaDB   │   │
│  │ Embeddings)│      │   Server)    │   │
│  └────────────┘      └──────────────┘   │
└──────────────────────────────────────────┘
```

### Key Components

1. **Ingestion Pipeline**: Parses documents (PDF/MD/TXT) → Chunks text → Stores metadata in SQLite → Generates embeddings → Stores vectors in ChromaDB
2. **Retrieval Service**: Performs semantic search using ChromaDB to find relevant document chunks
3. **Generation Service**: Uses LangChain to orchestrate retrieval → prompt building → LLM generation → citation extraction
4. **Caching Layer**: LRU cache for frequently asked questions to improve response times
5. **Status Tracking**: Real-time event emission for monitoring document processing and query execution

## Features

- ✅ Document ingestion (PDF, Markdown, TXT)
- ✅ Vector embeddings with Chroma
- ✅ SQLite metadata storage
- ✅ LangChain orchestration
- ✅ Free local LLMs via Ollama
- ✅ In-memory LRU caching for queries
- ✅ RESTful API with comprehensive endpoints
- ✅ **Web UI with real-time status updates** 🎨
- ✅ Query analytics and history
- ✅ Error handling and validation
- ✅ Production-ready logging

## Prerequisites

- Node.js 18+ and npm
- Ollama installed and running locally
- TypeScript 5.3+
- Docker Desktop installed and running (for Chroma server)
  - Download: https://www.docker.com/products/docker-desktop/
  - **Important**: Docker Desktop must be running before starting Chroma

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:

   ```env
   PORT=3000
   NODE_ENV=development
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_EMBEDDING_MODEL=nomic-embed-text
   OLLAMA_LLM_MODEL=llama3.2
   CHROMA_SERVER_URL=http://localhost:8000
   CHROMA_DB_PATH=./chroma_db
   SQLITE_DB_PATH=./data/metadata.db
   UPLOAD_DIR=./uploads
   CHUNK_SIZE=1000
   CHUNK_OVERLAP=200
   CACHE_TTL=3600000
   CACHE_MAX_SIZE=100
   LOG_LEVEL=info
   ```

3. **Install Ollama models:**

   ```bash
   ollama pull nomic-embed-text
   ollama pull llama3.2
   ```

4. **Start Chroma server:**

   **⚠️ Important**: Make sure Docker Desktop is running first!

   **Option A: Using Docker Compose (Recommended - Easiest)**

   ```powershell
   # Windows PowerShell - Make sure Docker Desktop is running first!
   .\scripts\start-chroma.ps1

   # Or manually with docker-compose
   docker-compose up -d chroma
   ```

   **Linux/Mac:**

   ```bash
   chmod +x scripts/start-chroma.sh
   ./scripts/start-chroma.sh
   ```

   See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed instructions and troubleshooting.

   **Option B: Using Docker directly**

   ```bash
   docker run -d \
     --name rag-chroma \
     -p 8000:8000 \
     -v chroma_data:/chroma/chroma \
     chromadb/chroma:latest
   ```

   **Option C: Using Python (if you have Python installed)**

   ```bash
   pip install chromadb
   chroma run --path ./chroma_db --port 8000
   ```

   The Chroma server will run on `http://localhost:8000` by default.

   **Note**: If you encounter Python installation errors on Windows, use Docker (Option A or B) instead.

5. **Initialize database:**

   ```bash
   npm run setup-db
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

## Web Interface

Once the server is running, open your browser and navigate to:

```
http://localhost:3000
```

You'll see a beautiful web interface where you can:

- **Upload documents** via drag-and-drop or file browser
- **View real-time processing status** with progress indicators
- **Ask questions** and get answers with citations
- **View document list** and their processing status
- **Monitor backend activity** through the live status feed

The UI uses Server-Sent Events (SSE) to provide real-time updates on:

- Document upload and processing stages (parsing → chunking → storing → embedding → finalizing)
- Query processing stages (retrieving → generating → LLM processing → completed)
- Progress percentages and status messages

## API Endpoints

### Health Check

- `GET /api/health` - Check service health and connectivity
  - Returns: `{ status, timestamp, services: { sqlite, chroma, ollama } }`

### Document Management

#### Upload Document

- `POST /api/documents/upload`
  - **Content-Type**: `multipart/form-data`
  - **Body**: `file` (PDF, Markdown, or TXT file)
  - **Response**: `{ documentId, status: "pending", message }`
  - **Status Codes**:
    - `202` - Accepted (processing started)
    - `400` - Validation error (invalid file type/size)

#### List Documents

- `GET /api/documents`
  - **Query Parameters**:
    - `status` (optional): `pending` | `processing` | `processed` | `failed`
    - `limit` (optional): number (default: 10)
    - `offset` (optional): number (default: 0)
  - **Response**: `{ documents: [...], total, limit, offset }`

#### Get Document

- `GET /api/documents/:id`
  - **Response**: `{ id, filename, status, chunks, metadata }`
  - **Status Codes**: `200` - Success, `404` - Not found

#### Delete Document

- `DELETE /api/documents/:id`
  - **Response**: `{ success: true, message }`
  - **Status Codes**: `200` - Success, `404` - Not found

### Query Endpoints

#### Ask Question

- `POST /api/query`
  - **Content-Type**: `application/json`
  - **Body**:
    ```json
    {
      "query": "What is the main topic?",
      "topK": 5,
      "temperature": 0.7,
      "maxTokens": 1000,
      "useCache": true,
      "filter": { "source": "document.pdf" }
    }
    ```
  - **Response**:
    ```json
    {
      "answer": "The answer...",
      "citations": [
        {
          "source": "document.pdf",
          "page": 5,
          "chunkIndex": 2,
          "content": "First 200 chars..."
        }
      ],
      "sources": ["document.pdf"],
      "metadata": {
        "model": "llama3.2",
        "responseTime": 1234
      }
    }
    ```
  - **Status Codes**: `200` - Success, `400` - Validation error

#### Query History

- `GET /api/query/history`
  - **Query Parameters**: `limit` (optional, default: 20)
  - **Response**: `{ queries: [...] }`

#### Cache Management

- `GET /api/query/cache/stats` - Get cache statistics
  - **Response**: `{ size, maxSize }`
- `DELETE /api/query/cache` - Clear cache
  - **Response**: `{ success: true, message }`

### Status Endpoints (Real-Time Updates)

#### Status Stream (Server-Sent Events)

- `GET /api/status/stream` - Real-time status updates via SSE
  - **Content-Type**: `text/event-stream`
  - **Response**: Server-Sent Events stream with status updates
  - **Event Format**:
    ```json
    {
      "type": "document" | "query" | "system",
      "id": "document-id-or-query-id",
      "status": "processing" | "parsing" | "chunking" | "embedding" | "processed" | "failed" | "retrieving" | "generating" | "completed",
      "message": "Human-readable status message",
      "progress": 0-100,
      "data": { /* optional additional data */ },
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
    ```

#### Get Status

- `GET /api/status/:id` - Get current status for a specific ID
  - **Response**: Status event object or `404` if not found

#### Get Recent Status Events

- `GET /api/status` - Get recent status events
  - **Query Parameters**: `limit` (optional, default: 50)
  - **Response**: `{ events: [...] }`

### Root

- `GET /` - Serves the web UI (HTML interface)

## Project Structure

```
rag-knowledge-base/
├── src/
│   ├── config/          # Configuration management
│   ├── services/        # Business logic (ingestion, retrieval, generation)
│   ├── storage/         # Database and vector store
│   ├── api/             # Express routes and middleware
│   └── utils/           # Utilities and helpers
├── scripts/             # Setup and utility scripts
├── tests/               # Test files
└── dist/                # Compiled JavaScript (generated)
```

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run setup-db` - Initialize database schema

## Usage Example

### 1. Upload a Document

```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -F "file=@your-document.pdf"
```

### 2. Check Document Status

```bash
curl http://localhost:3000/api/documents?status=processed
```

### 3. Ask a Question

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the main topic?",
    "topK": 5,
    "useCache": true
  }'
```

### 4. Check Cache Stats

```bash
curl http://localhost:3000/api/query/cache/stats
```

## License

MIT
