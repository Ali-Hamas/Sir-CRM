import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { CRMExecutionService } from './crm-execution.service';
import { ProjectExecutionService } from './project-execution.service';
import { KnowledgeExecutionService } from './knowledge-execution.service';
import { DocumentExecutionService } from './document-execution.service';
import { WorkflowExecutionService } from './workflow-execution.service';
import { SearchService } from '../../search/search.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class ExecutionDispatcherService {
  private readonly logger = new Logger(ExecutionDispatcherService.name);

  constructor(
    private readonly crmExecutionService: CRMExecutionService,
    private readonly projectExecutionService: ProjectExecutionService,
    private readonly knowledgeExecutionService: KnowledgeExecutionService,
    private readonly documentExecutionService: DocumentExecutionService,
    private readonly workflowExecutionService: WorkflowExecutionService,
    private readonly searchService: SearchService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Main Dispatcher for real platform tool execution.
   */
  async dispatchToolExecution(
    toolKey: string,
    orgId: string,
    userId: string,
    params: Record<string, any>,
    workspaceId?: string,
  ): Promise<any> {
    this.logger.log(`Dispatching real tool execution: '${toolKey}' for Org: ${orgId}`);

    if (toolKey.startsWith('crm_')) {
      if (toolKey.includes('company')) {
        return this.crmExecutionService.executeCompanyTool(toolKey, orgId, userId, params);
      }
      if (toolKey.includes('contact')) {
        return this.crmExecutionService.executeContactTool(toolKey, orgId, userId, params);
      }
      if (toolKey.includes('lead')) {
        return this.crmExecutionService.executeLeadTool(toolKey, orgId, userId, params);
      }
      return this.crmExecutionService.executePipelineTool(toolKey, orgId, userId, params);
    }

    if (toolKey.startsWith('projects_')) {
      if (toolKey.includes('project')) {
        return this.projectExecutionService.executeProjectTool(toolKey, orgId, userId, params);
      }
      return this.projectExecutionService.executeTaskTool(toolKey, orgId, userId, params);
    }

    if (toolKey.startsWith('knowledge_')) {
      return this.knowledgeExecutionService.executeKnowledgeTool(toolKey, orgId, userId, params);
    }

    if (toolKey.startsWith('documents_')) {
      return this.documentExecutionService.executeDocumentTool(toolKey, orgId, userId, params);
    }

    if (toolKey.startsWith('workflow_')) {
      return this.workflowExecutionService.executeWorkflowTool(toolKey, orgId, userId, params);
    }

    if (toolKey === 'search_global') {
      const searchResult = await this.searchService.globalSearch(orgId, userId, params.query);
      return {
        query: params.query,
        totalFound: searchResult.totalCount || 0,
        results: searchResult.results || [],
        summary: `Executed global search for "${params.query}" across workspace modules. Found ${searchResult.totalCount || 0} items.`,
      };
    }

    if (toolKey === 'notifications_send') {
      const notif = await this.notificationsService.createNotification({
        userId: params.targetUserId || userId,
        organizationId: orgId,
        title: params.title,
        message: params.message,
        category: 'SYSTEM',
        priority: params.priority || 'NORMAL',
        linkUrl: params.linkUrl || null,
      });

      return {
        notificationId: notif.id,
        targetUserId: notif.userId,
        title: notif.title,
        summary: `Dispatched notification "${notif.title}" to target user ${notif.userId}`,
      };
    }

    throw new NotFoundException(`Real tool execution handler for '${toolKey}' is not configured`);
  }
}
