import { Module } from '@nestjs/common';
import { AIProvidersService } from './services/ai-providers.service';
import { AIEncryptionService } from './services/ai-encryption.service';
import { AIProviderFactoryService } from './services/ai-provider-factory.service';
import { AIProvidersController } from './ai-providers.controller';
import { ActivityModule } from '../activity/activity.module';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { ClaudeAdapter } from './adapters/claude.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { DeepSeekAdapter } from './adapters/deepseek.adapter';
import { OpenRouterAdapter } from './adapters/openrouter.adapter';
import { OllamaAdapter } from './adapters/ollama.adapter';

@Module({
  imports: [ActivityModule],
  controllers: [AIProvidersController],
  providers: [
    AIProvidersService,
    AIEncryptionService,
    AIProviderFactoryService,
    OpenAIAdapter,
    ClaudeAdapter,
    GeminiAdapter,
    DeepSeekAdapter,
    OpenRouterAdapter,
    OllamaAdapter,
  ],
  exports: [
    AIProvidersService,
    AIEncryptionService,
    AIProviderFactoryService,
    OpenAIAdapter,
    ClaudeAdapter,
    GeminiAdapter,
    DeepSeekAdapter,
    OpenRouterAdapter,
    OllamaAdapter,
  ],
})
export class AIProvidersModule {}
