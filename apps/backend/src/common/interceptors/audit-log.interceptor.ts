import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, user, ip, headers } = req;

    // Only audit non-GET state-mutating requests (POST, PUT, PATCH, DELETE)
    if (method === 'GET') {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async (resData) => {
          const duration = Date.now() - startTime;
          const auditPayload = {
            userId: user?.id || 'ANONYMOUS',
            action: `${method} ${url}`,
            module: this.extractModule(url),
            ipAddress: ip || headers['x-forwarded-for'] || '127.0.0.1',
            userAgent: headers['user-agent'] || 'UNKNOWN',
            durationMs: duration,
            timestamp: new Date().toISOString(),
          };

          this.logger.log(`[AUDIT] ${auditPayload.action} - User: ${auditPayload.userId} (${duration}ms)`);

          // Asynchronously record user activity log if user and organization context exists
          if (user?.id && user?.organizationId) {
            try {
              await this.prisma.userActivity.create({
                data: {
                  userId: user.id,
                  organizationId: user.organizationId,
                  action: `${method} ${url}`,
                  module: auditPayload.module,
                  metadata: JSON.stringify({
                    durationMs: duration,
                    userAgent: auditPayload.userAgent,
                  }),
                  ipAddress: auditPayload.ipAddress,
                },
              });
            } catch (err) {
              // Non-blocking log failure swallow
            }
          }
        },
        error: (err) => {
          this.logger.warn(`[AUDIT-FAILED] ${method} ${url} - Error: ${err.message}`);
        },
      }),
    );
  }

  private extractModule(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts.length > 0 ? parts[0].toUpperCase() : 'CORE';
  }
}
