import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async register(data: any) {
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      if (data.firstName || data.lastName) {
        const isPasswordValid = await bcrypt.compare(data.password, existingUser.passwordHash).catch(() => false);
        if (isPasswordValid) {
          const updateData: any = {};
          if (data.firstName?.trim()) updateData.firstName = data.firstName.trim();
          if (data.lastName?.trim()) updateData.lastName = data.lastName.trim();
          const updatedUser = await this.usersService.update(existingUser.id, updateData);
          return this.generateTokens(updatedUser);
        }
      }
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.usersService.create({
      email: data.email,
      passwordHash: hashedPassword,
      firstName: data.firstName?.trim() || 'User',
      lastName: data.lastName?.trim() || '',
    });

    // Automatically provision Britsync Workspace for the user to bypass onboarding questions
    try {
      const orgName = 'Britsync Workspace';
      const cleanFirstName = (data.firstName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanLastName = (data.lastName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const randSuffix = Math.random().toString(36).substring(2, 7);
      const orgSlug = `britsync-${cleanFirstName}${cleanLastName ? '-' + cleanLastName : ''}-${randSuffix}`;

      await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: orgName,
            slug: orgSlug,
            industry: 'Technology',
            companySize: '1-10',
            createdBy: user.id,
            updatedBy: user.id,
          },
        });

        await tx.organizationMember.create({
          data: {
            userId: user.id,
            organizationId: org.id,
            role: 'SUPER_ADMIN',
          },
        });

        const workspace = await tx.workspace.create({
          data: {
            name: 'Default Workspace',
            description: 'Your default workspace',
            organizationId: org.id,
            createdBy: user.id,
            updatedBy: user.id,
          },
        });

        await tx.workspaceMember.create({
          data: {
            userId: user.id,
            workspaceId: workspace.id,
            role: 'SUPER_ADMIN',
          },
        });
      });
    } catch (orgError) {
      console.error('[AUTH] Auto-creating organization failed:', orgError.message);
    }

    return this.generateTokens(user);
  }

  async login(data: any) {
    if (!data.email || !data.password) {
      throw new BadRequestException('Email and password are required');
    }

    let user = await this.usersService.findByEmail(data.email);

    if (!user) {
      // In development only: auto-create user on first login if not present.
      // In production, unknown email must always fail.
      if (process.env.NODE_ENV !== 'production') {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        user = await this.usersService.create({
          email: data.email,
          passwordHash: hashedPassword,
          firstName: data.firstName?.trim() || data.email.split('@')[0] || 'User',
          lastName: data.lastName?.trim() || '',
          role: data.email === 'admin@Britsync.com' ? 'SUPER_ADMIN' : 'CLIENT',
        }).catch(() => null as any);
      }

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }
    } else {
      const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash).catch(() => false);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Repair legacy user records (e.g. shaheerkhanhyd5@gmail.com created during initial dev auto-create testing)
      if (user.email === 'shaheerkhanhyd5@gmail.com' && (!user.lastName || user.firstName === 'shaheerkhanhyd5')) {
        user = await this.usersService.update(user.id, {
          firstName: 'Shaheer',
          lastName: 'Khan',
        }).catch(() => user);
      }
    }

    return this.generateTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
      }).catch(() => null);

      if (!tokenRecord || tokenRecord.isRevoked || tokenRecord.expiresAt < new Date()) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      await this.prisma.refreshToken.update({ where: { id: tokenRecord.id }, data: { isRevoked: true } }).catch(() => null);

      return this.generateTokens(tokenRecord.user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string; profilePictureUrl?: string }) {
    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.profilePictureUrl !== undefined) updateData.profilePictureUrl = data.profilePictureUrl;

    const user = await this.usersService.update(userId, updateData);
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private async generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    try {
      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        }
      });
    } catch (e) {
      console.warn('[AUTH] Could not record refresh token in DB:', (e as Error).message);
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePictureUrl: user.profilePictureUrl,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
      }
    };
  }

  async forgotPassword(data: { email: string }) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) {
      return { message: 'Reset instructions sent if email exists' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.verificationToken.create({
      data: {
        token,
        type: 'PASSWORD_RESET',
        userId: user.id,
        expiresAt,
      }
    }).catch(() => null);

    console.log('[PASSWORD_RESET] Token generated for user:', user.email);
    return { message: 'Reset instructions sent if email exists' };
  }

  async resetPassword(data: any) {
    const tokenRecord = await this.prisma.verificationToken.findUnique({
      where: { token: data.token },
      include: { user: true }
    }).catch(() => null);

    if (!tokenRecord || tokenRecord.type !== 'PASSWORD_RESET' || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    await this.usersService.update(tokenRecord.userId, {
      passwordHash: hashedPassword,
    });

    await this.prisma.refreshToken.updateMany({ where: { userId: tokenRecord.userId }, data: { isRevoked: true } }).catch(() => null);

    await this.prisma.verificationToken.delete({
      where: { id: tokenRecord.id }
    }).catch(() => null);

    return { message: 'Password reset successfully' };
  }
}
