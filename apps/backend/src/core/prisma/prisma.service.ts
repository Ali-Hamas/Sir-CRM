import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@blackdesk/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to the database.');
    } catch (error) {
      this.logger.error('Failed to connect to the database on startup. Queries will fail until the database server is running.', error.message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
