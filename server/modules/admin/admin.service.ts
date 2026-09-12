import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@server/database/database.module';
import {
  eq,
  and,
  count,
  desc,
  isNotNull,
  like,
  gte,
  lt,
  sql,
  inArray,
  or,
} from 'drizzle-orm';
import {
  post,
  appUser,
  report,
  announcement,
  notification,
  comment,
  postLike,
} from '@server/database/schema-standalone';
import type {
  Post,
  PostListResponse,
  User,
  Report,
  Announcement,
} from '@shared/api.interface';

export interface ReportListResponse {
  items: Report[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AnnouncementListResponse {
  items: Announcement[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OverviewStats {
  totalUsers: number;
  todayNewUsers: number;
  totalPosts: number;
  todayNewPosts: number;
  totalComments: number;
  todayNewComments: number;
  pendingVideos: number;
  pendingReports: number;
}

export interface DailyActiveUser {
  date: string;
  count: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ------- Admin guard -------

  async ensureAdmin(userId: string): Promise<void> {
    const rows = await this.db
      .select({ role: appUser.role })
      .from(appUser)
      .where(eq(appUser.id, userId));

    if (rows.length === 0) {
      throw new ForbiddenException('用户不存在');
    }
    if (rows[0].role !== 'admin') {
      throw new ForbiddenException('无管理员权限');
    }
  }

  // ------- Helpers -------

  private mapUser(row: typeof appUser.$inferSelect): User {
    return {
      id: row.id,
      phone: row.phone,
      nickname: row.nickname,
      avatarUrl: row.avatarUrl ?? null,
      bio: row.bio ?? '',
      role: (row.role as 'user' | 'admin') ?? 'user',
      status: row.status,
      lastNameChangeAt: row.lastNameChangeAt
        ? row.lastNameChangeAt.toISOString()
        : null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapPost(row: typeof post.$inferSelect & { user?: User | null }): Post {
    return {
      id: row.id,
      userId: row.userId,
      user: row.user ?? null,
      content: row.content,
      images: row.images ?? [],
      videoUrl: row.videoUrl ?? null,
      videoDuration: row.videoDuration ?? null,
      isAnonymous: row.isAnonymous,
      isPinned: row.isPinned,
      status: row.status,
      auditStatus:
        (row.auditStatus as 'pending' | 'approved' | 'rejected') ?? 'pending',
      auditNote: row.auditNote ?? null,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      shareCount: row.shareCount,
      isLiked: false,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapReport(row: typeof report.$inferSelect): Report {
    return {
      id: row.id,
      reporterId: row.reporterId,
      targetType: row.targetType as 'post' | 'comment' | 'user',
      targetId: row.targetId,
      reason: row.reason,
      status: row.status as 'pending' | 'approved' | 'rejected',
      adminNote: row.adminNote ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapAnnouncement(
    row: typeof announcement.$inferSelect & { admin?: User | null },
  ): Announcement {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      adminId: row.adminId,
      admin: row.admin as User,
      expireAt: row.expireAt ? row.expireAt.toISOString() : null,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private getTodayRange(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    );
    return { start, end };
  }

  private async sendNotification(
    userId: string,
    type: string,
    title: string,
    content: string,
    relatedId?: string,
  ): Promise<void> {
    await this.db.insert(notification).values({
      userId,
      type,
      title,
      content,
      relatedId: relatedId ?? null,
    });
    this.logger.log(`管理员发送通知给用户 ${userId}: ${title}`);
  }

  private async attachUsersToPosts(
    posts: (typeof post.$inferSelect)[],
  ): Promise<Post[]> {
    if (posts.length === 0) return [];
    const userIds = [...new Set(posts.map((p) => p.userId))];
    const userRows = await this.db
      .select()
      .from(appUser)
      .where(inArray(appUser.id, userIds));
    const userMap = new Map<string, User>();
    for (const u of userRows) {
      userMap.set(u.id, this.mapUser(u));
    }
    return posts.map((p) =>
      this.mapPost({ ...p, user: userMap.get(p.userId) ?? null }),
    );
  }

  // ------- Video Audit -------

  async getPendingVideos(
    page: number,
    pageSize: number,
    status?: string,
  ): Promise<PostListResponse> {
    const offset = (page - 1) * pageSize;

    const conditions = [isNotNull(post.videoUrl)];
    if (status) {
      conditions.push(eq(post.auditStatus, status));
    }

    const rows = await this.db
      .select()
      .from(post)
      .where(and(...conditions))
      .orderBy(desc(post.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countResult = await this.db
      .select({ count: count() })
      .from(post)
      .where(and(...conditions));
    const total = Number(countResult[0]?.count ?? 0);

    const items = await this.attachUsersToPosts(rows);
    return { items, total, page, pageSize };
  }

  async approveVideo(postId: string, adminId: string): Promise<Post> {
    const existing = await this.db
      .select()
      .from(post)
      .where(eq(post.id, postId));
    if (existing.length === 0) {
      throw new NotFoundException('视频帖子不存在');
    }

    const updated = await this.db
      .update(post)
      .set({ auditStatus: 'approved', auditNote: null, status: 'active' })
      .where(eq(post.id, postId))
      .returning();

    await this.sendNotification(
      existing[0].userId,
      'video_approved',
      '视频审核通过',
      '您发布的视频已通过审核，现已公开展示。',
      postId,
    );

    this.logger.log(`管理员 ${adminId} 审核通过视频 ${postId}`);
    const items = await this.attachUsersToPosts(updated);
    return items[0];
  }

  async rejectVideo(
    postId: string,
    reason: string,
    adminId: string,
  ): Promise<Post> {
    if (!reason?.trim()) {
      throw new BadRequestException('驳回原因不能为空');
    }
    const existing = await this.db
      .select()
      .from(post)
      .where(eq(post.id, postId));
    if (existing.length === 0) {
      throw new NotFoundException('视频帖子不存在');
    }

    const updated = await this.db
      .update(post)
      .set({ auditStatus: 'rejected', auditNote: reason, status: 'rejected' })
      .where(eq(post.id, postId))
      .returning();

    await this.sendNotification(
      existing[0].userId,
      'video_rejected',
      '视频审核未通过',
      `您发布的视频未通过审核，原因：${reason}`,
      postId,
    );

    this.logger.log(`管理员 ${adminId} 驳回视频 ${postId}: ${reason}`);
    const items = await this.attachUsersToPosts(updated);
    return items[0];
  }

  // ------- Report Audit -------

  async getReports(
    page: number,
    pageSize: number,
    status?: string,
  ): Promise<ReportListResponse> {
    const offset = (page - 1) * pageSize;

    const where = status ? eq(report.status, status) : undefined;

    const rows = await this.db
      .select()
      .from(report)
      .where(where)
      .orderBy(desc(report.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countResult = await this.db
      .select({ count: count() })
      .from(report)
      .where(where);
    const total = Number(countResult[0]?.count ?? 0);

    return {
      items: rows.map((r) => this.mapReport(r)),
      total,
      page,
      pageSize,
    };
  }

  async approveReport(
    reportId: string,
    note: string,
    action: 'delete' | 'warn' | 'ban',
    adminId: string,
  ): Promise<Report> {
    const existing = await this.db
      .select()
      .from(report)
      .where(eq(report.id, reportId));
    if (existing.length === 0) {
      throw new NotFoundException('举报不存在');
    }

    const reportRow = existing[0];

    await this.db.transaction(async (tx) => {
      await tx
        .update(report)
        .set({ status: 'approved', adminNote: note })
        .where(eq(report.id, reportId));

      if (action === 'delete') {
        if (reportRow.targetType === 'post') {
          await tx
            .update(post)
            .set({ status: 'deleted' })
            .where(eq(post.id, reportRow.targetId));
        } else if (reportRow.targetType === 'comment') {
          await tx
            .update(comment)
            .set({ status: 'deleted' })
            .where(eq(comment.id, reportRow.targetId));
        }
      } else if (action === 'ban') {
        let targetUserId: string | null = null;
        if (reportRow.targetType === 'user') {
          targetUserId = reportRow.targetId;
        } else if (reportRow.targetType === 'post') {
          const p = await tx
            .select({ userId: post.userId })
            .from(post)
            .where(eq(post.id, reportRow.targetId));
          if (p.length > 0) targetUserId = p[0].userId;
        } else if (reportRow.targetType === 'comment') {
          const c = await tx
            .select({ userId: comment.userId })
            .from(comment)
            .where(eq(comment.id, reportRow.targetId));
          if (c.length > 0) targetUserId = c[0].userId;
        }
        if (targetUserId) {
          await tx
            .update(appUser)
            .set({ status: 'banned' })
            .where(eq(appUser.id, targetUserId));
          await this.sendNotification(
            targetUserId,
            'account_banned',
            '账号已被封禁',
            `您的账号因违规被封禁，处理说明：${note}`,
          );
        }
      } else if (action === 'warn') {
        let targetUserId: string | null = null;
        if (reportRow.targetType === 'user') {
          targetUserId = reportRow.targetId;
        } else if (reportRow.targetType === 'post') {
          const p = await tx
            .select({ userId: post.userId })
            .from(post)
            .where(eq(post.id, reportRow.targetId));
          if (p.length > 0) targetUserId = p[0].userId;
        } else if (reportRow.targetType === 'comment') {
          const c = await tx
            .select({ userId: comment.userId })
            .from(comment)
            .where(eq(comment.id, reportRow.targetId));
          if (c.length > 0) targetUserId = c[0].userId;
        }
        if (targetUserId) {
          await this.sendNotification(
            targetUserId,
            'content_warning',
            '内容违规警告',
            `您被举报的内容存在违规行为，请及时整改。处理说明：${note}`,
          );
        }
      }
    });

    this.logger.log(
      `管理员 ${adminId} 审核通过举报 ${reportId}, action=${action}`,
    );

    const updated = await this.db
      .select()
      .from(report)
      .where(eq(report.id, reportId));
    return this.mapReport(updated[0]);
  }

  async rejectReport(
    reportId: string,
    note: string,
    adminId: string,
  ): Promise<Report> {
    const existing = await this.db
      .select()
      .from(report)
      .where(eq(report.id, reportId));
    if (existing.length === 0) {
      throw new NotFoundException('举报不存在');
    }

    const updated = await this.db
      .update(report)
      .set({ status: 'rejected', adminNote: note })
      .where(eq(report.id, reportId))
      .returning();

    await this.sendNotification(
      existing[0].reporterId,
      'report_rejected',
      '举报审核结果',
      `您提交的举报经核查不成立。说明：${note}`,
      reportId,
    );

    this.logger.log(`管理员 ${adminId} 驳回举报 ${reportId}: ${note}`);
    return this.mapReport(updated[0]);
  }

  // ------- Post Management -------

  async getPosts(
    page: number,
    pageSize: number,
    keyword?: string,
    status?: string,
  ): Promise<PostListResponse> {
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (keyword) {
      conditions.push(like(post.content, `%${keyword}%`));
    }
    if (status) {
      conditions.push(eq(post.status, status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select()
      .from(post)
      .where(where)
      .orderBy(desc(post.isPinned), desc(post.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countResult = await this.db
      .select({ count: count() })
      .from(post)
      .where(where);
    const total = Number(countResult[0]?.count ?? 0);

    const items = await this.attachUsersToPosts(rows);
    return { items, total, page, pageSize };
  }

  async pinPost(postId: string, adminId: string): Promise<Post> {
    const existing = await this.db
      .select()
      .from(post)
      .where(eq(post.id, postId));
    if (existing.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    const updated = await this.db
      .update(post)
      .set({ isPinned: true })
      .where(eq(post.id, postId))
      .returning();

    this.logger.log(`管理员 ${adminId} 置顶帖子 ${postId}`);
    const items = await this.attachUsersToPosts(updated);
    return items[0];
  }

  async unpinPost(postId: string, adminId: string): Promise<Post> {
    const existing = await this.db
      .select()
      .from(post)
      .where(eq(post.id, postId));
    if (existing.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    const updated = await this.db
      .update(post)
      .set({ isPinned: false })
      .where(eq(post.id, postId))
      .returning();

    this.logger.log(`管理员 ${adminId} 取消置顶帖子 ${postId}`);
    const items = await this.attachUsersToPosts(updated);
    return items[0];
  }

  async deletePost(postId: string, adminId: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(post)
      .where(eq(post.id, postId));
    if (existing.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    await this.db
      .update(post)
      .set({ status: 'deleted' })
      .where(eq(post.id, postId));

    await this.sendNotification(
      existing[0].userId,
      'post_deleted',
      '帖子已被删除',
      '您的帖子因违反社区规范已被管理员删除。',
      postId,
    );

    this.logger.log(`管理员 ${adminId} 删除帖子 ${postId}`);
  }

  // ------- User Management -------

  async getUsers(
    page: number,
    pageSize: number,
    keyword?: string,
    role?: string,
    status?: string,
  ): Promise<UserListResponse> {
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (keyword) {
      conditions.push(
        or(
          like(appUser.nickname, `%${keyword}%`),
          like(appUser.phone, `%${keyword}%`),
        ),
      );
    }
    if (role) {
      conditions.push(eq(appUser.role, role));
    }
    if (status) {
      conditions.push(eq(appUser.status, status));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select()
      .from(appUser)
      .where(where)
      .orderBy(desc(appUser.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countResult = await this.db
      .select({ count: count() })
      .from(appUser)
      .where(where);
    const total = Number(countResult[0]?.count ?? 0);

    return {
      items: rows.map((u) => this.mapUser(u)),
      total,
      page,
      pageSize,
    };
  }

  async banUser(userId: string, adminId: string): Promise<User> {
    const existing = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.id, userId));
    if (existing.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const updated = await this.db
      .update(appUser)
      .set({ status: 'banned' })
      .where(eq(appUser.id, userId))
      .returning();

    await this.sendNotification(
      userId,
      'account_banned',
      '账号已被封禁',
      '您的账号因违反社区规范已被管理员封禁。',
    );

    this.logger.log(`管理员 ${adminId} 封禁用户 ${userId}`);
    return this.mapUser(updated[0]);
  }

  async unbanUser(userId: string, adminId: string): Promise<User> {
    const existing = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.id, userId));
    if (existing.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const updated = await this.db
      .update(appUser)
      .set({ status: 'active' })
      .where(eq(appUser.id, userId))
      .returning();

    await this.sendNotification(
      userId,
      'account_unbanned',
      '账号已解封',
      '您的账号已被管理员解封，欢迎回来。',
    );

    this.logger.log(`管理员 ${adminId} 解封用户 ${userId}`);
    return this.mapUser(updated[0]);
  }

  async setUserRole(
    userId: string,
    role: 'user' | 'admin',
    adminId: string,
  ): Promise<User> {
    if (!['user', 'admin'].includes(role)) {
      throw new BadRequestException('无效的角色');
    }

    const existing = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.id, userId));
    if (existing.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const updated = await this.db
      .update(appUser)
      .set({ role })
      .where(eq(appUser.id, userId))
      .returning();

    this.logger.log(`管理员 ${adminId} 设置用户 ${userId} 角色为 ${role}`);
    return this.mapUser(updated[0]);
  }

  // ------- Announcement Management -------

  async getAnnouncements(
    page: number,
    pageSize: number,
  ): Promise<AnnouncementListResponse> {
    const offset = (page - 1) * pageSize;

    const rows = await this.db
      .select()
      .from(announcement)
      .orderBy(desc(announcement.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countResult = await this.db
      .select({ count: count() })
      .from(announcement);
    const total = Number(countResult[0]?.count ?? 0);

    const adminIds = [...new Set(rows.map((r) => r.adminId))];
    let adminMap = new Map<string, User>();
    if (adminIds.length > 0) {
      const adminRows = await this.db
        .select()
        .from(appUser)
        .where(inArray(appUser.id, adminIds));
      for (const u of adminRows) {
        adminMap.set(u.id, this.mapUser(u));
      }
    }

    const items = rows.map((r) =>
      this.mapAnnouncement({ ...r, admin: adminMap.get(r.adminId) ?? null }),
    );

    return { items, total, page, pageSize };
  }

  async createAnnouncement(
    adminId: string,
    title: string,
    content: string,
    expireAt?: string,
  ): Promise<Announcement> {
    if (!title?.trim()) throw new BadRequestException('标题不能为空');
    if (!content?.trim()) throw new BadRequestException('内容不能为空');

    const inserted = await this.db
      .insert(announcement)
      .values({
        adminId,
        title,
        content,
        expireAt: expireAt ? new Date(expireAt) : null,
      })
      .returning();

    this.logger.log(`管理员 ${adminId} 发布公告 ${inserted[0].id}`);
    const adminRow = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.id, adminId));
    return this.mapAnnouncement({
      ...inserted[0],
      admin: adminRow.length > 0 ? this.mapUser(adminRow[0]) : null,
    });
  }

  async updateAnnouncement(
    id: string,
    patch: { title?: string; content?: string; expireAt?: string | null; isActive?: boolean },
    adminId: string,
  ): Promise<Announcement> {
    const existing = await this.db
      .select()
      .from(announcement)
      .where(eq(announcement.id, id));
    if (existing.length === 0) {
      throw new NotFoundException('公告不存在');
    }

    const updateData: Partial<typeof announcement.$inferInsert> = {};
    if (patch.title !== undefined) updateData.title = patch.title;
    if (patch.content !== undefined) updateData.content = patch.content;
    if (patch.expireAt !== undefined) {
      updateData.expireAt = patch.expireAt ? new Date(patch.expireAt) : null;
    }
    if (patch.isActive !== undefined) updateData.isActive = patch.isActive;

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('未提供可更新字段');
    }

    const updated = await this.db
      .update(announcement)
      .set(updateData)
      .where(eq(announcement.id, id))
      .returning();

    this.logger.log(`管理员 ${adminId} 更新公告 ${id}`);
    const adminRow = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.id, adminId));
    return this.mapAnnouncement({
      ...updated[0],
      admin: adminRow.length > 0 ? this.mapUser(adminRow[0]) : null,
    });
  }

  async deleteAnnouncement(id: string, adminId: string): Promise<void> {
    const existing = await this.db
      .select()
      .from(announcement)
      .where(eq(announcement.id, id));
    if (existing.length === 0) {
      throw new NotFoundException('公告不存在');
    }

    await this.db.delete(announcement).where(eq(announcement.id, id));
    this.logger.log(`管理员 ${adminId} 删除公告 ${id}`);
  }

  // ------- Statistics -------

  async getOverviewStats(): Promise<OverviewStats> {
    const { start: todayStart, end: todayEnd } = this.getTodayRange();

    const todayStartDate = new Date(todayStart);
    const todayEndDate = new Date(todayEnd);

    const [
      totalUsersRes,
      todayUsersRes,
      totalPostsRes,
      todayPostsRes,
      totalCommentsRes,
      todayCommentsRes,
      pendingVideosRes,
      pendingReportsRes,
    ] = await Promise.all([
      this.db.select({ count: count() }).from(appUser),
      this.db
        .select({ count: count() })
        .from(appUser)
        .where(
          and(
            gte(appUser.createdAt, todayStartDate),
            lt(appUser.createdAt, todayEndDate),
          ),
        ),
      this.db.select({ count: count() }).from(post),
      this.db
        .select({ count: count() })
        .from(post)
        .where(
          and(gte(post.createdAt, todayStartDate), lt(post.createdAt, todayEndDate)),
        ),
      this.db.select({ count: count() }).from(comment),
      this.db
        .select({ count: count() })
        .from(comment)
        .where(
          and(
            gte(comment.createdAt, todayStartDate),
            lt(comment.createdAt, todayEndDate),
          ),
        ),
      this.db
        .select({ count: count() })
        .from(post)
        .where(
          and(isNotNull(post.videoUrl), eq(post.auditStatus, 'pending')),
        ),
      this.db
        .select({ count: count() })
        .from(report)
        .where(eq(report.status, 'pending')),
    ]);

    return {
      totalUsers: Number(totalUsersRes[0]?.count ?? 0),
      todayNewUsers: Number(todayUsersRes[0]?.count ?? 0),
      totalPosts: Number(totalPostsRes[0]?.count ?? 0),
      todayNewPosts: Number(todayPostsRes[0]?.count ?? 0),
      totalComments: Number(totalCommentsRes[0]?.count ?? 0),
      todayNewComments: Number(todayCommentsRes[0]?.count ?? 0),
      pendingVideos: Number(pendingVideosRes[0]?.count ?? 0),
      pendingReports: Number(pendingReportsRes[0]?.count ?? 0),
    };
  }

  async getDailyActiveUsers(): Promise<DailyActiveUser[]> {
    const now = new Date();
    const sevenDaysAgo = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6,
      0,
      0,
      0,
      0,
    );
    const startIso = sevenDaysAgo.toISOString();
    const endIso = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0,
    ).toISOString();

    // Union of active users from posts, comments, and likes
    const result = await this.db.execute<{ date: string; count: number }>(
      sql`
        SELECT
          date_trunc('day', active_time)::date AS date,
          COUNT(DISTINCT user_id) AS count
        FROM (
          SELECT user_id, _created_at AS active_time
          FROM ${post}
          WHERE _created_at >= ${startIso} AND _created_at < ${endIso}
          UNION
          SELECT user_id, _created_at AS active_time
          FROM ${comment}
          WHERE _created_at >= ${startIso} AND _created_at < ${endIso}
          UNION
          SELECT user_id, _created_at AS active_time
          FROM ${postLike}
          WHERE _created_at >= ${startIso} AND _created_at < ${endIso}
        ) AS combined
        GROUP BY date_trunc('day', active_time)::date
        ORDER BY date ASC
      `,
    );

    // Fill in missing days with 0
    const resultMap = new Map<string, number>();
    for (const row of result) {
      // date comes as Date string like "2026-09-05T00:00:00.000Z"
      const dateStr = typeof row.date === 'string'
        ? row.date.substring(0, 10)
        : new Date(row.date as unknown as string).toISOString().substring(0, 10);
      resultMap.set(dateStr, Number(row.count));
    }

    const dailyData: DailyActiveUser[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(
        sevenDaysAgo.getFullYear(),
        sevenDaysAgo.getMonth(),
        sevenDaysAgo.getDate() + i,
      );
      const dateStr = d.toISOString().substring(0, 10);
      dailyData.push({
        date: dateStr,
        count: resultMap.get(dateStr) ?? 0,
      });
    }

    return dailyData;
  }

  // ------- Send Notification -------

  async sendUserNotification(
    userId: string,
    title: string,
    content: string,
    type: string,
    adminId: string,
  ): Promise<{ id: string }> {
    const user = await this.db
      .select({ id: appUser.id })
      .from(appUser)
      .where(eq(appUser.id, userId));
    if (user.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const inserted = await this.db
      .insert(notification)
      .values({ userId, title, content, type })
      .returning({ id: notification.id });

    this.logger.log(`管理员 ${adminId} 给用户 ${userId} 发送通知: ${title}`);
    return { id: inserted[0].id };
  }
}
