import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminService } from './admin.service';
import { verifyJwt } from '../auth/auth.service';
import type {
  VideoListQuery,
  RejectVideoDto,
  ReportListQuery,
  ApproveReportDto,
  RejectReportDto,
  PostListQuery,
  UserListQuery,
  SetRoleDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  SendNotificationDto,
} from './dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private getAdminUserId(req: Request): string {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ForbiddenException('未登录');
    }
    const payload = verifyJwt(authHeader.slice(7));
    if (!payload) {
      throw new ForbiddenException('登录已过期');
    }
    return payload.userId;
  }

  private async requireAdmin(req: Request): Promise<string> {
    const userId = this.getAdminUserId(req);
    await this.adminService.ensureAdmin(userId);
    return userId;
  }

  // ------- Video Audit -------

  @Get('videos')
  async getVideos(@Req() req: Request, @Query() query: VideoListQuery) {
    const adminId = await this.requireAdmin(req);
    const page = parseInt(query.page ?? '1', 10);
    const pageSize = Math.min(parseInt(query.pageSize ?? '20', 10), 100);
    return this.adminService.getPendingVideos(page, pageSize, query.status);
  }

  @Post('videos/:id/approve')
  async approveVideo(@Req() req: Request, @Param('id') id: string) {
    const adminId = await this.requireAdmin(req);
    return this.adminService.approveVideo(id, adminId);
  }

  @Post('videos/:id/reject')
  async rejectVideo(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: RejectVideoDto,
  ) {
    const adminId = await this.requireAdmin(req);
    return this.adminService.rejectVideo(id, body.reason, adminId);
  }

  // ------- Report Audit -------

  @Get('reports')
  async getReports(@Req() req: Request, @Query() query: ReportListQuery) {
    const adminId = await this.requireAdmin(req);
    const page = parseInt(query.page ?? '1', 10);
    const pageSize = Math.min(parseInt(query.pageSize ?? '20', 10), 100);
    return this.adminService.getReports(page, pageSize, query.status);
  }

  @Post('reports/:id/approve')
  async approveReport(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: ApproveReportDto,
  ) {
    const adminId = await this.requireAdmin(req);
    return this.adminService.approveReport(id, body.note, body.action, adminId);
  }

  @Post('reports/:id/reject')
  async rejectReport(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: RejectReportDto,
  ) {
    const adminId = await this.requireAdmin(req);
    return this.adminService.rejectReport(id, body.note, adminId);
  }

  // ------- Post Management -------

  @Get('posts')
  async getPosts(@Req() req: Request, @Query() query: PostListQuery) {
    const adminId = await this.requireAdmin(req);
    const page = parseInt(query.page ?? '1', 10);
    const pageSize = Math.min(parseInt(query.pageSize ?? '20', 10), 100);
    return this.adminService.getPosts(
      page,
      pageSize,
      query.keyword,
      query.status,
    );
  }

  @Post('posts/:id/pin')
  async pinPost(@Req() req: Request, @Param('id') id: string) {
    const adminId = await this.requireAdmin(req);
    return this.adminService.pinPost(id, adminId);
  }

  @Post('posts/:id/unpin')
  async unpinPost(@Req() req: Request, @Param('id') id: string) {
    const adminId = await this.requireAdmin(req);
    return this.adminService.unpinPost(id, adminId);
  }

  @Delete('posts/:id')
  async deletePost(@Req() req: Request, @Param('id') id: string) {
    const adminId = await this.requireAdmin(req);
    await this.adminService.deletePost(id, adminId);
    return { success: true };
  }

  // ------- User Management -------

  @Get('users')
  async getUsers(@Req() req: Request, @Query() query: UserListQuery) {
    const adminId = await this.requireAdmin(req);
    const page = parseInt(query.page ?? '1', 10);
    const pageSize = Math.min(parseInt(query.pageSize ?? '20', 10), 100);
    return this.adminService.getUsers(
      page,
      pageSize,
      query.keyword,
      query.role,
      query.status,
    );
  }

  @Post('users/:id/ban')
  async banUser(@Req() req: Request, @Param('id') id: string) {
    const adminId = await this.requireAdmin(req);
    return this.adminService.banUser(id, adminId);
  }

  @Post('users/:id/unban')
  async unbanUser(@Req() req: Request, @Param('id') id: string) {
    const adminId = await this.requireAdmin(req);
    return this.adminService.unbanUser(id, adminId);
  }

  @Post('users/:id/set-role')
  async setRole(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: SetRoleDto,
  ) {
    const adminId = await this.requireAdmin(req);
    return this.adminService.setUserRole(id, body.role, adminId);
  }

  // ------- Announcement Management -------

  @Get('announcements')
  async getAnnouncements(
    @Req() req: Request,
    @Query('page') pageParam?: string,
    @Query('pageSize') pageSizeParam?: string,
  ) {
    const adminId = await this.requireAdmin(req);
    const page = parseInt(pageParam ?? '1', 10);
    const pageSize = Math.min(parseInt(pageSizeParam ?? '20', 10), 100);
    return this.adminService.getAnnouncements(page, pageSize);
  }

  @Post('announcements')
  async createAnnouncement(
    @Req() req: Request,
    @Body() body: CreateAnnouncementDto,
  ) {
    const adminId = await this.requireAdmin(req);
    return this.adminService.createAnnouncement(
      adminId,
      body.title,
      body.content,
      body.expireAt,
    );
  }

  @Patch('announcements/:id')
  async updateAnnouncement(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateAnnouncementDto,
  ) {
    const adminId = await this.requireAdmin(req);
    return this.adminService.updateAnnouncement(id, body, adminId);
  }

  @Delete('announcements/:id')
  async deleteAnnouncement(@Req() req: Request, @Param('id') id: string) {
    const adminId = await this.requireAdmin(req);
    await this.adminService.deleteAnnouncement(id, adminId);
    return { success: true };
  }

  // ------- Statistics -------

  @Get('stats/overview')
  async getStatsOverview(@Req() req: Request) {
    await this.requireAdmin(req);
    return this.adminService.getOverviewStats();
  }

  @Get('stats/users')
  async getStatsUsers(@Req() req: Request) {
    await this.requireAdmin(req);
    return this.adminService.getDailyActiveUsers();
  }

  // ------- Notification -------

  @Post('notifications/send')
  async sendNotification(
    @Req() req: Request,
    @Body() body: SendNotificationDto,
  ) {
    const adminId = await this.requireAdmin(req);
    return this.adminService.sendUserNotification(
      body.userId,
      body.title,
      body.content,
      body.type,
      adminId,
    );
  }
}
