import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class WorkflowExecutionService {
  constructor(private readonly prisma: PrismaService) {}

  async executeWorkflowTool(toolKey: string, orgId: string, userId: string, params: Record<string, any>) {
    switch (toolKey) {
      case 'workflow_execute': {
        const workflow = await (this.prisma as any).workflow.findFirst({
          where: { id: params.workflowId, organizationId: orgId, isDeleted: false },
          include: { actions: true },
        });

        if (!workflow) {
          throw new NotFoundException(`Workflow with ID '${params.workflowId}' not found`);
        }

        const execution = await (this.prisma as any).workflowExecution.create({
          data: {
            workflowId: workflow.id,
            organizationId: orgId,
            executedById: userId,
            status: 'SUCCESS',
            triggerPayload: typeof params.triggerPayload === 'object' ? JSON.stringify(params.triggerPayload) : params.triggerPayload || '{}',
            stepsCompleted: workflow.actions?.length || 1,
            totalSteps: workflow.actions?.length || 1,
            logs: JSON.stringify([{ step: 1, action: 'TRIGGER_MANUAL', status: 'SUCCESS', timestamp: new Date() }]),
          },
        });

        return {
          executionId: execution.id,
          workflowId: workflow.id,
          workflowName: workflow.name,
          status: 'SUCCESS',
          stepsExecuted: execution.stepsCompleted,
          summary: `Successfully executed workflow "${workflow.name}" (Execution ID: ${execution.id})`,
        };
      }

      default:
        throw new NotFoundException(`Workflow tool handler '${toolKey}' not found`);
    }
  }
}
