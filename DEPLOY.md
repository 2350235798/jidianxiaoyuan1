# 机电校园 - Vercel + Supabase 部署指南

本指南将帮助你将「机电校园」全栈应用独立部署到 Vercel，完全剥离妙搭 / 飞书 / 豆包平台依赖。

## 部署前必读：文件替换

由于原项目是在妙搭平台上开发的，部分配置文件为平台保护状态。在上传代码到 GitHub 之前，**必须**先执行文件替换：

```bash
# 在项目根目录执行以下命令
cp deploy-files/package.json ./package.json
cp deploy-files/vite.config.ts ./vite.config.ts
cp deploy-files/tsconfig.json ./tsconfig.json
cp deploy-files/tsconfig.node.json ./tsconfig.node.json
cp deploy-files/tsconfig.app.json ./tsconfig.app.json
cp deploy-files/tailwind.config.ts ./tailwind.config.ts
cp deploy-files/nest-cli.json ./nest-cli.json
cp deploy-files/index.tsx ./client/src/index.tsx
cp deploy-files/gitignore ./.gitignore

# 删除平台相关代码
rm -rf client/src/components/business-ui
rm -rf server/modules/view
rm -rf server/modules/hello
rm -f server/main.ts
```

替换完成后验证：

```bash
npm install
npm run build
```

构建成功后再继续下面的步骤。

## 技术栈

- **前端**: React 19 + Vite + Tailwind CSS 4
- **后端**: NestJS 10 + Drizzle ORM
- **数据库**: PostgreSQL（推荐 Supabase）
- **文件存储**: Vercel Blob（可选，未配置时降级为 base64）
- **部署平台**: Vercel

## 目录

1. [准备工作](#准备工作)
2. [GitHub 仓库创建](#1-github-仓库创建)
3. [Supabase 数据库创建](#2-supabase-数据库创建)
4. [建表与初始数据](#3-建表与初始数据)
5. [Vercel 项目创建](#4-vercel-项目创建)
6. [环境变量配置](#5-环境变量配置)
7. [部署与测试](#6-部署与测试)
8. [管理员设置](#7-管理员设置)

## 准备工作

你需要准备以下账号：

- [GitHub](https://github.com) 账号（免费）
- [Vercel](https://vercel.com) 账号（免费 Hobby 计划即可）
- [Supabase](https://supabase.com) 账号（免费 Free 计划即可）

## 1. GitHub 仓库创建

1. 登录 GitHub，点击右上角 `New Repository`
2. 仓库名建议：`jidian-campus`
3. 选择 `Private` 或 `Public`
4. 勾选 `Add a README file`（可选）
5. 点击 `Create repository`
6. 将代码推送到该仓库：

```bash
# 如果你已有代码
git init
git add .
git commit -m "初始提交：机电校园全栈应用"
git branch -M main
git remote add origin https://github.com/你的用户名/jidian-campus.git
git push -u origin main
```

## 2. Supabase 数据库创建

1. 访问 [supabase.com](https://supabase.com) 并登录
2. 点击 `New Project`
3. 填写项目信息：
   - **Name**: `jidian-campus`
   - **Database Password**: 设置一个强密码（请记住，后面要用）
   - **Region**: 选择离你近的区域（推荐 `Southeast Asia (Singapore)`）
   - **Pricing Plan**: 选 Free
4. 点击 `Create new project`
5. 等待项目初始化完成（约 2 分钟）
6. 进入项目后，左侧菜单点击 `Settings` → `Database`
7. 找到 `Connection string` → `URI`，复制整个连接字符串
8. 将密码替换到连接字符串中，格式类似于：
   ```
   postgresql://postgres:你的密码@db.xxx.supabase.co:5432/postgres
   ```

## 3. 建表与初始数据

### 3.1 执行建表 SQL

1. 在 Supabase 后台，左侧菜单点击 `SQL Editor`
2. 点击 `New query`
3. 打开项目根目录下的 `sql/schema.sql` 文件
4. 将全部内容复制粘贴到 SQL Editor 中
5. 点击 `Run` 执行
6. 确认执行成功，无报错

### 3.2 验证表结构

执行以下 SQL 检查表是否创建成功：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

应该看到以下表：
- `app_user`
- `announcement`
- `chat_message`
- `comment`
- `friendship`
- `notification`
- `post`
- `post_like`
- `report`

## 4. Vercel 项目创建

### 4.1 导入 GitHub 仓库

1. 访问 [vercel.com](https://vercel.com) 并登录
2. 点击 `Add New...` → `Project`
3. 在 `Import Git Repository` 中找到你的 `jidian-campus` 仓库
4. 点击 `Import`

### 4.2 配置项目

1. **Project Name**: 默认即可，或修改为你喜欢的名字
2. **Framework Preset**: 选择 `Other`（因为是自定义 NestJS + Vite）
3. **Root Directory**: 保持根目录 `./`

### 4.3 配置 Build 和 Output Settings

在 Vercel 项目设置的 `General` 页面：

- **Build Command**: `npm run build:vercel`
- **Output Directory**: `dist/client`
- **Install Command**: 默认 `npm install` 即可

## 5. 环境变量配置

在 Vercel 项目的 `Settings` → `Environment Variables` 中添加以下变量：

| 变量名 | 必须 | 说明 | 示例值 |
|--------|------|------|--------|
| `DATABASE_URL` | ✅ | PostgreSQL 数据库连接串 | `postgresql://postgres:密码@db.xxx.supabase.co:5432/postgres` |
| `JWT_SECRET` | ✅ | JWT 签名密钥（随机字符串，越长越安全） | `your-super-secret-key-change-this-in-production` |
| `BLOB_READ_WRITE_TOKEN` | ⚠️ | Vercel Blob 存储 Token（不配置则图片/视频存本地） | `vercel_blob_rw_xxx` |
| `NODE_ENV` | ❌ | 运行环境 | `production` |

### 5.1 如何获取 BLOB_READ_WRITE_TOKEN（可选）

如果你需要支持图片/视频上传到云端：

1. 在 Vercel 项目页面，点击 `Storage` 标签
2. 点击 `Add Database` → 选择 `Blob`
3. 按提示完成创建
4. 创建完成后，环境变量 `BLOB_READ_WRITE_TOKEN` 会自动注入

> 注意：不配置 Blob 也能用，图片会以 base64 方式存储在数据库中（仅适合测试）

### 5.2 JWT_SECRET 生成建议

可以用以下方式生成一个安全的随机密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

或直接用一段随机字符串。

## 6. 部署与测试

### 6.1 触发部署

1. 环境变量配置完成后，点击 `Deploy`
2. 等待构建完成（首次约 3-5 分钟）
3. 部署成功后会自动跳转到项目 Dashboard
4. 点击 `Visit` 打开网站

### 6.2 常见部署问题排查

**问题：构建失败，提示找不到模块**

- 检查 `package.json` 中依赖是否完整
- 查看 Vercel 的构建日志，定位具体错误

**问题：部署后 API 返回 500**

- 检查 `DATABASE_URL` 是否正确
- 确认 Supabase 数据库表已创建
- 在 Vercel 项目的 `Logs` 中查看详细错误

**问题：静态页面 404**

- 检查 `vercel.json` 的 `outputDirectory` 是否为 `dist/client`
- 确认 `buildCommand` 执行成功

**问题：图片上传失败**

- 如果没配置 `BLOB_READ_WRITE_TOKEN`，上传会走 base64 降级
- 配置了 Blob 仍失败，检查 Token 是否正确

## 7. 管理员设置

### 7.1 创建管理员账户

1. 打开网站，先注册一个普通用户（使用手机号）
2. 进入 Supabase 的 SQL Editor，执行以下 SQL：

```sql
-- 将指定手机号的用户升级为管理员
UPDATE app_user 
SET role = 'admin' 
WHERE phone = '你的手机号';
```

3. 刷新页面，重新登录即可看到管理员入口

### 7.2 建议创建的 3 个管理员

按需求预留 3 个管理员账户：

| 序号 | 手机号 | 昵称 | 角色 | 密码 |
|------|--------|------|------|------|
| 1 | 13800000001 | 机电站长 | admin | JidianAdmin2024 |
| 2 | 13800000002 | 校园管理员 | admin | JidianAdmin2024 |
| 3 | 13800000003 | 审核员小明 | admin | JidianAdmin2024 |

设置方法：
1. 先用这些手机号分别注册账号（实际部署时请改成真实手机号）
2. 在 Supabase 中执行上面的 UPDATE 语句升级为管理员

## 8. 本地开发

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入 DATABASE_URL 和 JWT_SECRET

# 启动前后端开发服务器
npm run dev

# 前端访问：http://localhost:5173
# 后端访问：http://localhost:3000
```

## 9. 自定义域名（可选）

在 Vercel 项目设置的 `Domains` 中：
1. 输入你的域名
2. 按提示在域名服务商处配置 DNS 解析
3. 等待生效，Vercel 会自动配置 HTTPS

## 10. 更新与迭代

每次修改代码后 push 到 GitHub 的 main 分支，Vercel 会自动重新部署。

```bash
git add .
git commit -m "你的修改描述"
git push
```

---

如有问题，欢迎查阅：
- [Vercel 文档](https://vercel.com/docs)
- [Supabase 文档](https://supabase.com/docs)
- [NestJS 文档](https://docs.nestjs.com)
- [Drizzle ORM 文档](https://orm.drizzle.team)
