import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ChromaClient, type EmbeddingFunction } from 'chromadb';
import { sendChatCompletion, type ChatCompletionOptions } from "./chat-completion.ts"

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

const inferenceModel = 'google/gemini-3.1-flash-lite-preview';

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
        console.error('Please ask a Node.js related question in this format: npx ts-node ask-node.ts "<your Node.js query>"');
        process.exit(1);
    }

    // Embed the query using the same model as indexing
    const embedding = await embeddingFunction.generate([query]);

    // Query Chroma
    const collection = await client.getCollection({ 
        name: 'node-docs',
        embeddingFunction
    });

    const results = await collection.query({
        queryEmbeddings: embedding,
        nResults: 3, // get the top 3 related results
        include: ['documents', 'metadatas', 'distances'],
    });

    // Print results
    const documents = results.documents[0];
    const metadatas = results.metadatas[0];

    let sysPrompt = `You are ask-node, an expert Node.js documentation assistant that operates on the command line. You answer questions strictly based on the official Node.js documentation excerpts provided to you.

Instructions:
1. Answer the user's question using **ONLY** the provided context. Do not use outside knowledge.
1. You are a command-line application. Format your response in plain text.
1. Be concise and technical. The user is a developer — skip unnecessary explanations.
1. Always cite your source(s) at the end using the source and breadcrumb (e.g., Source: fs.md > readFile). If you did not use the source, **DO NOT INCLUDE IT**.
1. If the context does not contain enough information to answer the question, say: "I don't have enough information in the provided documentation to answer that." Do not guess or infer beyond what is given.
1. If the question is unrelated to Node.js, say: "Sorry, I can only help with Node.js related questions."


Here is the relevant official documentation context:
<context>
`

    documents.forEach((doc, i) => {
        const source = (metadatas[i] as any)?.source ?? 'N/A';
        const breadcrumb = (metadatas[i] as any)?.breadcrumb ?? 'N/A';
        const docTags = `<doc source="${source}" breadcrumb="${breadcrumb}">
    ${doc}        
</doc>
`

        sysPrompt += docTags
        // console.error(docTags);
    });
    sysPrompt += "</context>";

    var messages: any[] = [
        { "role": "system" as const, "content": sysPrompt },
        { "role": "user" as const, "content": query }
    ];

    const response = await sendChatCompletion({ model: inferenceModel, messages: messages })
    const answer = response.content;
    console.log(`================== ${query} ==================`)
    console.log(`********************* ANSWER *********************`)
    console.log(answer);
    console.log(`**************************************************`)
}

main();