import { Inject, Injectable, Logger, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@server/database/database.module';
import { eq, and, or, sql, count } from 'drizzle-orm';
import { friendship, appUser, notification } from '@server/database/schema-standalone';
import type { Friendship, User, Notification } from '@shared/api.interface';

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  private mapUser(row: typeof appUser.$inferSelect): User {
    return {
      id: row.id,
      phone: row.phone,
      nickname: row.nickname,
      avatarUrl: row.avatarUrl ?? null,
      bio: row.bio ?? '',
      role: (row.role as 'user' | 'admin') ?? 'user',
      status: row.status,
      lastNameChangeAt: row.lastNameChangeAt ? row.lastNameChangeAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapFriendship(
    row: typeof friendship.$inferSelect,
    friendUser: User,
  ): Friendship {
    return {
      id: row.id,
      userId: row.userId,
      friendId: row.friendId,
      friend: friendUser,
      status: row.status as 'pending' | 'accepted' | 'rejected',
      isBlocked: row.isBlocked,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapNotification(row: typeof notification.$inferSelect): Notification {
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      title: row.title,
      content: row.content,
      isRead: row.isRead,
      relatedId: row.relatedId ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async createNotification(
    userId: string,
    type: string,
    title: string,
    content: string,
    relatedId?: string,
  ): Promise<Notification> {
    const rows = relatedId
      ? await this.db
          .insert(notification)
          .values({ userId, type, title, content, relatedId })
          .returning()
      : await this.db
          .insert(notification)
          .values({ userId, type, title, content })
          .returning();
    return this.mapNotification(rows[0]);
  }

  async sendRequest(userId: string, friendId: string): Promise<Friendship> {
    if (userId === friendId) {
      throw new BadRequestException('不能添加自己为好友');
    }

    // 检查目标用户是否存在
    const targetUsers = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.id, friendId));
    if (targetUsers.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    // 检查是否已存在好友关系（任意方向）
    const existing = await this.db
      .select()
      .from(friendship)
      .where(
        or(
          and(eq(friendship.userId, userId), eq(friendship.friendId, friendId)),
          and(eq(friendship.userId, friendId), eq(friendship.friendId, userId)),
        ),
      );

    if (existing.length > 0) {
      throw new BadRequestException('好友关系已存在');
    }

    // 使用单向关系：user_id 是发起方，friend_id 是接收方，status = pending
    const inserted = await this.db
      .insert(friendship)
      .values({
        userId,
        friendId,
        status: 'pending',
      })
      .returning();

    // 给接收方发送通知
    const sender = await this.db.select().from(appUser).where(eq(appUser.id, userId));
    const senderName = sender[0]?.nickname ?? '有人';
    await this.createNotification(
      friendId,
      'friend_request',
      '新的好友请求',
      `${senderName} 向你发送了好友请求`,
      inserted[0].id,
    );

    this.logger.log(`用户 ${userId} 向 ${friendId} 发送了好友请求`);
    return this.mapFriendship(inserted[0], this.mapUser(targetUsers[0]));
  }

  async getFriends(
    userId: string,
    status: 'accepted' | 'pending' = 'accepted',
  ): Promise<{ items: Friendship[]; total: number }> {
    // accepted: 双向都 accepted 的好友
    // pending: 我收到的请求（friend_id = me AND status = pending）
    let rows: (typeof friendship.$inferSelect)[];
    let total = 0;

    if (status === 'accepted') {
      // 查找已接受的好友关系（任一方向 status=accepted 且对方是我的好友）
      // 单向设计下：我发起对方接受 或 对方发起我接受
      // 简化：查询所有 status=accepted 且涉及我的记录
      rows = await this.db
        .select()
        .from(friendship)
        .where(
          and(
            or(eq(friendship.userId, userId), eq(friendship.friendId, userId)),
            eq(friendship.status, 'accepted'),
          ),
        );
      const countResult = await this.db
        .select({ count: count() })
        .from(friendship)
        .where(
          and(
            or(eq(friendship.userId, userId), eq(friendship.friendId, userId)),
            eq(friendship.status, 'accepted'),
          ),
        );
      total = Number(countResult[0]?.count ?? 0);
    } else {
      // pending 状态：我收到的请求（friend_id = me AND status = pending）
      rows = await this.db
        .select()
        .from(friendship)
        .where(
          and(
            eq(friendship.friendId, userId),
            eq(friendship.status, 'pending'),
          ),
        )
        .orderBy(sql`${friendship.createdAt} DESC`);
      const countResult = await this.db
        .select({ count: count() })
        .from(friendship)
        .where(
          and(
            eq(friendship.friendId, userId),
            eq(friendship.status, 'pending'),
          ),
        );
      total = Number(countResult[0]?.count ?? 0);
    }

    // 收集好友用户ID（每条记录中不等于我的那个ID）
    const friendIds: string[] = rows.map((row: typeof friendship.$inferSelect) =>
      row.userId === userId ? row.friendId : row.userId,
    );

    const userRows = friendIds.length > 0
      ? await this.db.select().from(appUser).where(sql`${appUser.id} IN (${sql.join(friendIds.map((id: string) => sql`${id}`), sql`, `)})`)
      : [];
    const userMap = new Map<string, User>();
    for (const u of userRows) {
      userMap.set(u.id, this.mapUser(u));
    }

    const items: Friendship[] = rows.map((row: typeof friendship.$inferSelect) => {
      const friendUserId = row.userId === userId ? row.friendId : row.userId;
      const friendUser = userMap.get(friendUserId) ?? {
        id: friendUserId,
        phone: '',
        nickname: '未知用户',
        avatarUrl: null,
        bio: '',
        role: 'user' as const,
        status: 'active',
        lastNameChangeAt: null,
        createdAt: '',
      };
      // 归一化：friendId 始终是对方的 ID，userId 始终是我的
      return {
        id: row.id,
        userId,
        friendId: friendUserId,
        friend: friendUser,
        status: row.status as 'pending' | 'accepted' | 'rejected',
        isBlocked: row.isBlocked,
        createdAt: row.createdAt.toISOString(),
      };
    });

    return { items, total };
  }

  async acceptRequest(userId: string, friendshipId: string): Promise<Friendship> {
    const existing = await this.db
      .select()
      .from(friendship)
      .where(eq(friendship.id, friendshipId));

    if (existing.length === 0) {
      throw new NotFoundException('好友请求不存在');
    }

    const record = existing[0];
    if (record.friendId !== userId) {
      throw new ForbiddenException('无权操作此好友请求');
    }
    if (record.status !== 'pending') {
      throw new BadRequestException('该请求状态无法接受');
    }

    const updated = await this.db
      .update(friendship)
      .set({ status: 'accepted' })
      .where(eq(friendship.id, friendshipId))
      .returning();

    // 给发起方发送通知
    const receiver = await this.db.select().from(appUser).where(eq(appUser.id, userId));
    const receiverName = receiver[0]?.nickname ?? '对方';
    await this.createNotification(
      record.userId,
      'friend_accepted',
      '好友请求已通过',
      `${receiverName} 接受了你的好友请求`,
      friendshipId,
    );

    this.logger.log(`用户 ${userId} 接受了好友请求 ${friendshipId}`);

    const friendUser = await this.db.select().from(appUser).where(eq(appUser.id, record.userId));
    return {
      id: updated[0].id,
      userId,
      friendId: record.userId,
      friend: friendUser.length > 0 ? this.mapUser(friendUser[0]) : {
        id: record.userId, phone: '', nickname: '未知用户', avatarUrl: null,
        bio: '', role: 'user' as const, status: 'active', lastNameChangeAt: null, createdAt: '',
      },
      status: 'accepted',
      isBlocked: updated[0].isBlocked,
      createdAt: updated[0].createdAt.toISOString(),
    };
  }

  async rejectRequest(userId: string, friendshipId: string): Promise<Friendship> {
    const existing = await this.db
      .select()
      .from(friendship)
      .where(eq(friendship.id, friendshipId));

    if (existing.length === 0) {
      throw new NotFoundException('好友请求不存在');
    }

    const record = existing[0];
    if (record.friendId !== userId) {
      throw new ForbiddenException('无权操作此好友请求');
    }
    if (record.status !== 'pending') {
      throw new BadRequestException('该请求状态无法拒绝');
    }

    const updated = await this.db
      .update(friendship)
      .set({ status: 'rejected' })
      .where(eq(friendship.id, friendshipId))
      .returning();

    this.logger.log(`用户 ${userId} 拒绝了好友请求 ${friendshipId}`);

    const friendUser = await this.db.select().from(appUser).where(eq(appUser.id, record.userId));
    return {
      id: updated[0].id,
      userId,
      friendId: record.userId,
      friend: friendUser.length > 0 ? this.mapUser(friendUser[0]) : {
        id: record.userId, phone: '', nickname: '未知用户', avatarUrl: null,
        bio: '', role: 'user' as const, status: 'active', lastNameChangeAt: null, createdAt: '',
      },
      status: 'rejected',
      isBlocked: updated[0].isBlocked,
      createdAt: updated[0].createdAt.toISOString(),
    };
  }

  async blockFriend(userId: string, friendshipId: string): Promise<Friendship> {
    const record = await this.findFriendshipAndValidate(userId, friendshipId);

    const updated = await this.db
      .update(friendship)
      .set({ isBlocked: true })
      .where(eq(friendship.id, friendshipId))
      .returning();

    this.logger.log(`用户 ${userId} 拉黑了好友关系 ${friendshipId}`);

    const friendUserId = record.userId === userId ? record.friendId : record.userId;
    const friendUser = await this.db.select().from(appUser).where(eq(appUser.id, friendUserId));
    return {
      id: updated[0].id,
      userId,
      friendId: friendUserId,
      friend: friendUser.length > 0 ? this.mapUser(friendUser[0]) : {
        id: friendUserId, phone: '', nickname: '未知用户', avatarUrl: null,
        bio: '', role: 'user' as const, status: 'active', lastNameChangeAt: null, createdAt: '',
      },
      status: updated[0].status as 'pending' | 'accepted' | 'rejected',
      isBlocked: true,
      createdAt: updated[0].createdAt.toISOString(),
    };
  }

  async unblockFriend(userId: string, friendshipId: string): Promise<Friendship> {
    const record = await this.findFriendshipAndValidate(userId, friendshipId);

    const updated = await this.db
      .update(friendship)
      .set({ isBlocked: false })
      .where(eq(friendship.id, friendshipId))
      .returning();

    this.logger.log(`用户 ${userId} 解除拉黑好友关系 ${friendshipId}`);

    const friendUserId = record.userId === userId ? record.friendId : record.userId;
    const friendUser = await this.db.select().from(appUser).where(eq(appUser.id, friendUserId));
    return {
      id: updated[0].id,
      userId,
      friendId: friendUserId,
      friend: friendUser.length > 0 ? this.mapUser(friendUser[0]) : {
        id: friendUserId, phone: '', nickname: '未知用户', avatarUrl: null,
        bio: '', role: 'user' as const, status: 'active', lastNameChangeAt: null, createdAt: '',
      },
      status: updated[0].status as 'pending' | 'accepted' | 'rejected',
      isBlocked: false,
      createdAt: updated[0].createdAt.toISOString(),
    };
  }

  async deleteFriend(userId: string, friendshipId: string): Promise<void> {
    await this.findFriendshipAndValidate(userId, friendshipId);

    const deleted = await this.db
      .delete(friendship)
      .where(eq(friendship.id, friendshipId))
      .returning({ id: friendship.id });

    if (deleted.length === 0) {
      throw new NotFoundException('好友关系不存在');
    }

    this.logger.log(`用户 ${userId} 删除了好友关系 ${friendshipId}`);
  }

  private async findFriendshipAndValidate(
    userId: string,
    friendshipId: string,
  ): Promise<typeof friendship.$inferSelect> {
    const existing = await this.db
      .select()
      .from(friendship)
      .where(eq(friendship.id, friendshipId));

    if (existing.length === 0) {
      throw new NotFoundException('好友关系不存在');
    }

    const record = existing[0];
    if (record.userId !== userId && record.friendId !== userId) {
      throw new ForbiddenException('无权操作此好友关系');
    }

    return record;
  }

  // 检查两人是否是好友且未被拉黑（用于发送消息前校验）
  async checkCanMessage(userId: string, targetId: string): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(friendship)
      .where(
        and(
          or(
            and(eq(friendship.userId, userId), eq(friendship.friendId, targetId)),
            and(eq(friendship.userId, targetId), eq(friendship.friendId, userId)),
          ),
          eq(friendship.status, 'accepted'),
          eq(friendship.isBlocked, false),
        ),
      );
    return rows.length > 0;
  }
}
