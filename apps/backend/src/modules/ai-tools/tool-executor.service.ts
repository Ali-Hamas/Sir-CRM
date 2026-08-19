import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ToolRegistryService } from './tool-registry.service';
import { ToolPermissionService } from './tool-permission.service';
import { ToolExecutionLoggerService } from './tool-execution-logger.service';

import { ExecutionDispatcherService } from './services/execution-dispatcher.service';

@Injectable()
export class ToolExecutorService {
  constructor(
    private registryService: ToolRegistryService,
    private permissionService: ToolPermissionService,
    private loggerService: ToolExecutionLoggerService,
    private dispatcherService: ExecutionDispatcherService,
  ) {}

  /**
   * Main tool execution entrypoint.
   */
  async executeTool(
    toolKey: string,
    orgId: string,
    userId: string,
    params: Record<string, any>,
    workspaceId?: string,
    assistantId?: string,
  ) {
    const startTime = Date.now();

    // 1. Fetch Tool Definition
    const tool = await this.registryService.getToolByKey(toolKey);
    if (!tool) {
      throw new NotFoundException(`Tool with key '${toolKey}' not registered in platform`);
    }

    if (!tool.enabled) {
      throw new BadRequestException(`Tool '${tool.name}' is currently disabled`);
    }

    // 2. Validate Required Parameters
    const requiredList = tool.requiredParams || [];
    const missingParams = requiredList.filter((param: string) => params[param] === undefined || params[param] === null || params[param] === '');

    if (missingParams.length > 0) {
      const errorMsg = `Missing required parameters: ${missingParams.join(', ')}`;
      const latencyMs = Date.now() - startTime;
      await this.loggerService.logExecution({
        toolId: tool.id,
        organizationId: orgId,
        workspaceId,
        userId,
        assistantId,
        inputParams: params,
        outputResult: { error: errorMsg, missingParameters: missingParams },
        status: 'VALIDATION_ERROR',
        errorMessage: errorMsg,
        latencyMs,
      });
      throw new BadRequestException(errorMsg);
    }

    // 3. Permission & Scope Checks
    try {
      await this.permissionService.validateExecutionPermission(tool.id, orgId, userId, workspaceId);
    } catch (permError: any) {
      const latencyMs = Date.now() - startTime;
      await this.loggerService.logExecution({
        toolId: tool.id,
        organizationId: orgId,
        workspaceId,
        userId,
        assistantId,
        inputParams: params,
        outputResult: { error: permError.message },
        status: 'PERMISSION_DENIED',
        errorMessage: permError.message,
        latencyMs,
      });
      throw permError;
    }

    // 4. Real Execution via Execution Dispatcher Service
    let realOutput: any;
    let executionStatus: 'SUCCESS' | 'FAILED' = 'SUCCESS';
    let errorMessage: string | undefined;

    try {
      realOutput = await this.dispatcherService.dispatchToolExecution(
        tool.key,
        orgId,
        userId,
        params,
        workspaceId,
      );
    } catch (execErr: any) {
      executionStatus = 'FAILED';
      errorMessage = execErr.message;
      realOutput = {
        error: execErr.message,
        fallbackMessage: `Real tool execution failed for '${tool.name}'. Details: ${execErr.message}`,
      };
    }

    const latencyMs = Date.now() - startTime;

    // 5. Log Execution Audit
    const executionRecord = await this.loggerService.logExecution({
      toolId: tool.id,
      organizationId: orgId,
      workspaceId,
      userId,
      assistantId,
      inputParams: params,
      outputResult: realOutput,
      status: executionStatus,
      errorMessage,
      latencyMs,
    });

    return {
      executionId: executionRecord.id,
      toolKey: tool.key,
      toolName: tool.name,
      category: tool.categoryId,
      riskLevel: tool.riskLevel,
      status: executionStatus,
      output: realOutput,
      latencyMs,
      createdAt: executionRecord.createdAt,
    };
  }

  /**

   * Generates structured mock JSON response payloads for each platform tool.
   */
  private generateStructuredMockOutput(toolKey: string, params: Record<string, any>, orgId: string): any {
    const timestamp = new Date().toISOString();
    const mockUuid = 'mock-' + Math.random().toString(36).substring(2, 10);

    switch (toolKey) {
      // --- CRM ---
      case 'crm_create_company':
        return {
          success: true,
          companyId: mockUuid,
          name: params.name,
          industry: params.industry || 'Technology',
          status: 'PROSPECT',
          message: `Company '${params.name}' successfully created in CRM registry.`,
          createdAt: timestamp,
        };

      case 'crm_update_company':
        return {
          success: true,
          companyId: params.companyId,
          updatedFields: Object.keys(params).filter((k) => k !== 'companyId'),
          message: `Company '${params.companyId}' properties updated successfully.`,
          updatedAt: timestamp,
        };

      case 'crm_search_company':
        return {
          success: true,
          query: params.query,
          resultsCount: 3,
          items: [
            { id: 'comp-101', name: `${params.query} Dynamics`, industry: 'Software', status: 'ACTIVE' },
            { id: 'comp-102', name: `${params.query} Solutions`, industry: 'Consulting', status: 'PROSPECT' },
            { id: 'comp-103', name: `${params.query} Enterprise`, industry: 'Healthcare', status: 'CLIENT' },
          ],
        };

      case 'crm_create_contact':
        return {
          success: true,
          contactId: mockUuid,
          fullName: `${params.firstName} ${params.lastName}`,
          email: params.email || 'contact@company.com',
          message: `Contact '${params.firstName} ${params.lastName}' registered successfully.`,
        };

      case 'crm_update_contact':
        return {
          success: true,
          contactId: params.contactId,
          message: `Contact '${params.contactId}' profile updated successfully.`,
        };

      case 'crm_create_lead':
        return {
          success: true,
          leadId: mockUuid,
          leadName: `${params.firstName} ${params.lastName}`,
          companyName: params.companyName,
          status: 'NEW',
          message: `Lead '${params.firstName} ${params.lastName}' created in sales funnel.`,
        };

      case 'crm_convert_lead':
        return {
          success: true,
          leadId: params.leadId,
          convertedTo: {
            contactId: 'cnt-' + mockUuid,
            opportunityId: 'opp-' + mockUuid,
            clientId: 'cli-' + mockUuid,
          },
          message: `Lead '${params.leadId}' successfully converted to active Opportunity & Client.`,
        };

      case 'crm_create_opportunity':
        return {
          success: true,
          opportunityId: mockUuid,
          name: params.name,
          estimatedValue: params.estimatedValue || 50000,
          stage: 'NEW_OPPORTUNITY',
          status: 'OPEN',
        };

      // --- PROJECTS ---
      case 'projects_create_project':
        return {
          success: true,
          projectId: mockUuid,
          projectName: params.projectName,
          projectCode: params.projectCode,
          status: 'PLANNING',
          message: `Project '${params.projectName}' initialized.`,
        };

      case 'projects_update_project':
        return {
          success: true,
          projectId: params.projectId,
          message: `Project '${params.projectId}' status updated successfully.`,
        };

      case 'projects_list_projects':
        return {
          success: true,
          totalProjects: 4,
          projects: [
            { id: 'proj-1', projectName: 'Britsync Core Deployment', projectCode: 'BOS-01', progress: 85, status: 'IN_PROGRESS' },
            { id: 'proj-2', projectName: 'AI Integration Pipeline', projectCode: 'AI-02', progress: 40, status: 'PLANNING' },
            { id: 'proj-3', projectName: 'Q3 Enterprise Migration', projectCode: 'ENT-03', progress: 100, status: 'COMPLETED' },
          ],
        };

      case 'projects_create_task':
        return {
          success: true,
          taskId: mockUuid,
          title: params.title,
          projectId: params.projectId,
          status: 'TODO',
          priority: params.priority || 'MEDIUM',
        };

      case 'projects_assign_task':
        return {
          success: true,
          taskId: params.taskId,
          assignedToUserId: params.assigneeUserId,
          message: `Task '${params.taskId}' assigned to user '${params.assigneeUserId}'.`,
        };

      case 'projects_update_task':
        return {
          success: true,
          taskId: params.taskId,
          message: `Task '${params.taskId}' parameters updated.`,
        };

      case 'projects_complete_task':
        return {
          success: true,
          taskId: params.taskId,
          status: 'DONE',
          completedAt: timestamp,
        };

      // --- KNOWLEDGE ---
      case 'knowledge_search_articles':
        return {
          success: true,
          query: params.query,
          articles: [
            { id: 'art-1', title: `Guide to ${params.query}`, category: 'Operations', slug: 'guide-to-query' },
            { id: 'art-2', title: `${params.query} Best Practices`, category: 'Security', slug: 'query-best-practices' },
          ],
        };

      case 'knowledge_create_article':
        return {
          success: true,
          articleId: mockUuid,
          title: params.title,
          status: 'PUBLISHED',
          message: `Knowledge article '${params.title}' published.`,
        };

      // --- DOCUMENTS ---
      case 'documents_upload':
        return {
          success: true,
          documentId: mockUuid,
          fileName: params.fileName,
          storagePath: `/uploads/mock/${params.fileName}`,
          size: params.size,
        };

      case 'documents_download':
        return {
          success: true,
          documentId: params.documentId,
          downloadUrl: `https://Britsync.internal/api/documents/${params.documentId}/download`,
          expiresInSeconds: 3600,
        };

      // --- WORKFLOW ---
      case 'workflow_execute':
        return {
          success: true,
          workflowId: params.workflowId,
          executionId: mockUuid,
          status: 'COMPLETED',
          stepsExecuted: 4,
          executionTimeMs: 145,
        };

      // --- NOTIFICATIONS ---
      case 'notifications_send':
        return {
          success: true,
          notificationId: mockUuid,
          targetUserId: params.targetUserId,
          title: params.title,
          delivered: true,
        };

      // --- SEARCH ---
      case 'search_global':
        return {
          success: true,
          query: params.query,
          totalResults: 5,
          results: [
            { type: 'company', title: `${params.query} Corp`, url: `/crm/companies/c-1` },
            { type: 'project', title: `Project ${params.query}`, url: `/projects/p-1` },
            { type: 'task', title: `Task: Review ${params.query}`, url: `/projects/tasks/t-1` },
          ],
        };

      default:
        return {
          success: true,
          toolKey,
          paramsReceived: params,
          message: `Tool '${toolKey}' executed in mock mode.`,
        };
    }
  }
}
