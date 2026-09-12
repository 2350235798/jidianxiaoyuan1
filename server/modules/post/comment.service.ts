import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@server/database/database.module';
import { comment, appUser, post } from '@server/database/schema-standalone';
import type { Comment, User } from '@shared/api.interface';
import type { CreateCommentDto } from './dto';
import { containsSensitiveWords } from './post.service';

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
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async getCommentsByPostId(postId: string, currentUserId: string | null): Promise<Comment[]> {
    const postExists = await this.db
      .select({ id: post.id })
      .from(post)
      .where(eq(post.id, postId))
      .limit(1);
    if (postExists.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    const topLevelRows = await this.db
      .select({
        id: comment.id,
        postId: comment.postId,
        userId: comment.userId,
        parentId: comment.parentId,
        content: comment.content,
        isAnonymous: comment.isAnonymous,
        likeCount: comment.likeCount,
        createdAt: comment.createdAt,
        userNickname: appUser.nickname,
        userAvatarUrl: appUser.avatarUrl,
        userRole: appUser.role,
      })
      .from(comment)
      .leftJoin(appUser, eq(comment.userId, appUser.id))
      .where(and(
        eq(comment.postId, postId),
        eq(comment.status, 'active'),
        sql`${comment.parentId} IS NULL`,
      ))
      .orderBy(desc(comment.createdAt))
      .limit(50);

    if (topLevelRows.length === 0) {
      return [];
    }

    const topLevelIds = topLevelRows.map((r) => r.id);

    const replyRows = await this.db
      .select({
        id: comment.id,
        postId: comment.postId,
        userId: comment.userId,
        parentId: comment.parentId,
        content: comment.content,
        isAnonymous: comment.isAnonymous,
        likeCount: comment.likeCount,
        createdAt: comment.createdAt,
        userNickname: appUser.nickname,
        userAvatarUrl: appUser.avatarUrl,
        userRole: appUser.role,
      })
      .from(comment)
      .leftJoin(appUser, eq(comment.userId, appUser.id))
      .where(and(
        eq(comment.postId, postId),
        eq(comment.status, 'active'),
        inArray(comment.parentId, topLevelIds),
      ))
      .orderBy(desc(comment.createdAt));

    const repliesByParent = new Map<string, typeof replyRows>();
    for (const r of replyRows) {
      const pid = r.parentId as string;
      if (!repliesByParent.has(pid)) {
        repliesByParent.set(pid, []);
      }
      const arr = repliesByParent.get(pid)!;
      if (arr.length < 3) {
        arr.push(r);
      }
    }

    const allCommentIds = [
      ...topLevelRows.map((r) => r.id),
      ...replyRows.map((r) => r.id),
    ];
    const likedSet = new Set<string>();
    if (currentUserId && allCommentIds.length > 0) {
      // Comment likes not tracked in schema, skip
    }

    const toComment = (row: typeof topLevelRows[0]): Comment => ({
      id: row.id,
      postId: row.postId,
      userId: row.isAnonymous ? '' : row.userId,
      user: mapUser({
        userId: row.userId,
        nickname: row.userNickname,
        avatarUrl: row.userAvatarUrl,
        role: row.userRole,
      }, row.isAnonymous),
      parentId: row.parentId ?? null,
      content: row.content,
      isAnonymous: row.isAnonymous,
      likeCount: row.likeCount,
      isLiked: likedSet.has(row.id),
      createdAt: row.createdAt.toISOString(),
    });

    return topLevelRows.map((row) => {
      const base = toComment(row);
      const replyList = repliesByParent.get(row.id) ?? [];
      base.replies = replyList.map((r) => toComment(r));
      return base;
    });
  }

  async createComment(dto: CreateCommentDto, userId: string): Promise<Comment> {
    if (!dto.content || dto.content.trim().length === 0) {
      throw new BadRequestException('评论内容不能为空');
    }
    if (dto.content.length > 300) {
      throw new BadRequestException('评论内容不能超过300字');
    }
    if (containsSensitiveWords(dto.content)) {
      throw new BadRequestException('评论内容包含敏感词，请修改后再发表');
    }

    const postExists = await this.db
      .select({ id: post.id })
      .from(post)
      .where(eq(post.id, dto.postId))
      .limit(1);
    if (postExists.length === 0) {
      throw new NotFoundException('帖子不存在');
    }

    if (dto.parentId) {
      const parentExists = await this.db
        .select({ id: comment.id, postId: comment.postId, parentId: comment.parentId })
        .from(comment)
        .where(eq(comment.id, dto.parentId))
        .limit(1);
      if (parentExists.length === 0) {
        throw new NotFoundException('父评论不存在');
      }
      if (parentExists[0].postId !== dto.postId) {
        throw new BadRequestException('父评论不属于该帖子');
      }
    }

    let createdId = '';
    await this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(comment)
        .values({
          postId: dto.postId,
          userId,
          parentId: dto.parentId ?? null,
          content: dto.content,
          isAnonymous: dto.isAnonymous ?? false,
          status: 'active',
          likeCount: 0,
        })
        .returning({ id: comment.id });
      createdId = inserted[0].id;

      await tx
        .update(post)
        .set({ commentCount: sql`${post.commentCount} + 1` })
        .where(eq(post.id, dto.postId));
    });

    this.logger.log(`用户 ${userId} 在帖子 ${dto.postId} 发表评论 ${createdId}`);

    const rows = await this.db
      .select({
        id: comment.id,
        postId: comment.postId,
        userId: comment.userId,
        parentId: comment.parentId,
        content: comment.content,
        isAnonymous: comment.isAnonymous,
        likeCount: comment.likeCount,
        createdAt: comment.createdAt,
        userNickname: appUser.nickname,
        userAvatarUrl: appUser.avatarUrl,
        userRole: appUser.role,
      })
      .from(comment)
      .leftJoin(appUser, eq(comment.userId, appUser.id))
      .where(eq(comment.id, createdId))
      .limit(1);

    const row = rows[0];
    return {
      id: row.id,
      postId: row.postId,
      userId: row.isAnonymous ? '' : row.userId,
      user: mapUser({
        userId: row.userId,
        nickname: row.userNickname,
        avatarUrl: row.userAvatarUrl,
        role: row.userRole,
      }, row.isAnonymous),
      parentId: row.parentId ?? null,
      content: row.content,
      isAnonymous: row.isAnonymous,
      likeCount: row.likeCount,
      isLiked: false,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async likeComment(commentId: string): Promise<{ liked: boolean; likeCount: number }> {
    const updated = await this.db
      .update(comment)
      .set({ likeCount: sql`${comment.likeCount} + 1` })
      .where(eq(comment.id, commentId))
      .returning({ likeCount: comment.likeCount });

    if (updated.length === 0) {
      throw new NotFoundException('评论不存在');
    }

    return { liked: true, likeCount: updated[0].likeCount };
  }

  async deleteComment(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const rows = await this.db
      .select({ id: comment.id, userId: comment.userId, postId: comment.postId })
      .from(comment)
      .where(eq(comment.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException('评论不存在');
    }

    const commentRow = rows[0];
    if (commentRow.userId !== userId && !isAdmin) {
      throw new ForbiddenException('无权限删除该评论');
    }

    await this.db.transaction(async (tx) => {
      const updated = await tx
        .update(comment)
        .set({ status: 'deleted' })
        .where(eq(comment.id, id))
        .returning({ id: comment.id, postId: comment.postId });

      if (updated.length > 0) {
        await tx
          .update(post)
          .set({ commentCount: sql`${post.commentCount} - 1` })
          .where(eq(post.id, updated[0].postId));
      }
    });

    this.logger.log(`用户 ${userId} 删除评论 ${id}`);
  }
}
