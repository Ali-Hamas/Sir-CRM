import { Module } from '@nestjs/common';
import { AIMemoryService } from './services/ai-memory.service';
import { AIContextBuilderService } from './services/ai-context-builder.service';
import { AIMemoryController } from './ai-memory.controller';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [AIMemoryController],
  providers: [AIMemoryService, AIContextBuilderService],
  exports: [AIMemoryService, AIContextBuilderService],
})
export class AIMemoryModule {}
