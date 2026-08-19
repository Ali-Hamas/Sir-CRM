import { Injectable, Logger } from '@nestjs/common';
import {
  ProviderAdapter,
  AIExecutionOptions,
  AIExecutionResult,
} from './provider-adapter.interface';

@Injectable()
export class ClaudeAdapter implements ProviderAdapter {
  readonly providerType = 'ANTHROPIC';
  private readonly logger = new Logger(ClaudeAdapter.name);

  private readonly pricing: Record<string, { prompt: number; completion: number }> = {
    'claude-3-5-sonnet-20240620': { prompt: 0.003, completion: 0.015 },
    'claude-3-haiku-20240307': { prompt: 0.00025, completion: 0.00125 },
    'claude-3-opus-20240229': { prompt: 0.015, completion: 0.075 },
  };

  async execute(
    model: string,
    apiKey: string | null,
    baseUrl: string | null,
    options: AIExecutionOptions,
  ): Promise<AIExecutionResult> {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    const url = (baseUrl || 'https://api.anthropic.com/v1').replace(/\/$/, '') + '/messages';

    if (!key) {
      throw new Error('Anthropic Claude API Key not configured in system or environment');
    }

    let systemContent = options.systemPrompt || 'You are an enterprise AI assistant for Britsync.';
    if (options.ragContext && options.ragContext.length > 0) {
      systemContent += '\n\n### RETRIEVED KNOWLEDGE CONTEXT:\n' + options.ragContext.join('\n---\n');
    }
    if (options.memories && options.memories.length > 0) {
      systemContent += '\n\n### USER & WORKSPACE MEMORIES:\n' + options.memories.join('\n');
    }

    const messages: any[] = [];
    if (options.messages && options.messages.length > 0) {
      for (const msg of options.messages) {
        if (msg.role !== 'system') {
          messages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content,
          });
        }
      }
    }

    if (messages.length === 0) {
      messages.push({ role: 'user', content: 'Hello' });
    }

    const body: any = {
      model: model || 'claude-3-5-sonnet-20240620',
      messages,
      system: systemContent,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
    };

    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || 20000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
      }

      const json = await response.json();
      const textBlock = json.content?.find((c: any) => c.type === 'text');
      const content = textBlock?.text || '';
      const usage = json.usage || {};

      const promptTokens = usage.input_tokens || Math.ceil(systemContent.length / 4);
      const completionTokens = usage.output_tokens || Math.ceil(content.length / 4);
      const totalTokens = promptTokens + completionTokens;

      const rate = this.pricing[model] || { prompt: 0.003, completion: 0.015 };
      const estimatedCost = (promptTokens / 1000) * rate.prompt + (completionTokens / 1000) * rate.completion;

      return {
        content,
        provider: 'ANTHROPIC',
        model: model || 'claude-3-5-sonnet-20240620',
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
        latencyMs,
        finishReason: json.stop_reason || 'stop',
      };
    } catch (err: any) {
      clearTimeout(timer);
      this.logger.error(`Claude Execution failed: ${err.message}`);
      throw err;
    }
  }
}
