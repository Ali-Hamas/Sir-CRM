import { Injectable, Logger } from '@nestjs/common';
import {
  ProviderAdapter,
  AIExecutionOptions,
  AIExecutionResult,
} from './provider-adapter.interface';

@Injectable()
export class OllamaAdapter implements ProviderAdapter {
  readonly providerType = 'OLLAMA';
  private readonly logger = new Logger(OllamaAdapter.name);

  async execute(
    model: string,
    apiKey: string | null,
    baseUrl: string | null,
    options: AIExecutionOptions,
  ): Promise<AIExecutionResult> {
    const host = (baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
    const url = `${host}/api/chat`;

    const messages: any[] = [];

    let systemContent = options.systemPrompt || 'You are an enterprise AI assistant for BlackDesk OS.';
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

    const targetModel = model || 'llama3';
    const body: any = {
      model: targetModel,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.7,
        top_p: options.topP ?? 0.9,
      },
    };

    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || 25000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama Local API error (${response.status}): ${errorText}`);
      }

      const json = await response.json();
      const content = json.message?.content || '';

      const promptTokens = json.prompt_eval_count || Math.ceil(systemContent.length / 4);
      const completionTokens = json.eval_count || Math.ceil(content.length / 4);
      const totalTokens = promptTokens + completionTokens;

      return {
        content,
        provider: 'OLLAMA',
        model: targetModel,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost: 0.0, // Local Ollama execution cost is free ($0.00)
        latencyMs,
        finishReason: 'stop',
      };
    } catch (err: any) {
      clearTimeout(timer);
      this.logger.error(`Ollama Execution failed: ${err.message}`);
      throw err;
    }
  }
}
