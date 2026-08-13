import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ActivityModule } from '../activity/activity.module';
import { AIProvidersModule } from '../ai-providers/ai-providers.module';
import { AgentRegistryService } from './agent-registry.service';
import { AgentFactoryService } from './agent-factory.service';
import { AgentContextBuilderService } from './agent-context-builder.service';
import { AgentExecutorService } from './agent-executor.service';
import { AIAgentsService } from './ai-agents.service';
import { AIAgentsController } from './ai-agents.controller';

@Module({
  imports: [PrismaModule, ActivityModule, AIProvidersModule],
  controllers: [AIAgentsController],
  providers: [
    AgentRegistryService,
    AgentFactoryService,
    AgentContextBuilderService,
    AgentExecutorService,
    AIAgentsService,
  ],
  exports: [
    AgentRegistryService,
    AgentFactoryService,
    AgentContextBuilderService,
    AgentExecutorService,
    AIAgentsService,
  ],
})
export class AIAgentsModule {}
