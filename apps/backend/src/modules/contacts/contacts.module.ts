import { Module } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { ContactsController } from './contacts.controller';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
