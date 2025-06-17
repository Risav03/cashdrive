import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EmbeddingResult {
  embedding: number[];
  text: string;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

export async function generateEmbeddings(texts: string[]): Promise<EmbeddingResult[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: texts,
    });

    return response.data.map((item, index) => ({
      embedding: item.embedding,
      text: texts[index]
    }));
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw new Error('Failed to generate embeddings');
  }
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

export async function chatCompletion(
  messages: ChatMessage[],
  tools?: ChatTool[],
  temperature: number = 0.7
) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: tools ? "auto" : undefined,
      temperature,
      max_tokens: 2000
    });

    return response;
  } catch (error) {
    console.error('Error in chat completion:', error);
    throw new Error('Failed to generate chat response');
  }
}

export { openai };
