import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Headers,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@server/database/database.module';
import { eq } from 'drizzle-orm';
import { PostService } from './post.service';
import { CommentService } from './comment.service';
import type {
  CreatePostDto,
  CreateCommentDto,
  CreateReportDto,
  PostListQuery,
} from './dto';
import type { Post as PostType, Comment, PostListResponse, Announcement, ApiResponse } from '@shared/api.interface';
import { extractUserIdFromRequest, verifyJwt } from '../auth/auth.service';
import { appUser } from '@server/database/schema-standalone';

@Controller('')
export class PostController {
  constructor(
    private readonly postService: PostService,
    private readonly commentService: CommentService,
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  @Get('posts')
  async getPosts(
    @Req() req: Request,
    @Query() query: PostListQuery,
  ): Promise<ApiResponse<PostListResponse>> {
    const userId = this.getOptionalUserId(req);
    const data = await this.postService.getPosts(query, userId);
    return { success: true, data, message: 'ok' };
  }

  @Get('posts/:id')
  async getPostById(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponse<PostType>> {
    const userId = this.getOptionalUserId(req);
    const data = await this.postService.getPostById(id, userId);
    return { success: true, data, message: 'ok' };
  }

  @Post('posts')
  async createPost(
    @Req() req: Request,
    @Body() dto: CreatePostDto,
  ): Promise<ApiResponse<PostType>> {
    const userId = this.requireUserId(req);
    const data = await this.postService.createPost(dto, userId);
    return { success: true, data, message: '发布成功' };
  }

  @Delete('posts/:id')
  async deletePost(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    const userId = this.requireUserId(req);
    const isAdmin = await this.isAdmin(req);
    await this.postService.deletePost(id, userId, isAdmin);
    return { success: true, data: { success: true }, message: '删除成功' };
  }

  @Post('posts/:id/like')
  async toggleLike(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ liked: boolean; likeCount: number }>> {
    const userId = this.requireUserId(req);
    const data = await this.postService.toggleLike(id, userId);
    return { success: true, data, message: 'ok' };
  }

  @Post('posts/:id/share')
  async sharePost(
    @Req() req: Request,
    @Param('id') id: string,
    @Headers('origin') origin?: string,
  ): Promise<ApiResponse<{ shareUrl: string; shareCount: number }>> {
    const shareOrigin = origin ?? 'https://campus.example.com';
    const data = await this.postService.sharePost(id, shareOrigin);
    return { success: true, data, message: 'ok' };
  }

  @Get('posts/:id/comments')
  async getComments(
    @Req() req: Request,
    @Param('id') postId: string,
  ): Promise<ApiResponse<Comment[]>> {
    const userId = this.getOptionalUserId(req);
    const data = await this.commentService.getCommentsByPostId(postId, userId);
    return { success: true, data, message: 'ok' };
  }

  @Post('comments')
  async createComment(
    @Req() req: Request,
    @Body() dto: CreateCommentDto,
  ): Promise<ApiResponse<Comment>> {
    const userId = this.requireUserId(req);
    const data = await this.commentService.createComment(dto, userId);
    return { success: true, data, message: '评论成功' };
  }

  @Post('comments/:id/like')
  async likeComment(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ liked: boolean; likeCount: number }>> {
    const userId = this.requireUserId(req);
    void userId;
    const data = await this.commentService.likeComment(id);
    return { success: true, data, message: 'ok' };
  }

  @Delete('comments/:id')
  async deleteComment(
    @Req() req: Request,
    @Param('id') id: string,
  ): Promise<ApiResponse<{ success: boolean }>> {
    const userId = this.requireUserId(req);
    const isAdmin = await this.isAdmin(req);
    await this.commentService.deleteComment(id, userId, isAdmin);
    return { success: true, data: { success: true }, message: '删除成功' };
  }

  @Get('announcements')
  async getActiveAnnouncements(): Promise<ApiResponse<Announcement[]>> {
    const data = await this.postService.getActiveAnnouncements();
    return { success: true, data, message: 'ok' };
  }

  @Post('reports')
  async createReport(
    @Req() req: Request,
    @Body() dto: CreateReportDto,
  ): Promise<ApiResponse<{ id: string; status: string }>> {
    const userId = this.requireUserId(req);
    if (!['post', 'comment', 'user'].includes(dto.targetType)) {
      throw new BadRequestException('无效的举报类型');
    }
    const data = await this.postService.createReport(
      userId,
      dto.targetType,
      dto.targetId,
      dto.reason,
    );
    return { success: true, data, message: '举报已提交' };
  }

  private getOptionalUserId(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const payload = verifyJwt(authHeader.slice(7));
    return payload?.userId ?? null;
  }

  private requireUserId(req: Request): string {
    return extractUserIdFromRequest(req);
  }

  private async isAdmin(req: Request): Promise<boolean> {
    const userId = this.getOptionalUserId(req);
    if (!userId) return false;
    const rows = await this.db
      .select({ role: appUser.role })
      .from(appUser)
      .where(eq(appUser.id, userId));
    return rows.length > 0 && rows[0].role === 'admin';
  }
}
