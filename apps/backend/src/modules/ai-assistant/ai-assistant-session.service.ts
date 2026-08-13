import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class AIAssistantSessionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create or resume an AI Assistant conversation session.
   */
  async createSession(
    assistantId: string,
    orgId: string,
    userId: string,
    title?: string,
    provider?: string,
    model?: string,
    context?: string,
  ) {
    return this.prisma.aIAssistantSession.create({
      data: {
        assistantId,
        organizationId: orgId,
        userId,
        title: title || 'AI Assistant Conversation Session',
        selectedProvider: provider || 'OPENAI',
        selectedModel: model || 'gpt-4o',
        currentContext: context || null,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * List conversation sessions for an organization.
   */
  async listSessions(orgId: string, userId?: string, limit: number = 20) {
    return this.prisma.aIAssistantSession.findMany({
      where: {
        organizationId: orgId,
        ...(userId ? { userId } : {}),
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: { executions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Find session by ID.
   */
  async getSession(sessionId: string) {
    const session = await this.prisma.aIAssistantSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        executions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) throw new NotFoundException('AI Assistant session not found');
    return session;
  }

  /**
   * Close/End a session.
   */
  async closeSession(sessionId: string) {
    return this.prisma.aIAssistantSession.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
      },
    });
  }
}
