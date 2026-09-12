import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@server/database/database.module';
import { eq, and, count, desc } from 'drizzle-orm';
import { notification } from '@server/database/schema-standalone';
import type { Notification, NotificationListResponse, UnreadCountResponse } from '@shared/api.interface';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

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

  async getNotifications(
    userId: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<NotificationListResponse> {
    const offset = (page - 1) * pageSize;

    const rows = await this.db
      .select()
      .from(notification)
      .where(eq(notification.userId, userId))
      .orderBy(desc(notification.createdAt))
      .limit(pageSize)
      .offset(offset);

    const countResult = await this.db
      .select({ count: count() })
      .from(notification)
      .where(eq(notification.userId, userId));
    const total = Number(countResult[0]?.count ?? 0);

    return {
      items: rows.map((row: typeof notification.$inferSelect) => this.mapNotification(row)),
      total,
      page,
      pageSize,
    };
  }

  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const existing = await this.db
      .select()
      .from(notification)
      .where(
        and(
          eq(notification.id, notificationId),
          eq(notification.userId, userId),
        ),
      );

    if (existing.length === 0) {
      throw new NotFoundException('通知不存在');
    }

    const updated = await this.db
      .update(notification)
      .set({ isRead: true })
      .where(
        and(
          eq(notification.id, notificationId),
          eq(notification.userId, userId),
        ),
      )
      .returning();

    this.logger.log(`用户 ${userId} 标记通知 ${notificationId} 为已读`);
    return this.mapNotification(updated[0]);
  }

  async markAllAsRead(userId: string): Promise<{ updated: number }> {
    const updated = await this.db
      .update(notification)
      .set({ isRead: true })
      .where(
        and(
          eq(notification.userId, userId),
          eq(notification.isRead, false),
        ),
      )
      .returning({ id: notification.id });

    this.logger.log(`用户 ${userId} 标记所有通知为已读，共 ${updated.length} 条`);
    return { updated: updated.length };
  }

  async getUnreadCount(userId: string): Promise<UnreadCountResponse> {
    const result = await this.db
      .select({ count: count() })
      .from(notification)
      .where(
        and(
          eq(notification.userId, userId),
          eq(notification.isRead, false),
        ),
      );

    return { count: Number(result[0]?.count ?? 0) };
  }
}
