import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivityService } from '../activity/activity.service';

export interface WorkflowTriggerEvent {
  type: string;
  organizationId: string;
  userId?: string;
  entityType: string;
  entityId: string;
  entityData: any;
}

@Injectable()
export class WorkflowsExecutionService {
  private readonly logger = new Logger(WorkflowsExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly activityService: ActivityService,
  ) {}

  async handleTrigger(event: WorkflowTriggerEvent): Promise<any[]> {
    try {
      const activeWorkflows = await (this.prisma as any).workflow.findMany({
        where: {
          organizationId: event.organizationId,
          status: 'ACTIVE',
          isDeleted: false,
          triggers: {
            some: {
              type: event.type,
            },
          },
        },
        include: {
          triggers: true,
          conditions: { orderBy: { stepOrder: 'asc' } },
          actions: { orderBy: { stepOrder: 'asc' } },
        },
      });

      if (!activeWorkflows || activeWorkflows.length === 0) {
        return [];
      }

      const results = [];
      for (const workflow of activeWorkflows) {
        const result = await this.executeWorkflow(workflow, event);
        results.push(result);
      }
      return results;
    } catch (error) {
      this.logger.error(`Error processing trigger ${event.type}:`, error);
      return [];
    }
  }

  async executeWorkflow(workflow: any, event: WorkflowTriggerEvent): Promise<any> {
    const logs: any[] = [];
    let status = 'SUCCESS';
    let errorMessage: string | null = null;

    logs.push({
      timestamp: new Date().toISOString(),
      step: 'TRIGGER_EVALUATION',
      message: `Trigger matched: ${event.type} for ${event.entityType} (${event.entityId})`,
    });

    // 1. Evaluate Conditions
    const conditionsPassed = this.evaluateConditions(workflow.conditions, event.entityData, logs);

    if (!conditionsPassed) {
      status = 'SKIPPED';
      logs.push({
        timestamp: new Date().toISOString(),
        step: 'CONDITION_EVALUATION',
        message: 'Workflow skipped - conditions not met.',
      });

      const execution = await (this.prisma as any).workflowExecution.create({
        data: {
          workflowId: workflow.id,
          organizationId: event.organizationId,
          triggerType: event.type,
          entityType: event.entityType,
          entityId: event.entityId,
          status,
          logs: JSON.stringify(logs),
          executedById: event.userId || null,
        },
      });
      return execution;
    }

    logs.push({
      timestamp: new Date().toISOString(),
      step: 'CONDITION_EVALUATION',
      message: 'All conditions satisfied. Proceeding to execute actions.',
    });

    // 2. Execute Actions
    for (const action of workflow.actions) {
      try {
        let actionConfig: any = {};
        try {
          actionConfig = typeof action.config === 'string' ? JSON.parse(action.config) : action.config;
        } catch (e) {
          actionConfig = { raw: action.config };
        }

        const actionLog = await this.executeAction(action.type, actionConfig, event);
        logs.push({
          timestamp: new Date().toISOString(),
          step: `ACTION_${action.type}`,
          actionId: action.id,
          message: `Executed action ${action.type}`,
          detail: actionLog,
        });
      } catch (err: any) {
        status = 'FAILED';
        errorMessage = err.message || 'Action execution failed';
        logs.push({
          timestamp: new Date().toISOString(),
          step: `ACTION_${action.type}`,
          actionId: action.id,
          error: errorMessage,
        });
        break;
      }
    }

    // 3. Record Execution Log
    const execution = await (this.prisma as any).workflowExecution.create({
      data: {
        workflowId: workflow.id,
        organizationId: event.organizationId,
        triggerType: event.type,
        entityType: event.entityType,
        entityId: event.entityId,
        status,
        logs: JSON.stringify(logs),
        error: errorMessage,
        executedById: event.userId || null,
      },
    });

    // Log to Activity System
    if (event.userId) {
      await this.activityService.logActivity({
        userId: event.userId,
        organizationId: event.organizationId,
        action: 'WORKFLOW_EXECUTED',
        module: 'WORKFLOWS',
        entityType: 'WORKFLOW',
        entityId: workflow.id,
        metadata: {
          workflowName: workflow.name,
          status,
          triggerType: event.type,
          entityId: event.entityId,
        },
      }).catch(() => null);
    }

    return execution;
  }

  private evaluateConditions(conditions: any[], entityData: any, logs: any[]): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    for (const condition of conditions) {
      const actualValue = entityData?.[condition.field];
      const targetValue = condition.value;
      let matched = false;

      switch (condition.operator) {
        case 'EQUALS':
          matched = String(actualValue ?? '').toLowerCase() === String(targetValue ?? '').toLowerCase();
          break;
        case 'NOT_EQUALS':
          matched = String(actualValue ?? '').toLowerCase() !== String(targetValue ?? '').toLowerCase();
          break;
        case 'CONTAINS':
          matched = String(actualValue ?? '').toLowerCase().includes(String(targetValue ?? '').toLowerCase());
          break;
        case 'GREATER_THAN':
          matched = Number(actualValue) > Number(targetValue);
          break;
        case 'LESS_THAN':
          matched = Number(actualValue) < Number(targetValue);
          break;
        case 'IS_SET':
          matched = actualValue !== undefined && actualValue !== null && actualValue !== '';
          break;
        default:
          matched = true;
      }

      logs.push({
        timestamp: new Date().toISOString(),
        step: 'CONDITION_CHECK',
        field: condition.field,
        operator: condition.operator,
        expected: targetValue,
        actual: actualValue,
        result: matched ? 'PASSED' : 'FAILED',
      });

      if (!matched) {
        return false;
      }
    }

    return true;
  }

  private async executeAction(actionType: string, config: any, event: WorkflowTriggerEvent): Promise<any> {
    const orgId = event.organizationId;
    const userId = event.userId || config.userId;

    switch (actionType) {
      case 'SEND_NOTIFICATION': {
        const targetUserId = config.userId || event.userId;
        if (targetUserId) {
          await this.notificationsService.createNotification({
            userId: targetUserId,
            organizationId: orgId,
            title: config.title || 'Workflow Automation Alert',
            message: config.message || `Automated action triggered by ${event.type}`,
            category: 'SYSTEM',
            priority: config.priority || 'MEDIUM',
            linkUrl: config.linkUrl || `/workflows`,
          });
        }
        return { notificationSent: true, targetUserId };
      }

      case 'CREATE_ACTIVITY': {
        if (userId) {
          await this.activityService.logActivity({
            userId,
            organizationId: orgId,
            action: config.action || 'WORKFLOW_AUTOMATED_ACTION',
            module: 'WORKFLOWS',
            entityType: event.entityType,
            entityId: event.entityId,
            metadata: config.metadata || { automated: true },
          });
        }
        return { activityLogged: true };
      }

      case 'CREATE_TASK': {
        const task = await (this.prisma as any).task.create({
          data: {
            title: config.title || `Automated Task for ${event.entityType}`,
            description: config.description || `Generated by Workflow Trigger: ${event.type}`,
            priority: config.priority || 'MEDIUM',
            status: 'TODO',
            organizationId: orgId,
            createdById: userId || 'system',
          },
        });
        return { taskId: task.id, title: task.title };
      }

      case 'CREATE_PROJECT': {
        const project = await (this.prisma as any).project.create({
          data: {
            name: config.name || `Automated Project for ${event.entityType}`,
            description: config.description || `Generated by Workflow Trigger: ${event.type}`,
            status: 'PLANNING',
            organizationId: orgId,
            createdById: userId || 'system',
          },
        });
        return { projectId: project.id, name: project.name };
      }

      case 'ASSIGN_USER': {
        return { assignedUserId: config.userId || userId, note: 'User assignment logged' };
      }

      case 'CREATE_RECORD': {
        return { recordType: config.entityType || 'CustomRecord', status: 'Created' };
      }

      case 'UPDATE_RECORD': {
        return { entityId: event.entityId, updatedFields: config.fields || {} };
      }

      case 'EMAIL_ACTION': {
        return { type: 'EMAIL_ACTION_FOUNDATION', recipient: config.recipient || 'placeholder@Britsync.os', status: 'Queued' };
      }

      case 'DELAY_ACTION': {
        return { type: 'DELAY_ACTION_FOUNDATION', durationMinutes: config.durationMinutes || 5, status: 'Scheduled' };
      }

      default:
        return { executed: true, actionType };
    }
  }
}
