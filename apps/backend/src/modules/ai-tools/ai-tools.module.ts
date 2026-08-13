import { Module } from '@nestjs/common';
import { AIToolsController } from './ai-tools.controller';
import { ToolRegistryService } from './tool-registry.service';
import { ToolExecutorService } from './tool-executor.service';
import { ToolPermissionService } from './tool-permission.service';
import { ToolExecutionLoggerService } from './tool-execution-logger.service';

import { ExecutionDispatcherService } from './services/execution-dispatcher.service';
import { CRMExecutionService } from './services/crm-execution.service';
import { ProjectExecutionService } from './services/project-execution.service';
import { KnowledgeExecutionService } from './services/knowledge-execution.service';
import { DocumentExecutionService } from './services/document-execution.service';
import { WorkflowExecutionService } from './services/workflow-execution.service';

import { CompaniesModule } from '../companies/companies.module';
import { ContactsModule } from '../contacts/contacts.module';
import { LeadsModule } from '../leads/leads.module';
import { OpportunitiesModule } from '../opportunities/opportunities.module';
import { MeetingsModule } from '../meetings/meetings.module';
import { ProposalsModule } from '../proposals/proposals.module';
import { ContractsModule } from '../contracts/contracts.module';
import { ProjectsModule } from '../projects/projects.module';
import { TasksModule } from '../tasks/tasks.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { DocumentsModule } from '../documents/documents.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { SearchModule } from '../search/search.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [
    CompaniesModule,
    ContactsModule,
    LeadsModule,
    OpportunitiesModule,
    MeetingsModule,
    ProposalsModule,
    ContractsModule,
    ProjectsModule,
    TasksModule,
    KnowledgeModule,
    DocumentsModule,
    WorkflowsModule,
    SearchModule,
    NotificationsModule,
    ActivityModule,
  ],
  controllers: [AIToolsController],
  providers: [
    ToolRegistryService,
    ToolExecutorService,
    ToolPermissionService,
    ToolExecutionLoggerService,
    ExecutionDispatcherService,
    CRMExecutionService,
    ProjectExecutionService,
    KnowledgeExecutionService,
    DocumentExecutionService,
    WorkflowExecutionService,
  ],
  exports: [
    ToolRegistryService,
    ToolExecutorService,
    ToolPermissionService,
    ToolExecutionLoggerService,
    ExecutionDispatcherService,
    CRMExecutionService,
    ProjectExecutionService,
    KnowledgeExecutionService,
    DocumentExecutionService,
    WorkflowExecutionService,
  ],
})
export class AIToolModule {}
