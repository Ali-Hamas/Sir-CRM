import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Role } from '../../common/roles';
import * as crypto from 'crypto';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  private async resolveOrgId(orgIdOrSlug: string): Promise<string> {
    const org = await this.prisma.organization.findFirst({
      where: { OR: [{ id: orgIdOrSlug }, { slug: orgIdOrSlug }] },
      select: { id: true },
    });
    return org ? org.id : orgIdOrSlug;
  }

  // ============================
  // TEAM CRUD
  // ============================
  
  async createTeam(orgId: string, userId: string, data: any) {
    const realOrgId = await this.resolveOrgId(orgId);
    return this.prisma.team.create({
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        departmentId: data.departmentId,
        leaderId: data.leaderId,
        organizationId: realOrgId,
      },
    });
  }

  async findAllTeams(orgId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    return this.prisma.team.findMany({
      where: { organizationId: realOrgId },
      include: {
        department: { select: { id: true, name: true } },
        leader: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { members: true } },
      },
    });
  }

  async findOneTeam(orgId: string, teamId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, organizationId: realOrgId },
      include: {
        department: true,
        leader: { select: { id: true, firstName: true, lastName: true, email: true } },
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async updateTeam(orgId: string, teamId: string, userId: string, data: any) {
    const realOrgId = await this.resolveOrgId(orgId);
    const team = await this.prisma.team.findFirst({ where: { id: teamId, organizationId: realOrgId } });
    if (!team) throw new NotFoundException('Team not found');

    return this.prisma.team.update({
      where: { id: teamId },
      data: {
        name: data.name,
        description: data.description,
        color: data.color,
        departmentId: data.departmentId,
        leaderId: data.leaderId,
      },
    });
  }

  async removeTeam(orgId: string, teamId: string, userId: string) {
    const realOrgId = await this.resolveOrgId(orgId);
    const team = await this.prisma.team.findFirst({ where: { id: teamId, organizationId: realOrgId } });
    if (!team) throw new NotFoundException('Team not found');

    return this.prisma.team.delete({ where: { id: teamId } });
  }

  // ============================
  // INVITATIONS & ORG MEMBERS
  // ============================

  async inviteMember(orgId: string, inviterId: string, data: { email: string; role: Role; workspaceId?: string }) {
    if (data.role === Role.SUPER_ADMIN || data.role === Role.ADMIN) {
      const inviter = await this.prisma.user.findUnique({ where: { id: inviterId } });
      if (!inviter || (inviter.role !== Role.SUPER_ADMIN && inviter.role !== Role.ADMIN)) {
        throw new ForbiddenException('Only administrators can grant administrator roles');
      }
    }
    const realOrgId = await this.resolveOrgId(orgId);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.invitation.create({
      data: {
        email: data.email,
        role: data.role,
        token,
        organizationId: realOrgId,
        workspaceId: data.workspaceId,
        createdBy: inviterId,
        expiresAt,
      },
    });

    return invitation;
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invitation');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.invitation.update({ where: { id: invitation.id }, data: { status: 'ACCEPTED' } });

      await tx.organizationMember.upsert({
        where: { userId_organizationId: { userId, organizationId: invitation.organizationId } },
        update: { role: invitation.role },
        create: { userId, organizationId: invitation.organizationId, role: invitation.role },
      });

      if (invitation.workspaceId) {
        await tx.workspaceMember.upsert({
          where: { userId_workspaceId: { userId, workspaceId: invitation.workspaceId } },
          update: { role: invitation.role },
          create: { userId, workspaceId: invitation.workspaceId, role: invitation.role },
        });
      }

      return { success: true };
    });
  }

  async getMembers(orgId: string, query: { search?: string, departmentId?: string, teamId?: string, page?: number, limit?: number } = {}) {
    const realOrgId = await this.resolveOrgId(orgId);

    // Auto-ensure existing registered/logged-in database users are members of this org
    try {
      const users = await this.prisma.user.findMany();
      for (const u of users) {
        await this.prisma.organizationMember.upsert({
          where: { userId_organizationId: { userId: u.id, organizationId: realOrgId } },
          update: {},
          create: {
            userId: u.id,
            organizationId: realOrgId,
            role: u.role || 'EMPLOYEE',
            status: 'ACTIVE',
          },
        }).catch(() => null);
      }
    } catch (e) {
      console.warn('[TEAM] Auto-member sync notice:', (e as Error).message);
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { organizationId: realOrgId };
    
    if (query.departmentId) where.departmentId = query.departmentId;
    if (query.teamId) {
      where.user = { teamMembers: { some: { teamId: query.teamId } } };
    }
    if (query.search) {
      where.user = {
        ...where.user,
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ]
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.organizationMember.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true, lastLogin: true, dateJoined: true, profilePictureUrl: true, teamMembers: { include: { team: { select: { id: true, name: true, color: true } } } } } },
          department: true,
          customRole: true,
        },
      }),
      this.prisma.organizationMember.count({ where })
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async removeMember(orgId: string, memberId: string) {
    return this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { status: 'INACTIVE' },
    });
  }

  async changeRole(orgId: string, memberId: string, newRole: Role) {
    const member = await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { role: newRole },
    });
    if (member?.userId) {
      await this.prisma.user.update({
        where: { id: member.userId },
        data: { role: newRole },
      }).catch(() => null);
    }
    return member;
  }
}
