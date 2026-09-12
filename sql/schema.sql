-- ============================================
-- 机电校园 - 完整数据库建表脚本
-- 数据库：PostgreSQL 15+
-- ============================================

-- 扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. 用户表
-- ============================================
CREATE TABLE IF NOT EXISTS app_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname VARCHAR(50) NOT NULL,
  avatar_url TEXT,
  bio VARCHAR(200),
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  last_name_change_at TIMESTAMPTZ,
  _created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by TEXT,
  _updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS app_user_phone_key ON app_user(phone);
CREATE INDEX IF NOT EXISTS idx_app_user_status ON app_user(status);
CREATE INDEX IF NOT EXISTS idx_app_user_role ON app_user(role);

-- ============================================
-- 2. 帖子表
-- ============================================
CREATE TABLE IF NOT EXISTS post (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  video_url TEXT,
  video_duration INTEGER,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  audit_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  audit_note TEXT,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  share_count INTEGER NOT NULL DEFAULT 0,
  _created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by TEXT,
  _updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_post_user_id ON post(user_id);
CREATE INDEX IF NOT EXISTS idx_post_status_created ON post(status, _created_at);
CREATE INDEX IF NOT EXISTS idx_post_is_pinned ON post(is_pinned);
CREATE INDEX IF NOT EXISTS idx_post_audit_status ON post(audit_status);

-- ============================================
-- 3. 评论表
-- ============================================
CREATE TABLE IF NOT EXISTS comment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES post(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comment(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  like_count INTEGER NOT NULL DEFAULT 0,
  _created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by TEXT,
  _updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_comment_post_id ON comment(post_id);
CREATE INDEX IF NOT EXISTS idx_comment_parent_id ON comment(parent_id);
CREATE INDEX IF NOT EXISTS idx_comment_user_id ON comment(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_status ON comment(status);

-- ============================================
-- 4. 点赞表
-- ============================================
CREATE TABLE IF NOT EXISTS post_like (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES post(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  _created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by TEXT,
  _updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS post_like_post_id_user_id_key ON post_like(post_id, user_id);
CREATE INDEX IF NOT EXISTS idx_post_like_post_id ON post_like(post_id);
CREATE INDEX IF NOT EXISTS idx_post_like_user_id ON post_like(user_id);

-- ============================================
-- 5. 好友关系表
-- ============================================
CREATE TABLE IF NOT EXISTS friendship (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  _created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by TEXT,
  _updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS friendship_user_id_friend_id_key ON friendship(user_id, friend_id);
CREATE INDEX IF NOT EXISTS idx_friendship_status ON friendship(status);

-- ============================================
-- 6. 私信表
-- ============================================
CREATE TABLE IF NOT EXISTS chat_message (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  _created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by TEXT,
  _updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_chat_sender_receiver ON chat_message(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_receiver_sender ON chat_message(receiver_id, sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_is_read ON chat_message(is_read);

-- ============================================
-- 7. 举报表
-- ============================================
CREATE TABLE IF NOT EXISTS report (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  _created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by TEXT,
  _updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_report_status ON report(status);
CREATE INDEX IF NOT EXISTS idx_report_target ON report(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_report_reporter_id ON report(reporter_id);

-- ============================================
-- 8. 公告表
-- ============================================
CREATE TABLE IF NOT EXISTS announcement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  expire_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  _created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by TEXT,
  _updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_announcement_is_active ON announcement(is_active);
CREATE INDEX IF NOT EXISTS idx_announcement_created_at ON announcement(_created_at);

-- ============================================
-- 9. 通知表
-- ============================================
CREATE TABLE IF NOT EXISTS notification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  related_id UUID,
  _created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _created_by TEXT,
  _updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  _updated_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification(user_id, is_read);

-- ============================================
-- 初始管理员数据
-- 密码均为：JidianAdmin2024
-- 密码哈希格式：salt:scrypt_hex（salt为16字节hex，keylen为64）
-- ============================================

-- 注意：以下密码哈希是基于 JidianAdmin2024 通过 scrypt 生成的
-- salt 为 16 字节随机 hex，keylen=64
-- 你可以在 Node.js 中使用以下代码生成自己的哈希：
-- const { scryptSync, randomBytes } = require('crypto');
-- const salt = randomBytes(16).toString('hex');
-- const hash = scryptSync('JidianAdmin2024', salt, 64).toString('hex');
-- console.log(`${salt}:${hash}`);

-- 为了确保你能成功登录，建议你注册后手动修改角色为 admin：
-- UPDATE app_user SET role = 'admin' WHERE phone = '你的手机号';

-- 以下提供 3 个预设管理员账户（密码均为 JidianAdmin2024）
-- 如果你使用的是 Postgres，且 Node.js scrypt 参数为 N=16384, r=8, p=1
-- 请使用下面的 INSERT 语句（注意：哈希值需要你自己生成确保匹配）

-- 这里提供一个更简单的方法：先正常注册一个用户，再执行以下 SQL 升级为管理员：
-- UPDATE app_user SET role = 'admin' WHERE phone = '13800000001';

-- 示例初始数据（可选）
-- 请先运行应用注册用户后再手动设置管理员角色

-- ============================================
-- 示例帖子数据（可选，用于初始展示）
-- ============================================

-- 你可以在应用注册账号后，通过前端发布帖子，或者使用以下 SQL 插入示例数据
-- 注意：需要先有真实用户 ID，将下面的 user_id 替换为实际用户 ID

-- INSERT INTO post (user_id, content, status, audit_status)
-- VALUES
--   ('你的用户ID', '欢迎来到机电校园！这是一个校园社交平台。', 'active', 'approved'),
--   ('你的用户ID', '大家好，很高兴加入这个大家庭～', 'active', 'approved');

-- ============================================
-- 示例公告数据
-- ============================================
-- INSERT INTO announcement (title, content, admin_id, is_active)
-- VALUES
--   ('欢迎使用机电校园', '这是机电校园社交平台，支持发帖、评论、点赞、好友等功能。', '你的管理员ID', TRUE);
