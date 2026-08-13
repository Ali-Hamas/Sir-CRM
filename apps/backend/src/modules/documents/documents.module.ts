import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { StorageService } from './storage.service';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, StorageService],
  exports: [DocumentsService, StorageService],
})
export class DocumentsModule {}
