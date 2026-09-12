import { Controller, Post, Get, Param, Query, Req, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { NotificationService } from './notification.service';
import { NotificationListQueryDto } from './dto';
import type { Notification, NotificationListResponse, UnreadCountResponse } from '@shared/api.interface';
import { extractUserIdFromRequest } from '../auth/auth.service';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(
    @Req() req: Request,
    @Query() query: NotificationListQueryDto,
  ): Promise<{ data: NotificationListResponse }> {
    const userId = extractUserIdFromRequest(req);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const result = await this.notificationService.getNotifications(userId, page, pageSize);
    return { data: result };
  }

  @Post(':id/read')
  async markAsRead(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<{ data: Notification }> {
    const userId = extractUserIdFromRequest(req);
    const notification = await this.notificationService.markAsRead(userId, id);
    return { data: notification };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(
    @Req() req: Request,
  ): Promise<{ data: { updated: number } }> {
    const userId = extractUserIdFromRequest(req);
    const result = await this.notificationService.markAllAsRead(userId);
    return { data: result };
  }

  @Get('unread-count')
  async getUnreadCount(
    @Req() req: Request,
  ): Promise<{ data: UnreadCountResponse }> {
    const userId = extractUserIdFromRequest(req);
    const result = await this.notificationService.getUnreadCount(userId);
    return { data: result };
  }
}
