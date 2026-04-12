import axios, { AxiosInstance } from 'axios';

interface OpenRouterConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

interface CodeCompletionRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{ text: string; finish_reason: string; }>; 
  usage: { prompt_tokens: number; completion_tokens: number; };
}

class OpenRouterClient {
  private client: AxiosInstance;
  private model: string;

  constructor(config: OpenRouterConfig) {
    this.model = config.model || 'openrouter/auto';
    
    this.client = axios.create({
      baseURL: config.baseUrl || 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://app-with-ai.example.com',
      },
    });
  }

  async getCodeCompletion(request: CodeCompletionRequest): Promise<string> {
    try {
      const response = await this.client.post<OpenRouterResponse>(
        '/completions',
        {
          model: this.model,
          prompt: request.prompt,
          max_tokens: request.maxTokens || 2048,
          temperature: request.temperature || 0.7,
        }
      );

      return response.data.choices[0]?.text || '';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenRouter API Error: ${error.response?.status} - ${error.response?.data}`);
      }
      throw error;
    }
  }

  async getChatCompletion(messages: Array<{ role: string; content: string }>) {
    try {
      const response = await this.client.post(
        '/chat/completions',
        {
          model: this.model,
          messages,
          temperature: 0.7,
        }
      );

      return response.data.choices[0]?.message?.content || '';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenRouter API Error: ${error.response?.status} - ${error.response?.data}`);
      }
      throw error;
    }
  }
}

export default OpenRouterClient;