import { Module } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController, InvitationsController } from './team.controller';

@Module({
  controllers: [TeamController, InvitationsController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
