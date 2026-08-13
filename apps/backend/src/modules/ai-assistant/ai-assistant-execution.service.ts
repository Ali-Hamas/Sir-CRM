import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class AIAssistantExecutionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Log an AI Assistant Execution.
   */
  async logExecution(data: {
    assistantId: string;
    sessionId?: string;
    organizationId: string;
    userId: string;
    userPrompt: string;
    assistantResponse: string;
    tokens: number;
    latencyMs: number;
    provider: string;
    model: string;
    memoryUsed?: string[];
    promptTemplateUsed?: string;
    toolsRequested?: string[];
    executionStatus?: string;
  }) {
    return this.prisma.aIAssistantExecution.create({
      data: {
        assistantId: data.assistantId,
        sessionId: data.sessionId || null,
        organizationId: data.organizationId,
        userId: data.userId,
        userPrompt: data.userPrompt,
        assistantResponse: data.assistantResponse,
        tokens: data.tokens,
        latencyMs: data.latencyMs,
        provider: data.provider,
        model: data.model,
        memoryUsed: data.memoryUsed ? JSON.stringify(data.memoryUsed) : null,
        promptTemplateUsed: data.promptTemplateUsed || null,
        toolsRequested: data.toolsRequested ? JSON.stringify(data.toolsRequested) : null,
        executionStatus: data.executionStatus || 'SUCCESS',
      },
    });
  }

  /**
   * List executions for an organization.
   */
  async listExecutions(orgId: string, limit: number = 30) {
    const executions = await this.prisma.aIAssistantExecution.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return executions.map((exec) => ({
      ...exec,
      memoryUsed: exec.memoryUsed ? JSON.parse(exec.memoryUsed) : [],
      toolsRequested: exec.toolsRequested ? JSON.parse(exec.toolsRequested) : [],
    }));
  }
}
