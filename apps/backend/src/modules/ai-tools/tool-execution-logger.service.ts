import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';

@Injectable()
export class ToolExecutionLoggerService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
  ) {}

  /**
   * Log tool execution in database & Activity Center.
   */
  async logExecution(data: {
    toolId: string;
    organizationId: string;
    workspaceId?: string;
    userId: string;
    assistantId?: string;
    inputParams: any;
    outputResult: any;
    status: 'SUCCESS' | 'FAILED' | 'PERMISSION_DENIED' | 'VALIDATION_ERROR';
    errorMessage?: string;
    latencyMs: number;
  }) {
    const execution = await this.prisma.aIToolExecution.create({
      data: {
        toolId: data.toolId,
        organizationId: data.organizationId,
        workspaceId: data.workspaceId || null,
        userId: data.userId,
        assistantId: data.assistantId || null,
        inputParams: JSON.stringify(data.inputParams),
        outputResult: JSON.stringify(data.outputResult),
        status: data.status,
        errorMessage: data.errorMessage || null,
        latencyMs: data.latencyMs,
        isMock: true,
      },
    });

    // Log Activity
    await this.activityService.logActivity({
      userId: data.userId,
      organizationId: data.organizationId,
      action: 'AI_TOOL_EXECUTED',
      module: 'AI_TOOLS',
      entityType: 'AIToolExecution',
      entityId: execution.id,
      metadata: JSON.stringify({
        toolId: data.toolId,
        status: data.status,
        latencyMs: data.latencyMs,
      }),
    });

    return execution;
  }

  /**
   * List tool execution logs for an organization.
   */
  async listExecutions(orgId: string, limit: number = 30) {
    const logs = await this.prisma.aIToolExecution.findMany({
      where: { organizationId: orgId },
      include: {
        tool: {
          select: { key: true, name: true, category: { select: { name: true, displayName: true } } },
        },
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((log) => ({
      ...log,
      inputParams: JSON.parse(log.inputParams || '{}'),
      outputResult: JSON.parse(log.outputResult || '{}'),
    }));
  }
}
