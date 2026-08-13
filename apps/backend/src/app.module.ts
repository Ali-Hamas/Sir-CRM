import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { TeamModule } from './modules/team/team.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { RolesModule } from './modules/roles/roles.module';
import { ActivityModule } from './modules/activity/activity.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { LeadsModule } from './modules/leads/leads.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { ProposalsModule } from './modules/proposals/proposals.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TimeTrackingModule } from './modules/time-tracking/time-tracking.module';
import { ResourceManagementModule } from './modules/resource-management/resource-management.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { AIProvidersModule } from './modules/ai-providers/ai-providers.module';
import { PromptsModule } from './modules/prompts/prompts.module';
import { AIChatModule } from './modules/ai-chat/ai-chat.module';
import { AIMemoryModule } from './modules/ai-memory/ai-memory.module';
import { AIAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { AIToolModule } from './modules/ai-tools/ai-tools.module';
import { RAGModule } from './modules/rag/rag.module';
import { AIAgentsModule } from './modules/ai-agents/ai-agents.module';
import { ExecutiveDashboardModule } from './modules/executive-dashboard/executive-dashboard.module';
import { AIOrchestratorModule } from './modules/ai-orchestrator/ai-orchestrator.module';
import { BusinessProcessModule } from './modules/business-process/business-process.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [CoreModule, PrismaModule, AuthModule, UsersModule, OrganizationsModule, WorkspacesModule, TeamModule, DepartmentsModule, RolesModule, ActivityModule, NotificationsModule, DocumentsModule, CompaniesModule, ContactsModule, LeadsModule, OpportunitiesModule, MeetingsModule, ProposalsModule, ContractsModule, ProjectsModule, TasksModule, TimeTrackingModule, ResourceManagementModule, KnowledgeModule, WorkflowsModule, AIProvidersModule, PromptsModule, AIChatModule, AIMemoryModule, AIAssistantModule, AIToolModule, RAGModule, AIAgentsModule, ExecutiveDashboardModule, AIOrchestratorModule, BusinessProcessModule, CommunicationsModule, AnalyticsModule, IntegrationsModule, HealthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

