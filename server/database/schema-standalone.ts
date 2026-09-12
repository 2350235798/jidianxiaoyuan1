/* eslint-disable */
/**
 * 独立部署版本的数据库 Schema
 * 从 platform schema 迁移而来，移除了 user_profile / file_attachment 等平台特有 custom type
 */
import { sql } from 'drizzle-orm';
import { boolean, foreignKey, index, integer, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const notification = pgTable("notification", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  title: varchar("title", { length: 100 }).notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  relatedId: uuid("related_id"),
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("_created_by"),
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("_updated_by"),
}, (table) => [
  index("idx_notification_user_id").on(table.userId, table.isRead),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [appUser.id],
    name: "notification_user_id_fkey",
  }).onDelete("cascade"),
]);

export const announcement = pgTable("announcement", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 100 }).notNull(),
  content: text("content").notNull(),
  adminId: uuid("admin_id").notNull(),
  expireAt: customTimestamptz("expire_at", { precision: 6 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("_created_by"),
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("_updated_by"),
}, (table) => [
  foreignKey({
    columns: [table.adminId],
    foreignColumns: [appUser.id],
    name: "announcement_admin_id_fkey",
  }).onDelete("cascade"),
]);

export const report = pgTable("report", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterId: uuid("reporter_id").notNull(),
  targetType: varchar("target_type", { length: 20 }).notNull(),
  targetId: uuid("target_id").notNull(),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  adminNote: text("admin_note"),
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("_created_by"),
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("_updated_by"),
}, (table) => [
  foreignKey({
    columns: [table.reporterId],
    foreignColumns: [appUser.id],
    name: "report_reporter_id_fkey",
  }).onDelete("cascade"),
]);

export const chatMessage = pgTable("chat_message", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").notNull(),
  receiverId: uuid("receiver_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("_created_by"),
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("_updated_by"),
}, (table) => [
  index("idx_chat_sender_receiver").on(table.senderId, table.receiverId),
  index("idx_chat_receiver_sender").on(table.receiverId, table.senderId),
  foreignKey({
    columns: [table.senderId],
    foreignColumns: [appUser.id],
    name: "chat_message_sender_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.receiverId],
    foreignColumns: [appUser.id],
    name: "chat_message_receiver_id_fkey",
  }).onDelete("cascade"),
]);

export const friendship = pgTable("friendship", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  friendId: uuid("friend_id").notNull(),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  isBlocked: boolean("is_blocked").notNull().default(false),
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("_created_by"),
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("_updated_by"),
}, (table) => [
  uniqueIndex("friendship_user_id_friend_id_key").on(table.userId, table.friendId),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [appUser.id],
    name: "friendship_user_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.friendId],
    foreignColumns: [appUser.id],
    name: "friendship_friend_id_fkey",
  }).onDelete("cascade"),
]);

export const postLike = pgTable("post_like", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull(),
  userId: uuid("user_id").notNull(),
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("_created_by"),
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("_updated_by"),
}, (table) => [
  uniqueIndex("post_like_post_id_user_id_key").on(table.postId, table.userId),
  index("idx_post_like_post_id").on(table.postId),
  index("idx_post_like_user_id").on(table.userId),
  foreignKey({
    columns: [table.postId],
    foreignColumns: [post.id],
    name: "post_like_post_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [appUser.id],
    name: "post_like_user_id_fkey",
  }).onDelete("cascade"),
]);

export const comment = pgTable("comment", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull(),
  userId: uuid("user_id").notNull(),
  parentId: uuid("parent_id"),
  content: text("content").notNull(),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  likeCount: integer("like_count").notNull().default(0),
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("_created_by"),
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("_updated_by"),
}, (table) => [
  index("idx_comment_post_id").on(table.postId),
  index("idx_comment_parent_id").on(table.parentId),
  index("idx_comment_user_id").on(table.userId),
  foreignKey({
    columns: [table.postId],
    foreignColumns: [post.id],
    name: "comment_post_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [appUser.id],
    name: "comment_user_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.parentId],
    foreignColumns: [comment.id],
    name: "comment_parent_id_fkey",
  }).onDelete("cascade"),
]);

export const post = pgTable("post", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  content: text("content").notNull(),
  images: text("images").array().default([]),
  videoUrl: text("video_url"),
  videoDuration: integer("video_duration"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  status: varchar("status", { length: 20 }).notNull().default('pending'),
  auditStatus: varchar("audit_status", { length: 20 }).notNull().default('pending'),
  auditNote: text("audit_note"),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  shareCount: integer("share_count").notNull().default(0),
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("_created_by"),
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("_updated_by"),
}, (table) => [
  index("idx_post_user_id").on(table.userId),
  index("idx_post_status_created").on(table.status, table.createdAt),
  index("idx_post_is_pinned").on(table.isPinned),
  foreignKey({
    columns: [table.userId],
    foreignColumns: [appUser.id],
    name: "post_user_id_fkey",
  }).onDelete("cascade"),
]);

export const appUser = pgTable("app_user", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  nickname: varchar("nickname", { length: 50 }).notNull(),
  avatarUrl: text("avatar_url"),
  bio: varchar("bio", { length: 200 }),
  role: varchar("role", { length: 20 }).notNull().default('user'),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  lastNameChangeAt: customTimestamptz("last_name_change_at", { precision: 6 }),
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("_created_by"),
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("_updated_by"),
}, (table) => [
  uniqueIndex("app_user_phone_key").on(table.phone),
]);

// table aliases
export const announcementTable = announcement;
export const appUserTable = appUser;
export const chatMessageTable = chatMessage;
export const commentTable = comment;
export const friendshipTable = friendship;
export const notificationTable = notification;
export const postTable = post;
export const postLikeTable = postLike;
export const reportTable = report;
