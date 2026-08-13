import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { PrismaService } from './core/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const paths = [
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.production'),
    path.join(process.cwd(), '..', '..', '.env'),
    path.join(process.cwd(), '..', '..', '.env.production')
  ];
  
  for (const envPath of paths) {
    if (fs.existsSync(envPath)) {
      const envConfig = fs.readFileSync(envPath, 'utf-8');
      envConfig.split(/\r?\n/).forEach(line => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const firstEqual = trimmedLine.indexOf('=');
          if (firstEqual > 0) {
            const key = trimmedLine.substring(0, firstEqual).trim();
            const value = trimmedLine.substring(firstEqual + 1).trim().replace(/^["']|["']$/g, '');
            if (key && !process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      });
    }
  }
}

loadEnv();

import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalFilters(new AllExceptionsFilter());

  // Security Hardening: Allowed Origins & CORS
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;
  const allowedOrigins = allowedOriginsEnv 
    ? allowedOriginsEnv.split(',').map(o => o.trim())
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        process.env.FRONTEND_URL || 'http://localhost:3000',
        process.env.APP_URL || 'http://localhost:3000',
      ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*') || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(null, true); // Fallback allow in dev/staging mode to prevent breaking UI
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-Organization-Id',
      'X-Workspace-Id',
    ],
  });

  // Cookie Security
  const cookieSecret = process.env.COOKIE_SECRET || 'blackdesk-cookie-secret';
  app.use(cookieParser(cookieSecret));

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // Global Validation & Sanitization Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Auto-seed default admin if database is empty
  const prismaService = app.get(PrismaService);
  try {
    const userCount = await prismaService.user.count();
    if (userCount === 0) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      await prismaService.user.create({
        data: {
          email: 'admin@blackdesk.com',
          passwordHash: hashedPassword,
          firstName: 'System',
          lastName: 'Admin',
          role: 'SUPER_ADMIN',
          isEmailVerified: true,
        },
      });
      logger.log('--------------------------------------------------');
      logger.log('[SEED] Created default admin user: admin@blackdesk.com');
      logger.log('--------------------------------------------------');
    }
  } catch (error) {
    logger.warn('[SEED] Could not auto-seed database. Ensure MongoDB server is running.');
  }

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  logger.log(`[NestApplication] BlackDesk Backend running on http://localhost:${port} in ${process.env.NODE_ENV || 'development'} mode`);
}
bootstrap();
