import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req: any, @Param('orgId') orgId: string, @Query() query: any) {
    return this.notificationsService.getUserNotifications(req.user.id, orgId, query);
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: any, @Param('orgId') orgId: string) {
    return this.notificationsService.getUnreadCount(req.user.id, orgId);
  }

  @Patch('mark-all-read')
  markAllAsRead(@Req() req: any, @Param('orgId') orgId: string) {
    return this.notificationsService.markAllAsRead(req.user.id, orgId);
  }

  @Patch(':id/read')
  markAsRead(@Req() req: any, @Param('orgId') orgId: string, @Param('id') id: string) {
    return this.notificationsService.markAsRead(req.user.id, orgId, id);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('orgId') orgId: string, @Param('id') id: string) {
    return this.notificationsService.deleteNotification(req.user.id, orgId, id);
  }

  // Preferences
  @Get('preferences')
  getPreferences(@Req() req: any): Promise<any> {
    return this.notificationsService.getPreferences(req.user.id);
  }

  @Patch('preferences')
  updatePreferences(@Req() req: any, @Body() data: any): Promise<any> {
    return this.notificationsService.updatePreferences(req.user.id, data);
  }
}
