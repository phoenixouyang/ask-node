import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ChromaClient, type EmbeddingFunction } from 'chromadb';

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

dotenv.config({
    path: path.resolve(__dirname, '../../.env'),
    quiet: true
});

// Custom embedding function using OpenRouter and the OpenAI text-embedding-3-small model
class OpenRouterEmbeddingFunction implements EmbeddingFunction {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'openai/text-embedding-3-small') {
    this.model = model;
    this.openai = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }

  async generate(texts: string[]): Promise<number[][]> {
    const response = await this.openai.embeddings.create({
      model: this.model,
      input: texts,
    });

    // Sort by index to maintain order (API may return in different order)
    const sorted = response.data.sort((a, b) => a.index - b.index);
    return sorted.map((item) => item.embedding);
  }
}

const client = new ChromaClient({
  host: 'localhost',
  port: 8000,
});

const { OPENROUTER_API_KEY } = process.env;
if (!OPENROUTER_API_KEY) {
  console.error('Missing OPENROUTER_API_KEY environment variable');
  process.exit(1);
}
const embeddingFunction = new OpenRouterEmbeddingFunction(OPENROUTER_API_KEY);

async function main() {
    const query = process.argv[2];
    if (!query) {
        console.error('Usage: npx ts-node query.ts "<your query>"');
        process.exit(1);
    }

    console.log(`\nQuery: "${query}"\n`);

        // Embed the query using the same model as indexing
    const embedding = await embeddingFunction.generate([query]);

    // Query Chroma
    const collection = await client.getCollection({ 
        name: 'node-docs',
        embeddingFunction
    });

    const results = await collection.query({
        queryEmbeddings: embedding,
        nResults: 5,
        include: ['documents', 'metadatas', 'distances'],
    });

    // Print results
    const documents = results.documents[0];
    const metadatas = results.metadatas[0];
    const distances = results.distances![0];
    const ids = results.ids[0];

    documents.forEach((doc, i) => {
        const similarity = (1 - (distances[i] ?? 0)).toFixed(4);
        const breadcrumb = (metadatas[i] as any)?.breadcrumb ?? 'N/A';
        console.log(`--- Result ${i + 1} (similarity: ${similarity}) ---`);
        console.log(`ID: ${ids[i]}`);
        console.log(`Breadcrumb: ${breadcrumb}`);
        console.log(`Excerpt: ${doc?.slice(0, 150)}...`);
        console.log();
    });
}

main();