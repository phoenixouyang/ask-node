import OpenAI from "openai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ChatCompletionMessage } from 'openai/resources/chat/completions';

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

interface ChatCompletionOptions {
  model: string;
  // Optional System Prompt
  messages: any[]
    // Optional array of tools (zodFunction objects)
  tools?: any[];
    // Optional response format (zodResponseFormat object)
  responseFormat?: any;
  // Defaults to OpenRouter endpoint if not provided
  apiUrl?: string;
  // Defaults to process.env.OPENROUTER_API_KEY if not provided
  apiKey?: string;
}

// set path to find .env file
dotenv.config({
    path: path.resolve(__dirname, '../../.env'),
    quiet: true
});

/**
 * Sends a chat completion request to OpenRouter using an options object.
 * 
 * @param options - Configuration options for the chat completion
 * @returns The response from the model as a string
 */
async function sendChatCompletion({
  model,
  messages,
  tools,
  responseFormat,
  apiUrl = "https://openrouter.ai/api/v1",
  apiKey = process.env.OPENROUTER_API_KEY,
}: ChatCompletionOptions): Promise<ChatCompletionMessage> {
  
  if (!apiKey) {
    throw new Error("API Key is required (passed or OPENROUTER_API_KEY env)");
  }

  // Initialize OpenAI client with OpenRouter configuration
  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: apiUrl,
  });

  try {
    const completion = await client.chat.completions.create({
      model: model,
      messages: messages,
      ...(responseFormat ? { response_format: responseFormat } : {}),
      ...(tools && tools.length > 0 ? {
        tools: tools,
        tool_choice: "auto"
      } : {})
    });

    // Extract and return the response content
    const message = completion.choices[0]?.message;

    if (!message) {
      throw new Error("No message received from the model");
    }
    return message;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`OpenRouter API Error: ${error.message}`);
    }
    throw new Error(`OpenRouter API Error: ${String(error)}`);
  }
}

export { sendChatCompletion, type ChatCompletionOptions };