import { Inject, Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@server/database/database.module';
import { eq, and, or, sql, desc, asc, count, gt } from 'drizzle-orm';
import { chatMessage, appUser, friendship } from '@server/database/schema-standalone';
import type { ChatMessage, User, Conversation, MessageListResponse } from '@shared/api.interface';
import { FriendsService } from './friends.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly friendsService: FriendsService,
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

  private mapMessage(row: typeof chatMessage.$inferSelect): ChatMessage {
    return {
      id: row.id,
      senderId: row.senderId,
      receiverId: row.receiverId,
      content: row.content,
      isRead: row.isRead,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    // 找出我所有的好友（accepted 状态）
    const friendRows = await this.db
      .select()
      .from(friendship)
      .where(
        and(
          or(eq(friendship.userId, userId), eq(friendship.friendId, userId)),
          eq(friendship.status, 'accepted'),
        ),
      );

    if (friendRows.length === 0) {
      return [];
    }

    const friendIds: string[] = friendRows.map((row: typeof friendship.$inferSelect) =>
      row.userId === userId ? row.friendId : row.userId,
    );

    // 获取每个好友的用户信息
    const userRows = await this.db
      .select()
      .from(appUser)
      .where(sql`${appUser.id} IN (${sql.join(friendIds.map((id: string) => sql`${id}`), sql`, `)})`);
    const userMap = new Map<string, User>();
    for (const u of userRows) {
      userMap.set(u.id, this.mapUser(u));
    }

    // 对每个好友，获取最新一条消息和未读数
    const conversations: Conversation[] = [];

    for (const friendId of friendIds) {
      // 最新消息
      const lastMsgRows = await this.db
        .select()
        .from(chatMessage)
        .where(
          or(
            and(eq(chatMessage.senderId, userId), eq(chatMessage.receiverId, friendId)),
            and(eq(chatMessage.senderId, friendId), eq(chatMessage.receiverId, userId)),
          ),
        )
        .orderBy(desc(chatMessage.createdAt))
        .limit(1);

      // 未读数：对方发的，我未读的
      const unreadResult = await this.db
        .select({ count: count() })
        .from(chatMessage)
        .where(
          and(
            eq(chatMessage.senderId, friendId),
            eq(chatMessage.receiverId, userId),
            eq(chatMessage.isRead, false),
          ),
        );
      const unreadCount = Number(unreadResult[0]?.count ?? 0);

      const friendUser = userMap.get(friendId) ?? {
        id: friendId,
        phone: '',
        nickname: '未知用户',
        avatarUrl: null,
        bio: '',
        role: 'user' as const,
        status: 'active',
        lastNameChangeAt: null,
        createdAt: '',
      };

      conversations.push({
        friendId,
        friend: friendUser,
        lastMessage: lastMsgRows.length > 0 ? this.mapMessage(lastMsgRows[0]) : null,
        unreadCount,
      });
    }

    // 按最新消息时间倒序，没有消息的排后面
    conversations.sort((a: Conversation, b: Conversation) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return conversations;
  }

  async getMessages(
    userId: string,
    friendId: string,
    page: number = 1,
    pageSize: number = 50,
  ): Promise<MessageListResponse> {
    // 检查是否是好友
    const canMessage = await this.friendsService.checkCanMessage(userId, friendId);
    if (!canMessage) {
      throw new BadRequestException('对方不是你的好友，无法查看聊天记录');
    }

    const offset = (page - 1) * pageSize;

    const rows = await this.db
      .select()
      .from(chatMessage)
      .where(
        or(
          and(eq(chatMessage.senderId, userId), eq(chatMessage.receiverId, friendId)),
          and(eq(chatMessage.senderId, friendId), eq(chatMessage.receiverId, userId)),
        ),
      )
      .orderBy(asc(chatMessage.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countResult = await this.db
      .select({ count: count() })
      .from(chatMessage)
      .where(
        or(
          and(eq(chatMessage.senderId, userId), eq(chatMessage.receiverId, friendId)),
          and(eq(chatMessage.senderId, friendId), eq(chatMessage.receiverId, userId)),
        ),
      );
    const total = Number(countResult[0]?.count ?? 0);

    // 如果是对方发来的消息，标记为已读
    const unreadIds: string[] = rows
      .filter((row: typeof chatMessage.$inferSelect) =>
        row.senderId === friendId && row.receiverId === userId && !row.isRead,
      )
      .map((row: typeof chatMessage.$inferSelect) => row.id);

    if (unreadIds.length > 0) {
      await this.db
        .update(chatMessage)
        .set({ isRead: true })
        .where(sql`${chatMessage.id} IN (${sql.join(unreadIds.map((id: string) => sql`${id}`), sql`, `)})`);

      // 更新内存中的 isRead 状态
      for (const row of rows) {
        if (unreadIds.includes(row.id)) {
          row.isRead = true;
        }
      }
    }

    return {
      items: rows.map((row: typeof chatMessage.$inferSelect) => this.mapMessage(row)),
      total,
      page,
      pageSize,
    };
  }

  async sendMessage(
    userId: string,
    receiverId: string,
    content: string,
  ): Promise<ChatMessage> {
    if (userId === receiverId) {
      throw new BadRequestException('不能给自己发消息');
    }

    // 检查目标用户是否存在
    const receiverRows = await this.db
      .select()
      .from(appUser)
      .where(eq(appUser.id, receiverId));
    if (receiverRows.length === 0) {
      throw new NotFoundException('接收方用户不存在');
    }

    // 检查是否是好友且未被拉黑
    const canMessage = await this.friendsService.checkCanMessage(userId, receiverId);
    if (!canMessage) {
      throw new BadRequestException('对方不是你的好友或已被拉黑，无法发送消息');
    }

    const inserted = await this.db
      .insert(chatMessage)
      .values({
        senderId: userId,
        receiverId,
        content,
      })
      .returning();

    // 给接收方发送新消息通知
    const senderRows = await this.db.select().from(appUser).where(eq(appUser.id, userId));
    const senderName = senderRows[0]?.nickname ?? '有人';
    const previewContent = content.length > 50 ? content.slice(0, 50) + '...' : content;
    await this.friendsService.createNotification(
      receiverId,
      'chat_message',
      `新消息 - ${senderName}`,
      previewContent,
      inserted[0].id,
    );

    this.logger.log(`用户 ${userId} 向 ${receiverId} 发送了消息`);
    return this.mapMessage(inserted[0]);
  }
}
