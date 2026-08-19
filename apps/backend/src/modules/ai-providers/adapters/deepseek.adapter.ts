import { Injectable, Logger } from '@nestjs/common';
import {
  ProviderAdapter,
  AIExecutionOptions,
  AIExecutionResult,
} from './provider-adapter.interface';

@Injectable()
export class DeepSeekAdapter implements ProviderAdapter {
  readonly providerType = 'DEEPSEEK';
  private readonly logger = new Logger(DeepSeekAdapter.name);

  private readonly pricing: Record<string, { prompt: number; completion: number }> = {
    'deepseek-chat': { prompt: 0.00014, completion: 0.00028 },
    'deepseek-coder': { prompt: 0.00014, completion: 0.00028 },
    'deepseek-reasoner': { prompt: 0.00055, completion: 0.00219 },
  };

  async execute(
    model: string,
    apiKey: string | null,
    baseUrl: string | null,
    options: AIExecutionOptions,
  ): Promise<AIExecutionResult> {
    const key = apiKey || process.env.DEEPSEEK_API_KEY;
    const url = (baseUrl || 'https://api.deepseek.com/v1').replace(/\/$/, '') + '/chat/completions';

    if (!key) {
      throw new Error('DeepSeek API Key not configured in system or environment');
    }

    const messages: any[] = [];

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
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    const targetModel = model || 'deepseek-chat';
    const body: any = {
      model: targetModel,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
    };

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
        throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
      }

      const json = await response.json();
      const choice = json.choices?.[0];
      const content = choice?.message?.content || '';
      const usage = json.usage || {};

      const promptTokens = usage.prompt_tokens || Math.ceil(systemContent.length / 4);
      const completionTokens = usage.completion_tokens || Math.ceil(content.length / 4);
      const totalTokens = usage.total_tokens || promptTokens + completionTokens;

      const rate = this.pricing[targetModel] || { prompt: 0.00014, completion: 0.00028 };
      const estimatedCost = (promptTokens / 1000) * rate.prompt + (completionTokens / 1000) * rate.completion;

      return {
        content,
        provider: 'DEEPSEEK',
        model: targetModel,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
        latencyMs,
        finishReason: choice?.finish_reason || 'stop',
      };
    } catch (err: any) {
      clearTimeout(timer);
      this.logger.error(`DeepSeek Execution failed: ${err.message}`);
      throw err;
    }
  }
}
