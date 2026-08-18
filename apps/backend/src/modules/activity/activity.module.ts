import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController, ActivitiesAliasController } from './activity.controller';

@Module({
  controllers: [ActivityController, ActivitiesAliasController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}

