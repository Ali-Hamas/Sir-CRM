import { Module } from '@nestjs/common';
import { AIOrchestratorController } from './ai-orchestrator.controller';
import { AIOrchestratorService } from './ai-orchestrator.service';
import { WorkflowPlannerService } from './workflow-planner.service';
import { DelegationService } from './delegation.service';
import { SharedContextService } from './shared-context.service';
import { ExecutionCoordinator } from './execution-coordinator.service';
import { ExecutionLogger } from './execution-logger.service';
import { ActivityModule } from '../activity/activity.module';
import { AIAgentsModule } from '../ai-agents/ai-agents.module';

@Module({
  imports: [ActivityModule, AIAgentsModule],
  controllers: [AIOrchestratorController],
  providers: [
    AIOrchestratorService,
    WorkflowPlannerService,
    DelegationService,
    SharedContextService,
    ExecutionCoordinator,
    ExecutionLogger,
  ],
  exports: [
    AIOrchestratorService,
    WorkflowPlannerService,
    DelegationService,
    SharedContextService,
    ExecutionCoordinator,
    ExecutionLogger,
  ],
})
export class AIOrchestratorModule {}
