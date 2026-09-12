import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, desc, sql, inArray, gte, lt, asc } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@server/database/database.module';
import {
  post,
  appUser,
  postLike,
  comment,
  report,
  announcement,
} from '@server/database/schema-standalone';
import type { Post as PostType, User } from '@shared/api.interface';
import type { CreatePostDto, LikeResult, PostListQuery, ShareResult } from './dto';

const SENSITIVE_WORDS = [
  '傻逼', '傻B', 'SB', 'sb',
  '操你', '草你', '艹你',
  '去死', '滚蛋', '脑残',
  '废物', '垃圾人',
  '妈的', '妈的', '他妈的',
  '贱人', '混蛋', '王八蛋',
];

export function containsSensitiveWords(text: string): boolean {
  const lower = text.toLowerCase();
  return SENSITIVE_WORDS.some((word: string) => lower.includes(word.toLowerCase()));
}

function mapUser(row: { userId?: string; nickname?: string | null; avatarUrl?: string | null; role?: string } | undefined, isAnonymous: boolean): User | null {
  if (isAnonymous) {
    return {
      id: '',
      phone: '',
      nickname: '匿名',
      avatarUrl: null,
      bio: '',
      role: 'user',
      status: 'active',
      lastNameChangeAt: null,
      createdAt: '',
    };
  }
  if (!row || !row.userId) return null;
  return {
    id: row.userId,
    phone: '',
    nickname: row.nickname ?? '',
    avatarUrl: row.avatarUrl ?? null,
    bio: '',
    role: (row.role as 'user' | 'admin') ?? 'user',
    status: 'active',
    lastNameChangeAt: null,
    createdAt: '',
  };
}

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getPosts(query: PostListQuery, currentUserId: string | null): Promise<{ items: PostType[]; total: number; page: number; pageSize: number }> {
    const page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize ?? '20', 10) || 20));
    const offset = (page - 1) * pageSize;
    const tab = query.tab === 'hot' ? 'hot' : 'latest';

    const baseWhere = and(
      eq(post.status, 'active'),
      eq(post.auditStatus, 'approved'),
    );

    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(post)
      .where(baseWhere);
    const total = Number(totalResult[0]?.count ?? 0);

    let orderClause;
    if (tab === 'hot') {
      orderClause = [desc(post.isPinned), desc(sql`${post.likeCount} + ${post.commentCount} * 2`), desc(post.createdAt)];
    } else {
      orderClause = [desc(post.isPinned), desc(post.createdAt)];
    }

    const rows = await this.db
      .select({
        id: post.id,
        userId: post.userId,
        content: post.content,
        images: post.images,
        videoUrl: post.videoUrl,
        videoDuration: post.videoDuration,
        isAnonymous: post.isAnonymous,
        isPinned: post.isPinned,
        status: post.status,
        auditStatus: post.auditStatus,
        auditNote: post.auditNote,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        shareCount: post.shareCount,
        createdAt: post.createdAt,
        userNickname: appUser.nickname,
        userAvatarUrl: appUser.avatarUrl,
        userRole: appUser.role,
      })
      .from(post)
      .leftJoin(appUser, eq(post.userId, appUser.id))
      .where(baseWhere)
      .orderBy(...orderClause)
      .limit(pageSize)
      .offset(offset);

    const postIds = rows.map((r) => r.id);
    const likedSet = new Set<string>();
    if (currentUserId && postIds.length > 0) {
      const likedRows = await this.db
        .select({ postId: postLike.postId })
        .from(postLike)
        .where(and(
          inArray(postLike.postId, postIds),
          eq(postLike.userId, currentUserId),
        ));
      for (const r of likedRows) likedSet.add(r.postId);
    }

    const items: PostType[] = rows.map((row) => ({
      id: row.id,
      userId: row.isAnonymous ? '' : row.userId,
      user: mapUser({
        userId: row.userId,
        nickname: row.userNickname,
        avatarUrl: row.userAvatarUrl,
        role: row.userRole,
      }, row.isAnonymous),
      content: row.content,
      images: row.images ?? [],
      videoUrl: row.videoUrl ?? null,
      videoDuration: row.videoDuration ?? null,
      isAnonymous: row.isAnonymous,
      isPinned: row.isPinned,
      status: row.status,
      auditStatus: row.auditStatus as 'pending' | 'approved' | 'rejected',
      auditNote: row.auditNote ?? null,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      shareCount: row.shareCount,
      isLiked: likedSet.has(row.id),
      createdAt: row.createdAt.toISOString(),
    }));

    return { items, total, page, pageSize };
  }

  async getPostById(id: string, currentUserId: string | null): Promise<PostType> {
    const rows = await this.db
      .select({
        id: post.id,
        userId: post.userId,
        content: post.content,
        images: post.images,
        videoUrl: post.videoUrl,
        videoDuration: post.videoDuration,
        isAnonymous: post.isAnonymous,
        isPinned: post.isPinned,
        status: post.status,
        auditStatus: post.auditStatus,
        auditNote: post.auditNote,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        shareCount: post.shareCount,
        createdAt: post.createdAt,
        userNickname: appUser.nickname,
        userAvatarUrl: appUser.avatarUrl,
        userRole: appUser.role,
      })
      .from(post)
      .leftJoin(appUser, eq(post.userId, appUser.id))
      .where(eq(post.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    const row = rows[0];
    const isLiked = currentUserId
      ? (await this.db
          .select({ id: postLike.id })
          .from(postLike)
          .where(and(eq(postLike.postId, id), eq(postLike.userId, currentUserId)))
          .limit(1)).length > 0
      : false;

    return {
      id: row.id,
      userId: row.isAnonymous ? '' : row.userId,
      user: mapUser({
        userId: row.userId,
        nickname: row.userNickname,
        avatarUrl: row.userAvatarUrl,
        role: row.userRole,
      }, row.isAnonymous),
      content: row.content,
      images: row.images ?? [],
      videoUrl: row.videoUrl ?? null,
      videoDuration: row.videoDuration ?? null,
      isAnonymous: row.isAnonymous,
      isPinned: row.isPinned,
      status: row.status,
      auditStatus: row.auditStatus as 'pending' | 'approved' | 'rejected',
      auditNote: row.auditNote ?? null,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      shareCount: row.shareCount,
      isLiked,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async createPost(dto: CreatePostDto, userId: string): Promise<PostType> {
    if (!dto.content || dto.content.trim().length === 0) {
      throw new BadRequestException('帖子内容不能为空');
    }
    if (dto.content.length > 500) {
      throw new BadRequestException('帖子内容不能超过500字');
    }
    if (containsSensitiveWords(dto.content)) {
      throw new BadRequestException('帖子内容包含敏感词，请修改后再发布');
    }

    const hasVideo = Boolean(dto.videoUrl);
    const auditStatus = hasVideo ? 'pending' : 'approved';
    const status = 'active';

    const inserted = await this.db
      .insert(post)
      .values({
        userId,
        content: dto.content,
        images: dto.images ?? [],
        videoUrl: dto.videoUrl ?? null,
        videoDuration: dto.videoDuration ?? null,
        isAnonymous: dto.isAnonymous ?? false,
        isPinned: false,
        status,
        auditStatus,
        likeCount: 0,
        commentCount: 0,
        shareCount: 0,
      })
      .returning();

    const created = inserted[0];
    this.logger.log(`用户 ${userId} 发布帖子 ${created.id}`);

    return this.getPostById(created.id, userId);
  }

  async deletePost(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const rows = await this.db
      .select({ id: post.id, userId: post.userId })
      .from(post)
      .where(eq(post.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    const postRow = rows[0];
    if (postRow.userId !== userId && !isAdmin) {
      throw new ForbiddenException('无权限删除该帖子');
    }

    const updated = await this.db
      .update(post)
      .set({ status: 'deleted' })
      .where(eq(post.id, id))
      .returning({ id: post.id });

    if (updated.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    this.logger.log(`用户 ${userId} 删除帖子 ${id}`);
  }

  async toggleLike(postId: string, userId: string): Promise<LikeResult> {
    const postRows = await this.db
      .select({ id: post.id })
      .from(post)
      .where(eq(post.id, postId))
      .limit(1);
    if (postRows.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    let liked = false;
    let likeCount = 0;

    await this.db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: postLike.id })
        .from(postLike)
        .where(and(eq(postLike.postId, postId), eq(postLike.userId, userId)))
        .limit(1);

      if (existing.length > 0) {
        await tx
          .delete(postLike)
          .where(and(eq(postLike.postId, postId), eq(postLike.userId, userId)));
        const updated = await tx
          .update(post)
          .set({ likeCount: sql`${post.likeCount} - 1` })
          .where(eq(post.id, postId))
          .returning({ likeCount: post.likeCount });
        liked = false;
        likeCount = updated[0]?.likeCount ?? 0;
      } else {
        await tx
          .insert(postLike)
          .values({ postId, userId });
        const updated = await tx
          .update(post)
          .set({ likeCount: sql`${post.likeCount} + 1` })
          .where(eq(post.id, postId))
          .returning({ likeCount: post.likeCount });
        liked = true;
        likeCount = updated[0]?.likeCount ?? 0;
      }
    });

    return { liked, likeCount };
  }

  async sharePost(postId: string, origin: string): Promise<ShareResult> {
    const rows = await this.db
      .select({ id: post.id, shareCount: post.shareCount })
      .from(post)
      .where(eq(post.id, postId))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    const updated = await this.db
      .update(post)
      .set({ shareCount: sql`${post.shareCount} + 1` })
      .where(eq(post.id, postId))
      .returning({ shareCount: post.shareCount });

    const shareUrl = `${origin}/post/${postId}`;

    return {
      shareUrl,
      shareCount: updated[0]?.shareCount ?? rows[0].shareCount + 1,
    };
  }

  async createReport(
    reporterId: string,
    targetType: 'post' | 'comment' | 'user',
    targetId: string,
    reason: string,
  ): Promise<{ id: string; status: string }> {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('举报理由不能为空');
    }
    if (reason.length > 500) {
      throw new BadRequestException('举报理由不能超过500字');
    }

    if (targetType === 'post') {
      const exists = await this.db
        .select({ id: post.id })
        .from(post)
        .where(eq(post.id, targetId))
        .limit(1);
      if (exists.length === 0) throw new NotFoundException('被举报的帖子不存在');
    } else if (targetType === 'comment') {
      const exists = await this.db
        .select({ id: comment.id })
        .from(comment)
        .where(eq(comment.id, targetId))
        .limit(1);
      if (exists.length === 0) throw new NotFoundException('被举报的评论不存在');
    } else if (targetType === 'user') {
      const exists = await this.db
        .select({ id: appUser.id })
        .from(appUser)
        .where(eq(appUser.id, targetId))
        .limit(1);
      if (exists.length === 0) throw new NotFoundException('被举报的用户不存在');
    }

    const inserted = await this.db
      .insert(report)
      .values({
        reporterId,
        targetType,
        targetId,
        reason,
        status: 'pending',
      })
      .returning({ id: report.id, status: report.status });

    this.logger.log(`用户 ${reporterId} 举报 ${targetType} ${targetId}`);

    return { id: inserted[0].id, status: inserted[0].status };
  }

  async getActiveAnnouncements() {
    const nowIso = new Date().toISOString();
    const rows = await this.db
      .select({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        adminId: announcement.adminId,
        expireAt: announcement.expireAt,
        isActive: announcement.isActive,
        createdAt: announcement.createdAt,
        adminId2: appUser.id,
        adminNickname: appUser.nickname,
        adminAvatar: appUser.avatarUrl,
        adminRole: appUser.role,
      })
      .from(announcement)
      .leftJoin(appUser, eq(announcement.adminId, appUser.id))
      .where(
        and(
          eq(announcement.isActive, true),
          sql`(${announcement.expireAt} IS NULL OR ${announcement.expireAt} > ${nowIso})`,
        ),
      )
      .orderBy(desc(announcement.createdAt))
      .limit(10);

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      adminId: r.adminId,
      admin: {
        id: r.adminId2 ?? r.adminId,
        phone: '',
        nickname: r.adminNickname ?? '管理员',
        avatarUrl: r.adminAvatar ?? null,
        bio: null,
        role: (r.adminRole as 'user' | 'admin') ?? 'admin',
        status: 'active',
        lastNameChangeAt: null,
        createdAt: '',
      },
      expireAt: r.expireAt ? r.expireAt.toISOString() : null,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
