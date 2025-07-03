import OpenAI from 'openai';

// Constants
const OPENAI_MODELS = {
  EMBEDDING: 'text-embedding-ada-002',
  CHAT: 'gpt-4o-mini',
} as const;

const DEFAULTS = {
  TEMPERATURE: 0.7,
  MAX_TOKENS: 2000,
} as const;

const ERROR_MESSAGES = {
  EMBEDDING_FAILED: 'Failed to generate embedding',
  EMBEDDINGS_FAILED: 'Failed to generate embeddings',
  CHAT_FAILED: 'Failed to generate chat response',
  INVALID_INPUT: 'Invalid input provided',
} as const;

// Types
export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

interface EmbeddingRequestOptions {
  model: string;
  input: string | string[];
}

// OpenAI Client Setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper functions
const validateInput = (input: string | string[]): void => {
  if (!input || (Array.isArray(input) && input.length === 0)) {
    throw new Error(ERROR_MESSAGES.INVALID_INPUT);
  }
  
  if (Array.isArray(input) && input.some(text => !text || typeof text !== 'string')) {
    throw new Error(ERROR_MESSAGES.INVALID_INPUT);
  }
  
  if (typeof input === 'string' && input.trim().length === 0) {
    throw new Error(ERROR_MESSAGES.INVALID_INPUT);
  }
};

const createEmbeddingOptions = (input: string | string[]): EmbeddingRequestOptions => ({
  model: OPENAI_MODELS.EMBEDDING,
  input,
});

const createChatCompletionOptions = (
  messages: ChatMessage[],
  tools?: ChatTool[],
  temperature: number = DEFAULTS.TEMPERATURE
) => ({
  model: OPENAI_MODELS.CHAT,
  messages,
  tools,
  tool_choice: tools ? 'auto' as const : undefined,
  temperature,
  max_tokens: DEFAULTS.MAX_TOKENS,
});

const handleOpenAIError = (error: any, message: string): never => {
  console.error(`OpenAI API Error - ${message}:`, error);
  throw new Error(message);
};

// Main API functions
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    validateInput(text);
    
    const options = createEmbeddingOptions(text);
    const response = await openai.embeddings.create(options);

    return response.data[0].embedding;
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_MESSAGES.INVALID_INPUT) {
      throw error;
    }
    return handleOpenAIError(error, ERROR_MESSAGES.EMBEDDING_FAILED);
  }
}

export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  try {
    validateInput(texts);
    
    const options = createEmbeddingOptions(texts);
    const response = await openai.embeddings.create(options);

    return response.data.map((item, index) => ({
      embedding: item.embedding,
      text: texts[index]
    }));
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_MESSAGES.INVALID_INPUT) {
      throw error;
    }
    return handleOpenAIError(error, ERROR_MESSAGES.EMBEDDINGS_FAILED);
  }
}

export async function chatCompletion(
  messages: ChatMessage[],
  tools?: ChatTool[],
  temperature: number = DEFAULTS.TEMPERATURE
) {
  try {
    if (!messages || messages.length === 0) {
      throw new Error(ERROR_MESSAGES.INVALID_INPUT);
    }

    const options = createChatCompletionOptions(messages, tools, temperature);
    const response = await openai.chat.completions.create(options);

    return response;
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_MESSAGES.INVALID_INPUT) {
      throw error;
    }
    return handleOpenAIError(error, ERROR_MESSAGES.CHAT_FAILED);
  }
}

// Export the client for advanced usage
export { openai };
