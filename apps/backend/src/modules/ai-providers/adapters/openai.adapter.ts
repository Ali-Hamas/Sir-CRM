import { Injectable, Logger } from '@nestjs/common';
import {
  ProviderAdapter,
  AIExecutionOptions,
  AIExecutionResult,
  AIMessageInput,
} from './provider-adapter.interface';

@Injectable()
export class OpenAIAdapter implements ProviderAdapter {
  readonly providerType = 'OPENAI';
  private readonly logger = new Logger(OpenAIAdapter.name);

  // Approximate cost per 1k tokens
  private readonly pricing: Record<string, { prompt: number; completion: number }> = {
    'gpt-4o': { prompt: 0.0025, completion: 0.01 },
    'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
    'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
    'o1-preview': { prompt: 0.015, completion: 0.06 },
  };

  async execute(
    model: string,
    apiKey: string | null,
    baseUrl: string | null,
    options: AIExecutionOptions,
  ): Promise<AIExecutionResult> {
    const key = apiKey || process.env.OPENAI_API_KEY;
    const url = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '') + '/chat/completions';

    if (!key) {
      throw new Error('OpenAI API Key not configured in system or environment');
    }

    const messages: any[] = [];

    // Combine system prompt, RAG context, and memories
    let systemContent = options.systemPrompt || 'You are an enterprise AI assistant for Britsync.';
    if (options.ragContext && options.ragContext.length > 0) {
      systemContent += '\n\n### RETRIEVED KNOWLEDGE CONTEXT:\n' + options.ragContext.join('\n---\n');
    }
    if (options.memories && options.memories.length > 0) {
      systemContent += '\n\n### USER & WORKSPACE MEMORIES:\n' + options.memories.join('\n');
    }

    messages.push({ role: 'system', content: systemContent });

    if (options.messages && options.messages.length > 0) {
      for (const msg of options.messages) {
        if (msg.imageUrl) {
          messages.push({
            role: msg.role,
            content: [
              { type: 'text', text: msg.content },
              { type: 'image_url', image_url: { url: msg.imageUrl } },
            ],
          });
        } else {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    const body: any = {
      model: model || 'gpt-4o',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    };

    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.presencePenalty !== undefined) body.presence_penalty = options.presencePenalty;
    if (options.frequencyPenalty !== undefined) body.frequency_penalty = options.frequencyPenalty;
    if (options.jsonMode) body.response_format = { type: 'json_object' };

    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || 20000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
      }

      const json = await response.json();
      const choice = json.choices?.[0];
      const content = choice?.message?.content || '';
      const usage = json.usage || {};

      const promptTokens = usage.prompt_tokens || Math.ceil(JSON.stringify(messages).length / 4);
      const completionTokens = usage.completion_tokens || Math.ceil(content.length / 4);
      const totalTokens = usage.total_tokens || promptTokens + completionTokens;

      const rate = this.pricing[model] || { prompt: 0.0025, completion: 0.01 };
      const estimatedCost = (promptTokens / 1000) * rate.prompt + (completionTokens / 1000) * rate.completion;

      return {
        content,
        provider: 'OPENAI',
        model: model || 'gpt-4o',
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
        latencyMs,
        finishReason: choice?.finish_reason || 'stop',
      };
    } catch (err: any) {
      clearTimeout(timer);
      this.logger.error(`OpenAI Execution failed: ${err.message}`);
      throw err;
    }
  }
}
