import { Injectable, Logger } from '@nestjs/common';
import {
  ProviderAdapter,
  AIExecutionOptions,
  AIExecutionResult,
} from './provider-adapter.interface';

@Injectable()
export class GeminiAdapter implements ProviderAdapter {
  readonly providerType = 'GEMINI';
  private readonly logger = new Logger(GeminiAdapter.name);

  private readonly pricing: Record<string, { prompt: number; completion: number }> = {
    'gemini-1.5-pro': { prompt: 0.00125, completion: 0.005 },
    'gemini-1.5-flash': { prompt: 0.000075, completion: 0.0003 },
    'gemini-2.0-flash': { prompt: 0.0001, completion: 0.0004 },
  };

  async execute(
    model: string,
    apiKey: string | null,
    baseUrl: string | null,
    options: AIExecutionOptions,
  ): Promise<AIExecutionResult> {
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const targetModel = model || 'gemini-1.5-pro';
    const host = (baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
    const url = `${host}/v1beta/models/${targetModel}:generateContent?key=${key || ''}`;

    if (!key) {
      throw new Error('Google Gemini API Key not configured in system or environment');
    }

    let systemContent = options.systemPrompt || 'You are an enterprise AI assistant for BlackDesk OS.';
    if (options.ragContext && options.ragContext.length > 0) {
      systemContent += '\n\n### RETRIEVED KNOWLEDGE CONTEXT:\n' + options.ragContext.join('\n---\n');
    }
    if (options.memories && options.memories.length > 0) {
      systemContent += '\n\n### USER & WORKSPACE MEMORIES:\n' + options.memories.join('\n');
    }

    const contents: any[] = [];
    if (options.messages && options.messages.length > 0) {
      for (const msg of options.messages) {
        if (msg.role !== 'system') {
          contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          });
        }
      }
    }

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const body: any = {
      systemInstruction: { parts: [{ text: systemContent }] },
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
        topP: options.topP ?? 0.95,
      },
    };

    if (options.jsonMode) {
      body.generationConfig.responseMimeType = 'application/json';
    }

    const startTime = Date.now();
    const timeoutMs = options.timeoutMs || 20000;
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
        throw new Error(`Google Gemini API error (${response.status}): ${errorText}`);
      }

      const json = await response.json();
      const candidate = json.candidates?.[0];
      const content = candidate?.content?.parts?.[0]?.text || '';
      const usage = json.usageMetadata || {};

      const promptTokens = usage.promptTokenCount || Math.ceil(systemContent.length / 4);
      const completionTokens = usage.candidatesTokenCount || Math.ceil(content.length / 4);
      const totalTokens = usage.totalTokenCount || promptTokens + completionTokens;

      const rate = this.pricing[targetModel] || { prompt: 0.000075, completion: 0.0003 };
      const estimatedCost = (promptTokens / 1000) * rate.prompt + (completionTokens / 1000) * rate.completion;

      return {
        content,
        provider: 'GEMINI',
        model: targetModel,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost,
        latencyMs,
        finishReason: candidate?.finishReason || 'STOP',
      };
    } catch (err: any) {
      clearTimeout(timer);
      this.logger.error(`Gemini Execution failed: ${err.message}`);
      throw err;
    }
  }
}
