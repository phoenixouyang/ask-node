# ask-node: RAG with ChromaDB

A CLI tool that answers questions about the Node.js API using **Retrieval Augmented Generation (RAG)**. It embeds the official Node.js documentation into a local vector database (Chroma), retrieves relevant chunks based on your query, and uses an LLM to generate a cited, grounded answer.

## Stack

- **Language:** TypeScript (Node.js)
- **Vector Database:** [Chroma](https://www.trychroma.com/) (run locally)
- **Embeddings:** `openai/text-embedding-3-small` via OpenRouter
- **LLM:** `google/gemini-2.0-flash-lite-preview` via OpenRouter

## Prerequisites

- Node.js (v18+)
- Python (for running the Chroma server)
- An [OpenRouter](https://openrouter.ai/) API key

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the directory:

```env
OPENROUTER_API_KEY=your_api_key_here
```

### 3. Start the Chroma server

Start the server (keep this terminal open):

```bash
chroma run --path ./chroma_db
```

### 5. Index the documentation

```bash
npx tsx indexer.ts
```

This will process and embed all `.md` files into Chroma. It may take a few minutes.

## Usage

### Ask a question

```bash
npx tsx ask-node.ts "How do I read a file?"
```

The tool will retrieve the most relevant documentation chunks and generate a cited answer. Retrieved sources are printed to `stderr`, and the answer is printed to `stdout`.

## Notes

- `chroma_db/` is excluded from git. You must run the indexer locally before using the app.
- The `.env` file is also excluded from git. Make sure to create it manually with your OpenRouter API key.


