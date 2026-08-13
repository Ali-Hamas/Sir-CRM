import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { BusinessProcessPlannerService, PlannedStep } from './business-process-planner.service';
import { BusinessProcessApprovalService } from './business-process-approval.service';
import { BusinessProcessAuditService } from './business-process-audit.service';

@Injectable()
export class BusinessProcessExecutorService {
  private readonly logger = new Logger(BusinessProcessExecutorService.name);

  constructor(
    private prisma: PrismaService,
    private planner: BusinessProcessPlannerService,
    private approvalService: BusinessProcessApprovalService,
    private auditService: BusinessProcessAuditService,
  ) {}

  async execute(organizationId: string, processId: string, userId: string, input?: any, trigger = 'MANUAL') {
    const process = await this.prisma.businessProcess.findFirst({
      where: { id: processId, organizationId, isDeleted: false },
    });
    if (!process) throw new Error('Process not found');

    const plan = this.planner.generatePlan(process);
    const executionPlanJson = JSON.stringify(plan);

    const execution = await this.prisma.businessProcessExecution.create({
      data: {
        organizationId,
        processId,
        status: 'PLANNING',
        trigger,
        priority: process.priority,
        inputData: input ? JSON.stringify(input) : undefined,
        executionPlan: executionPlanJson,
        createdBy: userId,
        startedAt: new Date(),
      },
    });

    await this.auditService.log({
      organizationId,
      executionId: execution.id,
      processId,
      action: 'STARTED',
      entityType: 'EXECUTION',
      entityId: execution.id,
      userId,
    });

    const steps: PlannedStep[] = JSON.parse(executionPlanJson);
    await this.prisma.businessProcessExecution.update({
      where: { id: execution.id },
      data: { status: 'EXECUTING' },
    });

    for (const step of plan) {
      await this.prisma.businessProcessStep.create({
        data: {
          executionId: execution.id,
          stepOrder: step.stepOrder,
          name: step.name,
          type: step.type,
          config: JSON.stringify(step.config),
          status: 'PENDING',
        },
      });
    }

    this.executeSteps(execution.id, organizationId, userId, steps).catch((err) => {
      this.logger.error(`Execution ${execution.id} failed: ${err.message}`);
    });

    return execution;
  }

  private async executeSteps(executionId: string, organizationId: string, userId: string, steps: PlannedStep[]) {
    for (const step of steps) {
      try {
        await this.executeStep(executionId, step, organizationId, userId);
      } catch (err: any) {
        this.logger.error(`Step ${step.stepOrder} failed: ${err.message}`);
        await this.updateStepStatus(executionId, step.stepOrder, 'FAILED', err.message);
        await this.auditService.log({
          organizationId,
          executionId,
          action: 'FAILED',
          entityType: 'STEP',
          entityId: `${executionId}_${step.stepOrder}`,
          details: { stepName: step.name, error: err.message },
        });
        await this.prisma.businessProcessExecution.update({
          where: { id: executionId },
          data: { status: 'FAILED', errorMessage: `Step ${step.name} failed: ${err.message}`, completedAt: new Date() },
        });
        return;
      }
    }

    await this.prisma.businessProcessExecution.update({
      where: { id: executionId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    await this.auditService.log({
      organizationId,
      executionId,
      action: 'COMPLETED',
      entityType: 'EXECUTION',
      entityId: executionId,
    });
  }

  private async executeStep(executionId: string, step: PlannedStep, organizationId: string, userId: string) {
    await this.updateStepStatus(executionId, step.stepOrder, 'RUNNING');

    switch (step.type) {
      case 'AI_ACTION':
        await this.executeAIAction(executionId, step);
        break;
      case 'TOOL_CALL':
        await this.executeToolCall(executionId, step);
        break;
      case 'TASK':
        await this.executeTask(executionId, step);
        break;
      case 'APPROVAL':
        await this.executeApproval(executionId, step, organizationId, userId);
        break;
      case 'NOTIFICATION':
        await this.executeNotification(executionId, step);
        break;
      case 'CONDITION':
        await this.executeCondition(executionId, step);
        break;
      case 'DELAY':
        await this.executeDelay(step);
        break;
      default:
        this.logger.warn(`Unknown step type: ${step.type}`);
    }

    await this.updateStepStatus(executionId, step.stepOrder, 'COMPLETED');
  }

  private async updateStepStatus(executionId: string, stepOrder: number, status: string, errorMessage?: string) {
    const data: any = { status };
    if (status === 'RUNNING') data.startedAt = new Date();
    if (status === 'COMPLETED') data.completedAt = new Date();
    if (errorMessage) data.errorMessage = errorMessage;

    await this.prisma.businessProcessStep.updateMany({
      where: { executionId, stepOrder },
      data,
    });
  }

  private async executeAIAction(executionId: string, step: PlannedStep) {
    this.logger.log(`AI Action: ${step.config?.agentKey || 'default'} - ${step.config?.prompt || step.name}`);
  }

  private async executeToolCall(executionId: string, step: PlannedStep) {
    this.logger.log(`Tool Call: ${step.config?.tool || 'unknown'}`);
  }

  private async executeTask(executionId: string, step: PlannedStep) {
    this.logger.log(`Task: ${step.config?.action || step.name}`);
  }

  private async executeApproval(executionId: string, step: PlannedStep, organizationId: string, userId: string) {
    const title = step.config?.title || step.name;
    const roleRequired = step.config?.roleRequired;

    const approval = await this.prisma.businessProcessApproval.create({
      data: {
        organizationId,
        executionId,
        title,
        description: `Approval required for step: ${step.name}`,
        roleRequired,
        status: 'PENDING',
      },
    });

    const stepRecord = await this.prisma.businessProcessStep.findFirst({
      where: { executionId, stepOrder: step.stepOrder },
    });
    if (stepRecord) {
      await this.prisma.businessProcessApproval.update({
        where: { id: approval.id },
        data: { stepId: stepRecord.id },
      });
    }

    await this.updateStepStatus(executionId, step.stepOrder, 'WAITING_APPROVAL');

    await this.prisma.businessProcessExecution.update({
      where: { id: executionId },
      data: { status: 'PAUSED' },
    });

    throw new Error(`Waiting for approval: ${approval.id}`);
  }

  private async executeNotification(executionId: string, step: PlannedStep) {
    this.logger.log(`Notification: ${step.config?.channels || 'in_app'}`);
  }

  private async executeCondition(executionId: string, step: PlannedStep) {
    this.logger.log(`Condition: ${step.config?.condition || 'unknown'}`);
  }

  private async executeDelay(step: PlannedStep) {
    const ms = step.config?.delayMs || 1000;
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async pause(executionId: string, organizationId: string) {
    await this.ensureOwnership(executionId, organizationId);
    return this.prisma.businessProcessExecution.update({
      where: { id: executionId },
      data: { status: 'PAUSED' },
    });
  }

  async resume(executionId: string, organizationId: string) {
    await this.ensureOwnership(executionId, organizationId);
    return this.prisma.businessProcessExecution.update({
      where: { id: executionId },
      data: { status: 'EXECUTING' },
    });
  }

  async cancel(executionId: string, organizationId: string) {
    await this.ensureOwnership(executionId, organizationId);
    return this.prisma.businessProcessExecution.update({
      where: { id: executionId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });
  }

  async retry(executionId: string, organizationId: string) {
    const execution = await this.ensureOwnership(executionId, organizationId);
    if (execution.status !== 'FAILED') throw new Error('Can only retry failed executions');

    const newRetryCount = (execution.retryCount || 0) + 1;
    if (newRetryCount > (execution.maxRetries || 3)) throw new Error('Max retries exceeded');

    await this.prisma.businessProcessExecution.update({
      where: { id: executionId },
      data: { status: 'EXECUTING', retryCount: newRetryCount, errorMessage: null },
    });

    await this.auditService.log({
      organizationId,
      executionId,
      action: 'RETRIED',
      entityType: 'EXECUTION',
      entityId: executionId,
      details: { retryCount: newRetryCount },
    });

    const failedSteps = await this.prisma.businessProcessStep.findMany({
      where: { executionId, status: 'FAILED' },
      orderBy: { stepOrder: 'asc' },
    });

    const plan = execution.executionPlan ? (JSON.parse(execution.executionPlan) as PlannedStep[]) : [];
    for (const step of failedSteps) {
      const stepDef = plan.find((s) => s.stepOrder === step.stepOrder);
      if (stepDef) {
        await this.executeStep(executionId, stepDef, organizationId, execution.createdBy || '');
      }
    }

    return execution;
  }

  private async ensureOwnership(executionId: string, organizationId: string) {
    const execution = await this.prisma.businessProcessExecution.findFirst({
      where: { id: executionId, organizationId },
    });
    if (!execution) throw new Error('Execution not found');
    return execution;
  }
}
